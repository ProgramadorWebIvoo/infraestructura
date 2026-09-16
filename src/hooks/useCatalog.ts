/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook del catálogo de materiales. Estado + fetch GET /materials + handlers.
 * Antes no fetcheaba; ahora carga lo suyo sin depender de useProjects.
 */

import { useCallback } from "react";
import { apiFetch } from "@/services/api";
import type { ShowToast } from "./useProjects";
import { usePolledFetch } from "./usePolledFetch";

export interface CatalogItem {
  name: string;
  unit: string;
  estimatedUnitPrice: number;
}

export function useCatalog(authToken: string, showToast: ShowToast, enabled = true) {
  // `materialsCatalog` solo lo consume InfraestructuraMantenimientoPanel
  // (ROUTES.INFRAESTRUCTURA) — ver App.tsx. Mismo criterio que useContractors:
  // antes se pedía /materials para los 10 roles en cada mount aunque solo
  // uno lo use, sumando otra request al burst inicial del dashboard.
  const { data: materialsCatalog, setData: setMaterialsCatalog, isLoading, refresh: loadMaterials } =
    usePolledFetch<CatalogItem>({
      authToken: enabled ? authToken : "",
      showToast,
      queryKey: ["materials"],
      fetcher: useCallback(() => apiFetch<CatalogItem[]>("/materials"), []),
      getSignature: useCallback(
        (data: CatalogItem[]) => data.map(i => [i.name, i.unit, i.estimatedUnitPrice].join(":")).join("|"),
        [],
      ),
      errorMessage: "No se pudo cargar el catálogo de materiales.",
    });

  const handleAddCatalogItem = useCallback((newItem: CatalogItem) => {
    setMaterialsCatalog(prev => [...prev, newItem]);
  }, []);

  const resetCatalog = useCallback(() => {
    setMaterialsCatalog([]);
  }, []);

  return {
    materialsCatalog,
    setMaterialsCatalog,
    isLoading,
    loadMaterials,
    handleAddCatalogItem,
    resetCatalog,
  };
}
