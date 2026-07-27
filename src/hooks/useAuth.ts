/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook de autenticación. Único punto que gestiona sesión, usuario
 * y operaciones de login/logout. El control de acceso por rol
 * vive en useRouting.
 *
 * ── Seguridad de sesión ──────────────────────────────────────────────
 * - El token de sesión vive en una cookie httpOnly (Sanctum SPA) que este
 *   hook nunca lee ni escribe: es inaccesible a JS, inmune a robo por XSS.
 *   `authToken` es solo un sentinel en memoria ("authenticated") para que
 *   los hooks de datos existentes puedan seguir usando `if (!authToken)`.
 * - Al montar, siempre se valida contra backend (GET /api/user) porque no
 *   hay forma de saber desde JS si la cookie httpOnly sigue vigente.
 * - Inactividad detectada por tiempo real (Date.now()), no por setTimeout
 *   que el navegador congela al dormir el PC o suspender el tab.
 * - visibilitychange detecta retorno inmediato al tab después de suspensión.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { apiFetch } from "../services/api";

const STORAGE_USER = "ivoo_auth_user";
const AUTHENTICATED_SENTINEL = "authenticated";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos de inactividad
const INACTIVITY_CHECK_MS = 15_000; // cada 15s verificar tiempo real transcurrido

export type AuthUser = { name: string; email: string; role?: string } | null;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Ingrese su correo electrónico.";
  if (!EMAIL_REGEX.test(email.trim())) return "El formato del correo no es válido.";
  if (email.trim().length > 254) return "El correo es demasiado largo.";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "Ingrese su clave.";
  return null;
}

export function useAuth() {
  const [authToken, setAuthToken] = useState<string>("");
  const [authUser, setAuthUser] = useState<AuthUser>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem(STORAGE_USER);
      return null;
    }
  });

  // ── Flag de validación al montar ──
  // Siempre empieza en true: la cookie httpOnly de sesión no es legible
  // desde JS, así que la única forma de saber si hay sesión vigente es
  // preguntarle al backend. Mientras sea true, App.tsx muestra pantalla
  // de carga en vez del layout.
  const [isValidatingSession, setIsValidatingSession] = useState<boolean>(true);

  // ── Limpieza de sesión (extraída para reuso) ──
  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_USER);
    setAuthToken("");
    setAuthUser(null);
  }, []);

  // ── Validación de sesión al montar ──
  // Llama a GET /api/user; el navegador adjunta la cookie de sesión sola.
  // Si falla (sin sesión, expirada, usuario inactivo), no hay nada que
  // limpiar del lado del cliente más que el estado en memoria.
  useEffect(() => {
    let cancelled = false;

    apiFetch<{ user: { name: string; email: string; role?: string } }>("/user", {
      method: "GET",
    })
      .then((data) => {
        if (cancelled) return;
        const safeUser = {
          name: String(data.user.name ?? ""),
          email: String(data.user.email ?? ""),
          role: data.user.role ? String(data.user.role) : undefined,
        };
        localStorage.setItem(STORAGE_USER, JSON.stringify(safeUser));
        setAuthUser(safeUser);
        setAuthToken(AUTHENTICATED_SENTINEL);
        setIsValidatingSession(false);
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
        setIsValidatingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  // ── Inactivity timeout por tiempo real ──
  // Usa setInterval + comparación Date.now() en vez de setTimeout
  // para que funcione correctamente aunque el PC duerma o el navegador
  // suspenda el tab (los timers JS se congelan, Date.now() no).
  const lastActivityRef = useRef(Date.now());

  const checkInactivity = useCallback(() => {
    if (!authToken) return;
    const elapsed = Date.now() - lastActivityRef.current;
    if (elapsed >= SESSION_TIMEOUT_MS) {
      clearSession();
      window.location.reload();
    }
  }, [authToken, clearSession]);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    // Actividad del usuario → actualizar timestamp
    const events = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"] as const;
    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };

    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

    // Chequeo periódico de inactividad (cada 15s)
    const intervalId = setInterval(checkInactivity, INACTIVITY_CHECK_MS);

    // Al volver al tab (después de suspensión), chequear inmediatamente
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkInactivity();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [authToken, checkInactivity]);

  // ── Login ──
  const handleLogin = useCallback(async (email: string, password: string) => {
    const sanitizedEmail = email.trim().toLowerCase();

    const emailError = validateEmail(sanitizedEmail);
    if (emailError) throw new Error(emailError);

    const passwordError = validatePassword(password);
    if (passwordError) throw new Error(passwordError);

    // Sin device_name: el backend detecta por Referer/Origin que esta
    // petición viene del SPA (dominio "stateful") y responde con cookie
    // de sesión httpOnly en vez de un token Bearer.
    const data = await apiFetch<{ user: { name: string; email: string; role?: string } }>("/login", {
      method: "POST",
      body: JSON.stringify({
        email: sanitizedEmail,
        password,
      }),
    });

    const safeUser = {
      name: String(data.user.name ?? ""),
      email: String(data.user.email ?? ""),
      role: data.user.role ? String(data.user.role) : undefined,
    };

    localStorage.setItem(STORAGE_USER, JSON.stringify(safeUser));
    setAuthToken(AUTHENTICATED_SENTINEL);
    setAuthUser(safeUser);
    lastActivityRef.current = Date.now();
  }, []);

  // ── Logout ──
  const handleLogout = useCallback(async () => {
    if (authToken) {
      await apiFetch("/logout", { method: "POST" }).catch(() => null);
    }
    clearSession();
  }, [authToken, clearSession]);

  return {
    authToken,
    authUser,
    isValidatingSession,
    handleLogin,
    handleLogout,
  };
}
