/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook for AI Configuration (providers, models, API keys, usage).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../services/api";
import { logError, getErrorMessage } from "../services/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AiConfigRecord {
  id: number;
  provider: "openai" | "anthropic" | "gemini";
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
  provider: "openai" | "anthropic" | "gemini";
  model: string;
  apiKey: string;
  baseUrl: string;
  maxTokens: number | "";
  isActive: boolean;
  isFallback: boolean;
  sortOrder: number;
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
  cost: number;
  requests: number;
  successful_requests: number;
  failed_requests: number;
}

export interface AiUsageByProvider {
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  requests: number;
}

export interface AiUsageTotals {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  total_cost: number;
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

const INITIAL_USAGE: AiUsageTotals = {
  prompt_tokens: 0,
  completion_tokens: 0,
  total_tokens: 0,
  total_cost: 0,
  total_requests: 0,
  successful_requests: 0,
  failed_requests: 0,
};

// ---------------------------------------------------------------------------
// Provider labels & models
// ---------------------------------------------------------------------------

export const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI (ChatGPT)",
  anthropic: "Anthropic (Claude)",
  gemini: "Google Gemini",
};

export const PROVIDER_COLORS: Record<string, { border: string; badge: string; btn: string }> = {
  openai: { border: "border-l-emerald-400", badge: "bg-emerald-50 text-emerald-700", btn: "from-emerald-600 to-emerald-500" },
  anthropic: { border: "border-l-amber-400", badge: "bg-amber-50 text-amber-700", btn: "from-amber-600 to-amber-500" },
  gemini: { border: "border-l-blue-400", badge: "bg-blue-50 text-blue-700", btn: "from-blue-600 to-blue-500" },
};

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
  const [providerModels, setProviderModels] = useState<Record<string, string[]>>({});

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

  // Load selectable models per provider — fuente de verdad: backend
  // (config/ai.php), no hardcodeado en el frontend.
  const loadProviderModels = useCallback(async () => {
    if (!authTokenRef.current) return;
    try {
      const data = await apiFetch<Record<string, string[]>>("/ai/config/models");
      setProviderModels(data);
    } catch (err) {
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
  const updateConfig = useCallback(async (id: number, form: Partial<AiConfigForm>): Promise<AiConfigRecord> => {
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
