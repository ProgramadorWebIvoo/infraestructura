/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook de autenticación. Único punto que gestiona token, usuario
 * y operaciones de login/logout. El control de acceso por rol
 * vive en useRouting.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { apiFetch, setTokenRefreshHandler } from "../services/api";

const STORAGE_TOKEN = "ivoo_auth_token";
const STORAGE_USER = "ivoo_auth_user";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos de inactividad

export type AuthUser = { name: string; email: string; role?: string } | null;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida formato de email y retorna mensaje de error si es inválido.
 * La validación real debe hacerse en backend; esto es defensivo en cliente.
 */
function validateEmail(email: string): string | null {
  if (!email.trim()) return "Ingrese su correo electrónico.";
  if (!EMAIL_REGEX.test(email.trim())) return "El formato del correo no es válido.";
  if (email.trim().length > 254) return "El correo es demasiado largo.";
  return null;
}

/**
 * Valida que la contraseña no esté vacía.
 */
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

  // Registrar handler para renovación silenciosa de token via X-Refresh-Token
  useEffect(() => {
    setTokenRefreshHandler((newToken: string) => {
      localStorage.setItem(STORAGE_TOKEN, newToken);
      setAuthToken(newToken);
    });
  }, []);

  // ── Session timeout por inactividad ──
  const lastActivityRef = useRef(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSessionTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetSessionTimeout = useCallback(() => {
    clearSessionTimeout();
    if (!authToken) return;
    lastActivityRef.current = Date.now();
    timeoutRef.current = setTimeout(() => {
      // Cerrar sesión por inactividad
      localStorage.removeItem(STORAGE_TOKEN);
      localStorage.removeItem(STORAGE_USER);
      setAuthToken("");
      setAuthUser(null);
      window.location.reload(); // Forzar recarga completa para resetear estado
    }, SESSION_TIMEOUT_MS);
  }, [authToken, clearSessionTimeout]);

  useEffect(() => {
    if (!authToken) {
      clearSessionTimeout();
      return;
    }

    const events = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"] as const;
    const onActivity = () => resetSessionTimeout();

    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    resetSessionTimeout();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      clearSessionTimeout();
    };
  }, [authToken, resetSessionTimeout, clearSessionTimeout]);

  const handleLogin = useCallback(async (email: string, password: string) => {
    // Sanitización antes de enviar
    const sanitizedEmail = email.trim().toLowerCase();

    // Validación client-side defensiva
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

    // Sanitizar datos del usuario antes de almacenar
    const safeUser = {
      name: String(data.user.name ?? ""),
      email: String(data.user.email ?? ""),
      role: data.user.role ? String(data.user.role) : undefined,
    };

    localStorage.setItem(STORAGE_TOKEN, data.token);
    localStorage.setItem(STORAGE_USER, JSON.stringify(safeUser));
    setAuthToken(data.token);
    setAuthUser(safeUser);
  }, []);

  const handleLogout = useCallback(async () => {
    if (authToken) {
      await apiFetch("/logout", { method: "POST", token: authToken }).catch(() => null);
    }

    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    setAuthToken("");
    setAuthUser(null);
  }, [authToken]);

  return {
    authToken,
    authUser,
    handleLogin,
    handleLogout,
  };
}
