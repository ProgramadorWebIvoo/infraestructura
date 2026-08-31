/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Control de acceso por rol. Las definiciones de rutas (paths, guard,
 * detección de rutas públicas) viven en src/routes.tsx.
 * Separado de useAuth para respetar SRP.
 *
 * La matriz rol → rutas permitidas viene del backend (GET /api/auth/permissions,
 * fuente de verdad: config/permissions.php) en vez de estar hardcodeada acá —
 * un rol o ruta nueva no requiere un deploy del frontend para tomar efecto.
 */

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { logError } from "../services/logger";

export function useRoleAccess(role: string | undefined) {
  const activeRole = role; // sin fallback — si no hay rol, canAccess es false

  const [roleAccess, setRoleAccess] = useState<Record<string, string[]>>({});
  // Empieza en true solo si hay rol: sin permisos cargados, canAccess debe
  // denegar todo (fail-closed) hasta que el fetch resuelva.
  const [isLoadingPermissions, setIsLoadingPermissions] = useState<boolean>(!!role);

  useEffect(() => {
    if (!activeRole) {
      setIsLoadingPermissions(false);
      return;
    }

    let cancelled = false;
    setIsLoadingPermissions(true);

    apiFetch<Record<string, string[]>>("/auth/permissions", { method: "GET" })
      .then((data) => {
        if (!cancelled) setRoleAccess(data);
      })
      .catch((err) => {
        if (!cancelled) logError("useRoleAccess.loadPermissions", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPermissions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeRole]);

  // useCallback: canAccess se pasa como prop a SidebarNav (memo()) — sin
  // referencia estable, ese memo no tiene efecto real porque la prop
  // "cambia" en cada render de AppRoutes aunque roleAccess/activeRole sigan
  // siendo los mismos.
  const canAccess = useCallback(
    (path: string) => {
      if (!activeRole) return false;
      // Denegar por defecto: un rol no reconocido (o mientras cargan los
      // permisos) no hereda las rutas de ningún otro rol.
      return (roleAccess[activeRole] ?? []).includes(path);
    },
    [activeRole, roleAccess],
  );

  const firstAllowedRoute = useCallback(
    (r: string | undefined): string | null => {
      if (!r) return null;
      return roleAccess[r]?.[0] ?? null;
    },
    [roleAccess],
  );

  return { activeRole, canAccess, firstAllowedRoute, isLoadingPermissions };
}
