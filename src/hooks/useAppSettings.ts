/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CONFIG APP (Fase 1.4 del plan de 90 días): parámetros de negocio editables
 * desde administración sin deploy — anticipo máximo, umbrales de semáforo
 * presupuestario, correos por departamento, datos fiscales, alertas de
 * precio, inflación de referencia, y qué acciones auditadas disparan correo
 * (antes hardcodeado en NotificationDispatcher::MAIL_ACTIONS).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../services/api";
import { logError } from "../services/logger";
import type { ConfigAuditLogRecord } from "./useConfigAuditLogs";

export type SettingType = "string" | "integer" | "float" | "boolean" | "json";

export interface AppSettingRecord {
  id: number;
  group: string;
  key: string;
  value: string | null;
  type: SettingType;
  min_value: number | null;
  max_value: number | null;
  label: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type SettingsByGroup = Record<string, AppSettingRecord[]>;

/** Respuesta de PATCH /settings/{id}: el setting actualizado + el registro
 *  de auditoría recién creado, para insertarlo en el panel sin re-consultar
 *  /config-audit-logs (evita polling para un dato que solo cambia por la
 *  propia acción del usuario en la misma vista). */
export type UpdateSettingResponse = AppSettingRecord & { auditLog?: ConfigAuditLogRecord };

export function useAppSettings(authToken: string) {
  const [settings, setSettings] = useState<SettingsByGroup>({});
  const [isLoading, setIsLoading] = useState(true);

  const authTokenRef = useRef(authToken);
  authTokenRef.current = authToken;
  const prevToken = useRef(authToken);

  const loadSettings = useCallback(async () => {
    if (!authTokenRef.current) return;
    try {
      const data = await apiFetch<SettingsByGroup>("/settings", { token: authTokenRef.current });
      setSettings(data);
    } catch (err) {
      logError("useAppSettings.loadSettings", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!prevToken.current && authToken) {
      setIsLoading(true);
    }
    prevToken.current = authToken;
    loadSettings();
  }, [authToken, loadSettings]);

  const updateSetting = useCallback(async (id: number, value: string): Promise<UpdateSettingResponse> => {
    const updated = await apiFetch<UpdateSettingResponse>(`/settings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ value }),
      token: authTokenRef.current,
    });

    setSettings(prev => {
      const next: SettingsByGroup = {};
      for (const group of Object.keys(prev)) {
        next[group] = prev[group].map(s => (s.id === id ? updated : s));
      }
      return next;
    });

    return updated;
  }, []);

  return { settings, isLoading, loadSettings, updateSetting };
}
