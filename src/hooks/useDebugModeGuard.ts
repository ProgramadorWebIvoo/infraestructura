/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Guardia de autorización del DEBUG-MODE en el cliente. El flag vive en
 * localStorage (`ivoo_debug_mode`) y NO es una fuente de verdad de permisos:
 * si la sesión cambia a un rol sin acceso (o se cierra), el modo se apaga y
 * se limpia el buffer de inmediato — el panel, los listeners y el hook de
 * red caen con él (ver useDebugRuntime y services/api.ts).
 *
 * Se apaga SOLO EN MEMORIA (`persist: false`): la preferencia guardada del
 * admin no se pierde por un estado transitorio, ni un usuario estándar que
 * comparta el navegador puede reactivarla (el panel exige el rol siempre).
 */

import { useEffect } from "react";
import { useDebugStore } from "@/stores/debugStore";

const DEBUG_ALLOWED_ROLES: readonly string[] = ["SUPERADMIN", "ADMIN"];

export function canUseDebugMode(role: string | null | undefined): boolean {
  return !!role && DEBUG_ALLOWED_ROLES.includes(role);
}

export type DebugGuardAction = "none" | "clear" | "disable";

/**
 * Función pura (testeable) con la decisión de la guardia.
 * - Permisos cargando o rol aún sin resolver → no tocar (estado transitorio).
 * - Sin sesión (logout) → vaciar el buffer, conservar la preferencia.
 * - Rol resuelto y sin acceso → apagar.
 */
export function resolveDebugGuardAction(params: {
  enabled: boolean;
  hasSession: boolean;
  activeRole: string | null | undefined;
  isLoadingPermissions: boolean;
}): DebugGuardAction {
  const { enabled, hasSession, activeRole, isLoadingPermissions } = params;
  if (!enabled || isLoadingPermissions) return "none";
  if (!hasSession) return "clear";
  if (!activeRole) return "none";
  return canUseDebugMode(activeRole) ? "none" : "disable";
}

interface UseDebugModeGuardParams {
  hasSession: boolean;
  activeRole: string | null | undefined;
  isLoadingPermissions: boolean;
}

export function useDebugModeGuard({ hasSession, activeRole, isLoadingPermissions }: UseDebugModeGuardParams): void {
  const enabled = useDebugStore(s => s.enabled);
  const setEnabled = useDebugStore(s => s.setEnabled);
  const clear = useDebugStore(s => s.clear);

  useEffect(() => {
    const action = resolveDebugGuardAction({ enabled, hasSession, activeRole, isLoadingPermissions });
    if (action === "disable") setEnabled(false, { persist: false });
    else if (action === "clear") clear();
  }, [enabled, hasSession, activeRole, isLoadingPermissions, setEnabled, clear]);
}
