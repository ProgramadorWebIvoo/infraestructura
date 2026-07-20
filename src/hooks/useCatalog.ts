/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook del catálogo de materiales. Estado + fetch GET /materials + handlers.
 * Antes no fetcheaba; ahora carga lo suyo sin depender de useProjects.
 */

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../services/api";
import type { ShowToast } from "./useProjects";

export interface CatalogItem {
  name: string;
  unit: string;
  estimatedUnitPrice: number;
}

export function useCatalog(authToken: string, showToast: ShowToast) {
  const [materialsCatalog, setMaterialsCatalog] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMaterials = useCallback(async () => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await apiFetch<CatalogItem[]>("/materials", { token: authToken });
      setMaterialsCatalog(data);
    } catch (error) {
      console.error(error);
      showToast("No se pudo cargar el catálogo de materiales.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, showToast]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

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
