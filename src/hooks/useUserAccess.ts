/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook admin de accesos dinámicos por usuario (vistas + tabs).
 * GET/PUT /users/{id}/access — ver AccessAdminController/AccessResolver en
 * el backend. Único consumidor: UserAccessModal (panel de Usuarios).
 */

import { useCallback, useState } from "react";
import { apiFetch } from "@/services/api";
import { getErrorMessage } from "@/services/logger";
import type { ShowToast } from "./useProjects";

export interface ViewAccessEntry {
  key: string;
  label: string;
  defaultFromRole: boolean;
  /** true=allow override, false=deny override, null=sin override (hereda el rol) */
  override: boolean | null;
}

export interface TabAccessEntry {
  viewKey: string;
  tabKey: string;
  label: string;
  defaultActive: boolean;
  override: boolean | null;
}

export interface AccessCatalog {
  views: ViewAccessEntry[];
  tabs: TabAccessEntry[];
}

export interface AccessOverridesPayload {
  viewOverrides: { view_key: string; allowed: boolean | null }[];
  tabOverrides: { view_key: string; tab_key: string; allowed: boolean | null }[];
}

export function useUserAccess(showToast: ShowToast) {
  const [catalog, setCatalog] = useState<AccessCatalog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadAccess = useCallback(async (userId: number | string) => {
    setIsLoading(true);
    try {
      const data = await apiFetch<AccessCatalog>(`/users/${userId}/access`);
      setCatalog(data);
    } catch (err) {
      showToast(getErrorMessage(err, "No se pudo cargar la configuración de accesos."), "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const saveAccess = useCallback(async (userId: number | string, payload: AccessOverridesPayload) => {
    setIsSaving(true);
    try {
      const data = await apiFetch<AccessCatalog>(`/users/${userId}/access`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setCatalog(data);
      showToast("Accesos del usuario actualizados correctamente.", "success");
      return data;
    } catch (err) {
      showToast(getErrorMessage(err, "Error al guardar los accesos."), "error");
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [showToast]);

  const resetCatalog = useCallback(() => setCatalog(null), []);

  return { catalog, isLoading, isSaving, loadAccess, saveAccess, resetCatalog };
}
