/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook for AI Configuration (providers, models, API keys, usage).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../services/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AiConfigRecord {
  id: number;
  provider: "openai" | "anthropic" | "gemini";
  model: string;
  apiKey: string; // masked
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

export const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ["gpt-5.6-sol", "gpt-4.1", "gpt-4.1-mini", "gpt-5.4-nano", "gpt-5.6-luna", "gpt-5.6-terra"],
  anthropic: ["claude-opus-4-8", "claude-sonnet-5", "claude-haiku-4-5"],
  gemini: ["gemini-3.6-flash", "gemini-3.1-pro-preview", "gemini-3.5-flash", "gemini-3.1-flash-lite"],
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

  const prevToken = useRef(authToken);

  // Reset loading on login
  useEffect(() => {
    if (!prevToken.current && authToken) {
      setIsLoading(true);
      setIsUsageLoading(true);
    }
    prevToken.current = authToken;
  }, [authToken]);

  // Load configs
  const loadConfigs = useCallback(async () => {
    if (!authToken) return;
    try {
      const data = await apiFetch<AiConfigRecord[]>("/ai/config", { token: authToken });
      setConfigs(data);
    } catch (err) {
      console.error("🔍 Error loading AI configs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Load usage
  const loadUsage = useCallback(async (days = 30) => {
    if (!authToken) return;
    setIsUsageLoading(true);
    try {
      const data = await apiFetch<AiUsageData>(`/ai/config/usage?days=${days}`, { token: authToken });
      setUsage(data);
    } catch (err) {
      console.error("🔍 Error loading AI usage:", err);
    } finally {
      setIsUsageLoading(false);
    }
  }, [authToken]);

  // Create config
  const createConfig = useCallback(async (form: AiConfigForm): Promise<AiConfigRecord> => {
    const created = await apiFetch<AiConfigRecord>("/ai/config", {
      method: "POST",
      token: authToken,
      body: JSON.stringify(form),
    });
    setConfigs((prev) => [...prev, created]);
    return created;
  }, [authToken]);

  // Update config
  const updateConfig = useCallback(async (id: number, form: Partial<AiConfigForm>): Promise<AiConfigRecord> => {
    const updated = await apiFetch<AiConfigRecord>(`/ai/config/${id}`, {
      method: "PATCH",
      token: authToken,
      body: JSON.stringify(form),
    });
    setConfigs((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, [authToken]);

  // Delete config
  const deleteConfig = useCallback(async (id: number): Promise<void> => {
    await apiFetch(`/ai/config/${id}`, { method: "DELETE", token: authToken });
    setConfigs((prev) => prev.filter((c) => c.id !== id));
  }, [authToken]);

  // Test config
  const testConfig = useCallback(async (id: number): Promise<{ success: boolean; message: string }> => {
    return apiFetch(`/ai/config/${id}/test`, { method: "POST", token: authToken });
  }, [authToken]);

  // Sync to runtime
  const syncConfig = useCallback(async () => {
    setSyncMessage(null);
    try {
      const result = await apiFetch<{ message: string; activeConfigs: number }>("/ai/config/sync", {
        method: "POST",
        token: authToken,
      });
      setSyncMessage(result.message);
      return result;
    } catch (err) {
      const msg = (err as Error).message || "Error al sincronizar.";
      setSyncMessage(msg);
      throw err;
    }
  }, [authToken]);

  return {
    configs,
    isLoading,
    usage,
    isUsageLoading,
    syncMessage,
    loadConfigs,
    loadUsage,
    createConfig,
    updateConfig,
    deleteConfig,
    testConfig,
    syncConfig,
    setSyncMessage,
  };
}
