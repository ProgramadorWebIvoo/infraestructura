/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook for Configuración de Keys (SMTP, Pusher, Storage) — credenciales de
 * infraestructura editables sin tocar .env. Mismo patrón que useAIConfig:
 * los campos secretos llegan masked (hasValue + últimos 4 chars), nunca
 * completos. Para "storage", `isActive` decide nube (S3) vs servidor (local).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";
import type { ConfigAuditLogRecord } from "./useConfigAuditLogs";

export type SystemKeyGroup = "smtp" | "pusher" | "storage";

export interface SystemKeyField {
  hasValue: boolean;
  value: string;
}

export interface SystemKeyConfigRecord {
  group: SystemKeyGroup;
  isActive: boolean;
  fields: Record<string, SystemKeyField>;
  updatedAt: string | null;
}

export type SystemKeyConfigMutationResponse = SystemKeyConfigRecord & { auditLog?: ConfigAuditLogRecord };

export function useSystemKeyConfig(authToken: string) {
  const [configs, setConfigs] = useState<SystemKeyConfigRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const authTokenRef = useRef(authToken);
  authTokenRef.current = authToken;
  const prevToken = useRef(authToken);

  const loadConfigs = useCallback(async () => {
    if (!authTokenRef.current) return;
    try {
      const data = await apiFetch<SystemKeyConfigRecord[]>("/system-keys");
      setConfigs(data);
    } catch (err) {
      logError("useSystemKeyConfig.loadConfigs", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const justLoggedIn = !prevToken.current && authToken;
    prevToken.current = authToken;
    if (justLoggedIn) setIsLoading(true);
    loadConfigs();
  }, [authToken, loadConfigs]);

  const updateConfig = useCallback(
    async (group: SystemKeyGroup, payload: { isActive?: boolean; [field: string]: string | boolean | undefined }): Promise<SystemKeyConfigMutationResponse> => {
      const updated = await apiFetch<SystemKeyConfigMutationResponse>(`/system-keys/${group}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setConfigs((prev) => prev.map((c) => (c.group === group ? updated : c)));
      return updated;
    },
    [],
  );

  const testConfig = useCallback(
    async (group: SystemKeyGroup, payload?: Record<string, string>): Promise<{ success: boolean; message: string }> => {
      return apiFetch(`/system-keys/${group}/test`, {
        method: "POST",
        body: JSON.stringify(payload ?? {}),
      });
    },
    [],
  );

  return { configs, isLoading, updateConfig, testConfig };
}
