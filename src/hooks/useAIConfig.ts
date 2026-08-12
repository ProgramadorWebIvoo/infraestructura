/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook for AI Configuration (providers, models, API keys, usage).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../services/api";
import { logError, getErrorMessage } from "../services/logger";
// Re-export de constantes de dominio: las vistas las consumen desde el hook
// (API pública estable) pero la fuente de verdad vive en constants/aiProviders.
export {
  AI_PROVIDERS,
  PROVIDER_LABELS,
  PROVIDER_COLORS,
  providerColor,
} from "../constants/aiProviders";
import type { AIProvider } from "../constants/aiProviders";
import { PROVIDER_MODELS } from "../constants/aiModels";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AiConfigRecord {
  id: number;
  provider: AIProvider;
  model: string;
  hasApiKey: boolean;
  apiKey: string; // solo últimos 4 chars visibles (ej. "••••wxyz")
  baseUrl: string | null;
  maxTokens: number;
  isActive: boolean;
  isFallback: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiConfigForm {
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
  maxTokens: number | "";
  isActive: boolean;
  isFallback: boolean;
  sortOrder: number;
}

/**
 * Payload de actualización. baseUrl es nullable (vacío → null en backend) y
 * apiKey es opcional (vacío = conservar la actual). Difieren de AiConfigForm
 * porque el formulario usa strings para ambos.
 */
export interface AiConfigUpdatePayload {
  model?: string;
  apiKey?: string;
  baseUrl?: string | null;
  maxTokens?: number;
  isActive?: boolean;
  isFallback?: boolean;
  sortOrder?: number;
}

export const EMPTY_CONFIG_FORM: AiConfigForm = {
  provider: "openai",
  model: "",
  apiKey: "",
  baseUrl: "",
  maxTokens: 4096,
  isActive: true,
  isFallback: false,
  sortOrder: 0,
};

export interface AiUsageDaily {
  date: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  /** SUM() agregado en MySQL vía selectRaw — PDO lo serializa como string. */
  cost: number | string;
  requests: number;
  successful_requests: number;
  failed_requests: number;
}

export interface AiUsageByProvider {
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  /** SUM() agregado en MySQL vía selectRaw — PDO lo serializa como string. */
  cost: number | string;
  requests: number;
}

export interface AiUsageTotals {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  /** SUM() agregado en MySQL vía selectRaw — PDO lo serializa como string. */
  total_cost: number | string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
}

export interface AiUsageData {
  daily: AiUsageDaily[];
  byProvider: AiUsageByProvider[];
  byModel: (AiUsageByProvider & { model: string })[];
  totals: AiUsageTotals;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAIConfig(authToken: string) {
  const [configs, setConfigs] = useState<AiConfigRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usage, setUsage] = useState<AiUsageData | null>(null);
  const [isUsageLoading, setIsUsageLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncIsError, setSyncIsError] = useState(false);
  // Catálogo constante como base editable en código (constants/aiModels.ts).
  // El endpoint solo puede EXTENDERLO (modelos nuevos que aparezcan en
  // backend/producción) — nunca deja el selector vacío aunque falle.
  const [providerModels, setProviderModels] = useState<Record<string, string[]>>(
    () => PROVIDER_MODELS,
  );

  const authTokenRef = useRef(authToken);
  authTokenRef.current = authToken;

  const prevToken = useRef(authToken);

  // Load configs
  const loadConfigs = useCallback(async () => {
    if (!authTokenRef.current) return;
    try {
      const data = await apiFetch<AiConfigRecord[]>("/ai/config");
      setConfigs(data);
    } catch (err) {
      logError("useAIConfig.loadConfigs", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carga modelos seleccionables por proveedor. Base: catálogo constante
  // (constants/aiModels.ts); el backend (config/ai.php → available_models)
  // solo puede extender el catálogo, no vaciarlo.
  const loadProviderModels = useCallback(async () => {
    if (!authTokenRef.current) return;
    try {
      const data = await apiFetch<Record<string, string[]>>("/ai/config/models");
      setProviderModels({ ...PROVIDER_MODELS, ...data });
    } catch (err) {
      // Ante fallo se conserva el catálogo constante — el selector nunca
      // queda sin opciones.
      logError("useAIConfig.loadProviderModels", err);
    }
  }, []);

  // Load usage
  const loadUsage = useCallback(async (days = 30) => {
    if (!authTokenRef.current) return;
    setIsUsageLoading(true);
    try {
      const data = await apiFetch<AiUsageData>(`/ai/config/usage?days=${days}`);
      setUsage(data);
    } catch (err) {
      logError("useAIConfig.loadUsage", err);
    } finally {
      setIsUsageLoading(false);
    }
  }, []);

  // Un solo efecto cubre carga inicial (mount) y recarga en login (token
  // pasa de falsy → truthy) — antes eran dos useEffect separados que ambos
  // terminaban llamando loadConfigs(), duplicando el fetch en el caso en que
  // el componente ya estaba montado sin sesión y el usuario luego iniciaba sesión.
  useEffect(() => {
    const justLoggedIn = !prevToken.current && authToken;
    prevToken.current = authToken;

    if (justLoggedIn) {
      setIsLoading(true);
      setIsUsageLoading(true);
      loadUsage();
    }
    loadConfigs();
    loadProviderModels();
  }, [authToken, loadConfigs, loadUsage, loadProviderModels]);

  // Create config
  const createConfig = useCallback(async (form: AiConfigForm): Promise<AiConfigRecord> => {
    const created = await apiFetch<AiConfigRecord>("/ai/config", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setConfigs((prev) => [...prev, created]);
    return created;
  }, []);

  // Update config
  const updateConfig = useCallback(async (id: number, form: AiConfigUpdatePayload): Promise<AiConfigRecord> => {
    const updated = await apiFetch<AiConfigRecord>(`/ai/config/${id}`, {
      method: "PATCH",
      body: JSON.stringify(form),
    });
    setConfigs((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  // Delete config
  const deleteConfig = useCallback(async (id: number): Promise<void> => {
    await apiFetch(`/ai/config/${id}`, { method: "DELETE" });
    setConfigs((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Test config
  const testConfig = useCallback(async (id: number): Promise<{ success: boolean; message: string }> => {
    return apiFetch(`/ai/config/${id}/test`, { method: "POST" });
  }, []);

  // Sync to runtime
  const syncConfig = useCallback(async () => {
    setSyncMessage(null);
    setSyncIsError(false);
    try {
      const result = await apiFetch<{ message: string; activeConfigs: number }>("/ai/config/sync", {
        method: "POST",
      });
      setSyncMessage(result.message);
      return result;
    } catch (err) {
      const msg = getErrorMessage(err, "Error al sincronizar.");
      setSyncMessage(msg);
      setSyncIsError(true);
      throw err;
    }
  }, []);

  // Descarta el mensaje de sincronización — expone intención de dominio en
  // vez de los setters de estado interno crudos.
  const dismissSyncMessage = useCallback(() => {
    setSyncMessage(null);
    setSyncIsError(false);
  }, []);

  return {
    configs,
    isLoading,
    usage,
    isUsageLoading,
    providerModels,
    syncMessage,
    syncIsError,
    loadConfigs,
    loadUsage,
    createConfig,
    updateConfig,
    deleteConfig,
    testConfig,
    syncConfig,
    dismissSyncMessage,
  };
}
