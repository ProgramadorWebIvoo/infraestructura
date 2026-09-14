/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fuente única de verdad para pre-fetching: por cada ruta autenticada,
 * declara (a) el loader del chunk lazy — el MISMO `import()` que antes vivía
 * suelto en `AuthenticatedRoutes.tsx` como `lazy(() => import(...))`, ahora
 * centralizado acá para que `React.lazy()` y el pre-fetch en hover lean del
 * mismo lugar en vez de mantener dos listas de imports paralelas — y (b),
 * opcionalmente, qué datos precargar, reusando la MISMA `queryKey`/fetcher
 * que ya usa el hook de esa vista (`usePolledFetch`) — nunca un fetcher
 * paralelo, así el cache que llena el prefetch es el mismo que consume la
 * vista al montar (si ya está fresh, React Query no repite el request).
 *
 * Deliberadamente NO todas las rutas tienen `prefetchData`: `/`, `/procura`,
 * `/finanzas`, etc. reciben sus datos (`projects`, `contractors`,
 * `materialsCatalog`) como props desde `AppRoutes` — ya se cargan una sola
 * vez al autenticar, sin importar la ruta activa (ver App.tsx) — así que
 * "pre-cargarlos" en hover sería un no-op costoso. Solo se declara
 * `prefetchData` donde la vista carga su propia data de forma perezosa
 * (Usuarios, Catálogo de Proveedores) — es la única ganancia real.
 */

import type { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/services/api";
import { ROUTES } from "@/routes";
import type { UserRecord } from "@/hooks/useUsuarios";
import type { SupplierMaterialProposal, CatalogCategory, CatalogProduct } from "@/types";

interface RoutePrefetchEntry {
  /**
   * Mismo loader pasado a `React.lazy()` en AuthenticatedRoutes.tsx. `any`
   * en vez de `unknown`: cada vista tiene sus propias props concretas (ver
   * XxxPanelProps de cada módulo) y AuthenticatedRoutes ya las tipa como
   * `any` en su spread de props (mismo `eslint-disable` que ese archivo) —
   * este registro no puede ser más estricto que el spread que lo consume.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loadChunk: () => Promise<{ default: React.ComponentType<any> }>;
  /** Opcional: precarga de datos vía React Query, con la MISMA queryKey que ya usa el hook de la vista. */
  prefetchData?: (queryClient: QueryClient, authToken: string) => void;
}

/** queryKey = [...key, authToken] — mismo esquema que `usePolledFetch` (ver src/hooks/usePolledFetch.ts). */
function withAuthKey(key: string, authToken: string): [string, string] {
  return [key, authToken];
}

export const ROUTE_PREFETCH: Partial<Record<string, RoutePrefetchEntry>> = {
  [ROUTES.HOME]: { loadChunk: () => import("@/views/HomePanel") },
  [ROUTES.PRESIDENCIA]: { loadChunk: () => import("@/views/PresidenciaDashboard") },
  [ROUTES.MARKETING]: { loadChunk: () => import("@/views/MarketingPanel") },
  [ROUTES.INFRAESTRUCTURA]: { loadChunk: () => import("@/views/InfraestructuraMantenimientoPanel") },
  [ROUTES.CIERRE_OBRA]: { loadChunk: () => import("@/views/CierreObraPanel") },
  [ROUTES.PROCURA]: { loadChunk: () => import("@/views/ProcuraPanel") },
  [ROUTES.ANALISTAS]: { loadChunk: () => import("@/views/AnalistasPanel") },
  [ROUTES.FINANZAS]: { loadChunk: () => import("@/views/FinanzasPanel") },

  [ROUTES.CATALOGOS]: {
    loadChunk: () => import("@/views/ProveedoresRegistrados"),
    // Misma queryKey/fetcher que useCatalogProducts + useProveedores (ver
    // esos hooks) — contractors/projects NO se listan acá: ya son globales.
    prefetchData: (queryClient, authToken) => {
      queryClient.prefetchQuery({
        queryKey: withAuthKey("catalogProducts", authToken),
        queryFn: () => apiFetch<CatalogProduct[]>("/catalog/products?per_page=100"),
      });
      queryClient.prefetchQuery({
        queryKey: withAuthKey("catalogCategories", authToken),
        queryFn: () => apiFetch<CatalogCategory[]>("/catalog-categories"),
      });
      queryClient.prefetchQuery({
        queryKey: withAuthKey("supplierMaterialProposals", authToken),
        queryFn: () => apiFetch<SupplierMaterialProposal[]>("/supplier-material-proposals"),
      });
    },
  },

  [ROUTES.USUARIOS]: {
    loadChunk: () => import("@/views/UsuariosPanel"),
    // Misma queryKey/fetcher que useUsuarios.ts.
    prefetchData: (queryClient, authToken) => {
      queryClient.prefetchQuery({
        queryKey: withAuthKey("users", authToken),
        queryFn: () => apiFetch<UserRecord[]>("/users"),
      });
    },
  },

  [ROUTES.CONFIG_PROVEEDORES]: { loadChunk: () => import("@/views/ProveedoresConfigPanel") },
  [ROUTES.CONFIG_MATERIALES]: { loadChunk: () => import("@/views/MaterialConfigPanel") },
  [ROUTES.CONFIG_IA]: { loadChunk: () => import("@/views/AIConfigPanel") },
  [ROUTES.CONFIG_APP]: { loadChunk: () => import("@/views/ConfigAppPanel") },
};
