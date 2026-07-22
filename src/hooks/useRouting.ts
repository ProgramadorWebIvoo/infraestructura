/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Control de acceso por rol. Las definiciones de rutas (paths, guard,
 * detección de rutas públicas) viven en src/routes.tsx.
 * Separado de useAuth para respetar SRP.
 */

export const roleAccess: Record<string, string[]> = {
  SUPERADMIN:     ["/presidencia", "/infraestructura", "/cierre-obra", "/procura", "/analistas", "/finanzas", "/catalogos", "/usuarios", "/config-proveedores", "/config-materiales", "/config-ia"],
  ADMIN:          ["/presidencia", "/infraestructura", "/cierre-obra", "/procura", "/analistas", "/finanzas", "/catalogos", "/usuarios", "/config-proveedores", "/config-materiales", "/config-ia"],
  PRESIDENCIA:    ["/presidencia", "/catalogos"],
  INFRAESTRUCTURA:["/presidencia", "/infraestructura"],
  CIERRE_DE_OBRA: ["/presidencia", "/cierre-obra"],
  PROCURA:        ["/presidencia", "/procura", "/catalogos"],
  ANALISTA:       ["/presidencia", "/analistas"],
  FINANZAS:       ["/presidencia", "/finanzas"],
  CATALOGOS:      ["/presidencia", "/catalogos"],
};

export function useRoleAccess(role: string | undefined) {
  const activeRole = role; // sin fallback — si no hay rol, canAccess es false

  const canAccess = (path: string) => {
    if (!activeRole) return false;
    return (roleAccess[activeRole] ?? roleAccess["INFRAESTRUCTURA"]).includes(path);
  };

  const firstAllowedRoute = (r: string | undefined): string | null => {
    if (!r) return null;
    return roleAccess[r]?.[0] ?? null;
  };

  return { activeRole, canAccess, firstAllowedRoute };
}
