/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Control de acceso a vistas. Las definiciones de rutas (paths, guard,
 * detección de rutas públicas) viven en src/routes.tsx.
 * Separado de useAuth para respetar SRP.
 *
 * La lista de vistas viene ya resuelta desde el backend (GET
 * /api/auth/permissions) para el usuario autenticado: default de su rol
 * mezclado con sus overrides individuales configurados en el panel de
 * Usuarios (ver AccessResolver::resolveViews en el backend) — el acceso ya
 * no es solo por rol, así que no tiene sentido indexar acá por rol.
 */

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";

export function useRoleAccess(role: string | undefined) {
  const activeRole = role; // sin fallback — si no hay rol, canAccess es false

  const [views, setViews] = useState<string[]>([]);
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

    apiFetch<string[]>("/auth/permissions", { method: "GET" })
      .then((data) => {
        if (!cancelled) setViews(data);
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
  // "cambia" en cada render de AppRoutes aunque views/activeRole sigan
  // siendo los mismos.
  const canAccess = useCallback(
    (path: string) => {
      if (!activeRole) return false;
      return views.includes(path);
    },
    [activeRole, views],
  );

  const firstAllowedRoute = useCallback((): string | null => views[0] ?? null, [views]);

  return { activeRole, canAccess, firstAllowedRoute, isLoadingPermissions };
}
