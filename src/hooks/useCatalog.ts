/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook que gestiona el catálogo de materiales.
 */

import { useState, useCallback } from "react";
import { MATERIAL_CATALOG } from "../data";

export interface CatalogItem {
  name: string;
  unit: string;
  estimatedUnitPrice: number;
}

export function useCatalog() {
  const [materialsCatalog, setMaterialsCatalog] = useState<CatalogItem[]>([]);

  const handleAddCatalogItem = useCallback((newItem: CatalogItem) => {
    setMaterialsCatalog(prev => [...prev, newItem]);
  }, []);

  const resetCatalog = useCallback(() => {
    setMaterialsCatalog([]);
  }, []);

  return {
    materialsCatalog,
    setMaterialsCatalog,
    handleAddCatalogItem,
    resetCatalog,
  };
}
