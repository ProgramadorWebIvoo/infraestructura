/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook de contratistas. Estado + fetch GET /contractors + handlers.
 * Antes solo tenía el POST de rating y dependía de useProjects
 * para cargar los datos; ahora fetchea lo suyo.
 *
 * Incluye polling para mantener el listado actualizado (nuevos registros
 * desde el portal público o cambios desde la configuración).
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { Contractor } from "../types";
import { apiFetch } from "../services/api";
import type { ShowToast } from "./useProjects";
import { usePolling } from "./usePolling";

export function useContractors(authToken: string, showToast: ShowToast) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const lastSig = useRef("");
  const prevToken = useRef(authToken);

  // Resetear loading cuando el token pasa de falsy → truthy (login)
  useEffect(() => {
    if (!prevToken.current && authToken) {
      setIsLoading(true);
    }
    prevToken.current = authToken;
  }, [authToken]);

  const signatureOf = (data: Contractor[]) =>
    data.map(c => [c.code, c.name, c.rating].join(":")).join("|");

  const loadContractors = useCallback(async (opts?: { isPoll?: boolean }) => {
    if (!authToken) {
      return; // sin token no hay fetch, isLoading se mantiene para que al llegar el token se muestre skeleton
    }
    try {
      const data = await apiFetch<Contractor[]>("/contractors", { token: authToken });
      const sig = signatureOf(data);
      if (opts?.isPoll && sig === lastSig.current) return; // dedupe: evita re-render cada tick
      lastSig.current = sig;
      setContractors(data);
    } catch (error) {
      if (opts?.isPoll) return; // silencioso en poll
      console.error(error);
      showToast("No se pudo cargar el catálogo de contratistas.", "error");
    } finally {
      if (!opts?.isPoll) setIsLoading(false);
    }
  }, [authToken, showToast]);

  useEffect(() => {
    loadContractors();
  }, [loadContractors]);

  // Polling esencial: contratistas (mutados por portal público o configuración)
  usePolling(
    useCallback(() => loadContractors({ isPoll: true }), [loadContractors]),
    30000,
    !!authToken
  );

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
