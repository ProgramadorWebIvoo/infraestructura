/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook de contratistas. Estado + fetch GET /contractors + handlers.
 * Antes solo tenía el POST de rating y dependía de useProjects
 * para cargar los datos; ahora fetchea lo suyo.
 */

import { useState, useEffect, useCallback } from "react";
import type { Contractor } from "../types";
import { apiFetch } from "../services/api";
import type { ShowToast } from "./useProjects";

export function useContractors(authToken: string, showToast: ShowToast) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadContractors = useCallback(async () => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await apiFetch<Contractor[]>("/contractors", { token: authToken });
      setContractors(data);
    } catch (error) {
      console.error(error);
      showToast("No se pudo cargar el catálogo de contratistas.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, showToast]);

  useEffect(() => {
    loadContractors();
  }, [loadContractors]);

  const handleAddContractor = useCallback((newContractor: Contractor) => {
    setContractors(prev => [...prev.filter(item => item.code !== newContractor.code), newContractor]);
  }, []);

  const handleUpdateContractorRating = useCallback(async (code: string, rating: number) => {
    await apiFetch(`/contractors/${code}/rating`, {
      method: "POST",
      token: authToken,
      body: JSON.stringify({ rating }),
    });
    setContractors(prev => prev.map(c => c.code === code ? { ...c, rating } : c));
  }, [authToken]);

  const resetContractors = useCallback(() => {
    setContractors([]);
  }, []);

  return {
    contractors,
    setContractors,
    isLoading,
    loadContractors,
    handleAddContractor,
    handleUpdateContractorRating,
    resetContractors,
  };
}
