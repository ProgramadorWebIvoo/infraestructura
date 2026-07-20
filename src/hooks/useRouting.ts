/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Control de acceso por rol y rutas públicas.
 * Separado de useAuth para respetar SRP.
 */

import { useCallback } from "react";

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

export const isPublicPath = (path: string): boolean =>
  publicRoutes.has(path) || path.startsWith("/propuesta-materiales/");

export function useRoleAccess(role: string | undefined) {
  const activeRole = role ?? "PRESIDENCIA";

  const canAccess = useCallback(
    (path: string) => (roleAccess[activeRole] ?? roleAccess["PRESIDENCIA"]).includes(path),
    [activeRole],
  );

  const firstAllowedRoute = useCallback(
    (r: string) => roleAccess[r]?.[0] ?? "/presidencia",
    [],
  );

  return { activeRole, canAccess, firstAllowedRoute };
}
