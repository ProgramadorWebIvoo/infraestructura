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
  ADMIN:          ["/infraestructura", "/cierre-obra", "/procura", "/analistas", "/finanzas", "/catalogos", "/usuarios", "/config-proveedores", "/config-materiales", "/config-ia"],
  PRESIDENCIA:    ["/presidencia", "/catalogos"],
  INFRAESTRUCTURA:["/infraestructura"],
  CIERRE_DE_OBRA: ["/cierre-obra"],
  PROCURA:        ["/procura", "/catalogos"],
  ANALISTA:       ["/analistas"],
  FINANZAS:       ["/finanzas"],
  CATALOGOS:      ["/catalogos"],
};

export function useRoleAccess(role: string | undefined) {
  const activeRole = role; // sin fallback — si no hay rol, canAccess es false

  const canAccess = (path: string) => {
    if (!activeRole) return false;
    // Denegar por defecto: un rol no reconocido no hereda las rutas de
    // ningún otro rol (antes caía a INFRAESTRUCTURA, una escalación de
    // privilegios involuntaria para roles desconocidos/mal tipeados).
    return (roleAccess[activeRole] ?? []).includes(path);
  };

  const firstAllowedRoute = (r: string | undefined): string | null => {
    if (!r) return null;
    return roleAccess[r]?.[0] ?? null;
  };

  return { activeRole, canAccess, firstAllowedRoute };
}
