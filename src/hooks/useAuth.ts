/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook de autenticación. Único punto que gestiona token, usuario
 * y operaciones de login/logout. El control de acceso por rol
 * vive en useRouting.
 *
 * ── Seguridad de sesión ──────────────────────────────────────────────
 * - Al montar con token almacenado, valida contra backend (GET /api/user)
 *   antes de permitir acceso. Si el token expiró o fue revocado,
 *   limpia localStorage y redirige al login.
 * - Inactividad detectada por tiempo real (Date.now()), no por setTimeout
 *   que el navegador congela al dormir el PC o suspender el tab.
 * - visibilitychange detecta retorno inmediato al tab después de suspensión.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { apiFetch, setTokenRefreshHandler } from "../services/api";

const STORAGE_TOKEN = "ivoo_auth_token";
const STORAGE_USER = "ivoo_auth_user";
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
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem(STORAGE_TOKEN) ?? "");
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
  // Se inicializa en true solo si hay token guardado.
  // Mientras sea true, App.tsx muestra pantalla de carga en vez del layout.
  const [isValidatingSession, setIsValidatingSession] = useState<boolean>(() => {
    return !!localStorage.getItem(STORAGE_TOKEN);
  });

  // ── Limpieza de sesión (extraída para reuso) ──
  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    setAuthToken("");
    setAuthUser(null);
  }, []);

  // ── Validación de sesión al montar ──
  // Llama a GET /api/user para confirmar que el token sigue siendo
  // válido en el backend. Si falla (expirado, revocado, usuario inactivo),
  // se limpia la sesión inmediatamente.
  useEffect(() => {
    if (!authToken) {
      setIsValidatingSession(false);
      return;
    }

    let cancelled = false;

    apiFetch<{ user: { name: string; email: string; role?: string } }>("/user", {
      method: "GET",
      token: authToken,
    })
      .then((data) => {
        if (cancelled) return;
        // Token válido: refrescar datos de usuario desde backend
        const safeUser = {
          name: String(data.user.name ?? ""),
          email: String(data.user.email ?? ""),
          role: data.user.role ? String(data.user.role) : undefined,
        };
        localStorage.setItem(STORAGE_USER, JSON.stringify(safeUser));
        setAuthUser(safeUser);
        setIsValidatingSession(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Token inválido/expirado: limpiar todo
        clearSession();
        setIsValidatingSession(false);
      });

    return () => {
      cancelled = true;
    };
    // Solo al montar — si después cambia authToken por login,
    // no necesitamos re-validar; el backend ya devolvió token nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Token refresh handler (registrado una vez) ──
  useEffect(() => {
    setTokenRefreshHandler((newToken: string) => {
      localStorage.setItem(STORAGE_TOKEN, newToken);
      setAuthToken(newToken);
    });
  }, []);

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

    const data = await apiFetch<{ token: string; user: { name: string; email: string; role?: string } }>("/login", {
      method: "POST",
      body: JSON.stringify({
        email: sanitizedEmail,
        password,
        device_name: "web",
      }),
    });

    const safeUser = {
      name: String(data.user.name ?? ""),
      email: String(data.user.email ?? ""),
      role: data.user.role ? String(data.user.role) : undefined,
    };

    localStorage.setItem(STORAGE_TOKEN, data.token);
    localStorage.setItem(STORAGE_USER, JSON.stringify(safeUser));
    setAuthToken(data.token);
    setAuthUser(safeUser);
    lastActivityRef.current = Date.now();
  }, []);

  // ── Logout ──
  const handleLogout = useCallback(async () => {
    if (authToken) {
      await apiFetch("/logout", { method: "POST", token: authToken }).catch(() => null);
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
