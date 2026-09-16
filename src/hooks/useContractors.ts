/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook de contratistas. Estado + fetch GET /contractors + handlers.
 * Incluye polling para mantener el listado actualizado (nuevos registros
 * desde el portal público o cambios desde la configuración).
 */

import { useCallback } from "react";
import type { Contractor } from "@/types";
import { apiFetch } from "@/services/api";
import type { ShowToast } from "./useProjects";
import { usePolledFetch } from "./usePolledFetch";

export function useContractors(authToken: string, showToast: ShowToast, enabled = true) {
  // `contractors` solo lo consumen AnalistasPanel y ProveedoresRegistrados
  // (ROUTES.ANALISTAS / ROUTES.CATALOGOS) — ver App.tsx. Antes se pedía para
  // los 10 roles en cada mount de la app aunque solo 2 rutas lo usen; con
  // `enabled=false` (canAccess resuelto en false) usePolledFetch ni siquiera
  // dispara el fetch inicial ni el polling, sacándolo del burst inicial para
  // el resto de roles.
  const { data: contractors, setData: setContractors, isLoading, refresh: loadContractors } =
    usePolledFetch<Contractor>({
      authToken: enabled ? authToken : "",
      showToast,
      queryKey: ["contractors"],
      fetcher: useCallback(() => apiFetch<Contractor[]>("/contractors"), []),
      getSignature: useCallback(
        (data: Contractor[]) => data.map(c => [c.code, c.name, c.rating].join(":")).join("|"),
        [],
      ),
      errorMessage: "No se pudo cargar el catálogo de contratistas.",
    });

  const handleAddContractor = useCallback((newContractor: Contractor) => {
    setContractors(prev => [...prev.filter(item => item.code !== newContractor.code), newContractor]);
  }, []);

  const handleUpdateContractorRating = useCallback(async (code: string, rating: number) => {
    await apiFetch(`/contractors/${code}/rating`, {
      method: "POST",
      body: JSON.stringify({ rating }),
    });
    setContractors(prev => prev.map(c => c.code === code ? { ...c, rating } : c));
  }, []);

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
