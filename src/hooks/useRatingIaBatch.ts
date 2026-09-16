/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cronjob de RatingIA (evaluación batch de sugerencia de rating IA para
 * todos los proveedores activos) — mismo par de responsabilidades que
 * useExchangeRateSyncLogs (historial, solo lectura) + useExchangeRates
 * (disparo manual), unificados en un solo hook porque acá ambos alimentan el
 * mismo panel (RatingIaPanel) sin ningún otro consumidor.
 */

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";

export interface RatingIaRunLog {
  id: number;
  started_at: string;
  finished_at: string | null;
  contractors_evaluated: number;
  suggestions_generated: number;
  errors_count: number;
  status: "success" | "partial" | "failed";
  error_message: string | null;
  debug_details: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractorRatingSuggestionRecord {
  id: number;
  contractor_code: string;
  current_rating: number | null;
  suggested_rating: number | null;
  confidence_score: number;
  rationale: string | null;
  provider: string | null;
  source: "manual" | "batch";
  created_at: string;
  updated_at: string;
  contractor?: { code: string; name: string } | null;
}

export interface RunResponse {
  success: boolean;
  data: RatingIaRunLog;
}

export function useRatingIaBatch(authToken: string, enabled: boolean) {
  const [runLogs, setRunLogs] = useState<RatingIaRunLog[]>([]);
  const [suggestions, setSuggestions] = useState<ContractorRatingSuggestionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const loadRunLogs = useCallback(async () => {
    if (!authToken || !enabled) return;
    setIsLoading(true);
    try {
      const data = await apiFetch<{ data: RatingIaRunLog[] }>("/rating-ia/run-logs", { token: authToken });
      setRunLogs(data?.data ?? []);
    } catch (err) {
      logError("useRatingIaBatch.loadRunLogs", err);
    } finally {
      setIsLoading(false);
    }
  }, [authToken, enabled]);

  const loadSuggestions = useCallback(async () => {
    if (!authToken || !enabled) return;
    try {
      const data = await apiFetch<{ data: ContractorRatingSuggestionRecord[] }>("/rating-ia/suggestions", { token: authToken });
      setSuggestions(data?.data ?? []);
    } catch (err) {
      logError("useRatingIaBatch.loadSuggestions", err);
    }
  }, [authToken, enabled]);

  useEffect(() => {
    if (enabled) {
      loadRunLogs();
      loadSuggestions();
    }
  }, [enabled, loadRunLogs, loadSuggestions]);

  const runNow = useCallback(async (): Promise<RunResponse> => {
    if (!authToken || !enabled) throw new Error("Auth token required");
    setIsRunning(true);
    try {
      const response = await apiFetch<RunResponse>("/rating-ia/run", { method: "POST", token: authToken });
      await Promise.all([loadRunLogs(), loadSuggestions()]);
      return response;
    } catch (err) {
      logError("useRatingIaBatch.runNow", err);
      throw err;
    } finally {
      setIsRunning(false);
    }
  }, [authToken, enabled, loadRunLogs, loadSuggestions]);

  return { runLogs, suggestions, isLoading, isRunning, loadRunLogs, loadSuggestions, runNow };
}
