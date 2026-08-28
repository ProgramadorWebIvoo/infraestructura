/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Catálogo maestro de productos (GET /catalog/products) + categorías (GET
 * /catalog-categories) — extraído para la nueva tab "Catálogo Maestro" de
 * Proveedores. `per_page=100` en vez de paginar en el server: el catálogo
 * es interno y de tamaño moderado (a diferencia de un listado público), y
 * evita construir UI de paginación server-side para un primer corte —
 * Table.tsx ya pagina client-side sobre el array completo.
 */

import { useCallback } from "react";
import type { CatalogCategory, CatalogProduct } from "../types";
import { apiFetch } from "../services/api";
import type { ShowToast } from "./useProjects";
import { usePolledFetch } from "./usePolledFetch";

export function useCatalogProducts(authToken: string, showToast: ShowToast) {
  const { data: products, isLoading: isLoadingProducts, refresh: refreshProducts } =
    usePolledFetch<CatalogProduct>({
      authToken,
      showToast,
      // apiFetch ya desenvuelve el `.data` de nivel superior (convención
      // Laravel) — acá ese `.data` desenvuelto ES el array de productos del
      // paginador (el paginador es {data, current_page, ...}, y su `data`
      // interno es justo lo que apiFetch devuelve), no un wrapper adicional.
      fetcher: useCallback(() => apiFetch<CatalogProduct[]>("/catalog/products?per_page=100"), []),
      getSignature: useCallback((data: CatalogProduct[]) => data.map((p) => `${p.id}:${p.updated_at}`).join("|"), []),
      errorMessage: "No se pudo cargar el catálogo de productos.",
    });

  const { data: categories, isLoading: isLoadingCategories } =
    usePolledFetch<CatalogCategory>({
      authToken,
      showToast,
      fetcher: useCallback(() => apiFetch<CatalogCategory[]>("/catalog-categories"), []),
      getSignature: useCallback((data: CatalogCategory[]) => data.map((c) => c.id).join("|"), []),
      errorMessage: "No se pudieron cargar las categorías de catálogo.",
    });

  return {
    products,
    isLoadingProducts,
    refreshProducts,
    categories,
    isLoadingCategories,
  };
}
