/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook de autenticación. Único punto que gestiona token, usuario,
 * control de acceso por rol y constantes de ruteo.
 */

import { useState, useCallback } from "react";
import { apiFetch } from "../services/api";

// ---------------------------------------------------------------------------
// Constantes de ruteo
// ---------------------------------------------------------------------------

export const roleAccess: Record<string, string[]> = {
  SUPERADMIN:     ["/presidencia", "/infraestructura", "/cierre-obra", "/procura", "/analistas", "/finanzas", "/catalogos", "/usuarios"],
  ADMIN:          ["/presidencia", "/infraestructura", "/cierre-obra", "/procura", "/analistas", "/finanzas", "/catalogos", "/usuarios"],
  PRESIDENCIA:    ["/presidencia", "/catalogos"],
  INFRAESTRUCTURA:["/presidencia", "/infraestructura"],
  CIERRE_DE_OBRA: ["/presidencia", "/cierre-obra"],
  PROCURA:        ["/presidencia", "/procura", "/catalogos"],
  ANALISTA:       ["/presidencia", "/analistas"],
  FINANZAS:       ["/presidencia", "/finanzas"],
  CATALOGOS:      ["/presidencia", "/catalogos"],
};

export const publicRoutes = new Set(["/registro-proveedores"]);
export const isPublicPath = (path: string) =>
  publicRoutes.has(path) || path.startsWith("/propuesta-materiales/");

export type AuthUser = { name: string; email: string; role?: string } | null;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("ivoo_auth_token") ?? "");
  const [authUser, setAuthUser] = useState<AuthUser>(() => {
    const saved = localStorage.getItem("ivoo_auth_user");
    return saved ? JSON.parse(saved) : null;
  });

  const activeRole = authUser?.role ?? "PRESIDENCIA";

  const canAccess = useCallback(
    (path: string) => {
      const role = authUser?.role ?? "PRESIDENCIA";
      return (roleAccess[role] ?? roleAccess["PRESIDENCIA"]).includes(path);
    },
    [authUser],
  );

  const firstAllowedRoute = useCallback(
    (role: string) => roleAccess[role]?.[0] ?? "/presidencia",
    [],
  );

  const handleLogin = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ token: string; user: { name: string; email: string; role?: string } }>("/login", {
      method: "POST",
      body: JSON.stringify({ email, password, device_name: "web" }),
    });

    localStorage.setItem("ivoo_auth_token", data.token);
    localStorage.setItem("ivoo_auth_user", JSON.stringify(data.user));
    setAuthToken(data.token);
    setAuthUser(data.user);
  }, []);

  /** Solo limpia estado de auth. El caller debe resetear datos de la app. */
  const handleLogout = useCallback(async () => {
    if (authToken) {
      await apiFetch("/logout", { method: "POST", token: authToken }).catch(() => null);
    }

    localStorage.removeItem("ivoo_auth_token");
    localStorage.removeItem("ivoo_auth_user");
    setAuthToken("");
    setAuthUser(null);
  }, [authToken]);

  return {
    authToken,
    authUser,
    activeRole,
    canAccess,
    firstAllowedRoute,
    handleLogin,
    handleLogout,
  };
}
