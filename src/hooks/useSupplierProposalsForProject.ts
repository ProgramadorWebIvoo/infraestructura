/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook que trae las propuestas de materiales de proveedores (portal público)
 * de TODOS los proyectos en una sola request, agrupadas por proyecto — usado
 * para detectar cuáles aún no han sido importadas al cuadro comparativo de
 * Analistas.
 *
 * Antes hacía una request POR proyecto (`?project_id=X`), secuencial (un
 * `for` con `await` adentro) — con N proyectos pendientes de licitación eran
 * N requests seriales solo para pintar badges en el grid. El backend ya
 * expone `/supplier-material-proposals` sin filtro (mismo endpoint que usa
 * `useProveedores`) devolviendo `projectId` en cada item, así que agrupar
 * client-side convierte N requests en 1.
 */

import { useCallback } from "react";
import type { SupplierMaterialProposal } from "@/types";
import { apiFetch } from "@/services/api";

export function useSupplierProposalsForProject(authToken: string) {
  /**
   * Trae TODAS las propuestas del portal y las agrupa por `projectId`.
   * Si falla, devuelve un mapa vacío (no rompe el flujo — mismo criterio que
   * el fallback anterior por proyecto).
   */
  const fetchAllGroupedByProject = useCallback(
    async (): Promise<Record<string, SupplierMaterialProposal[]>> => {
      try {
        const data = await apiFetch<SupplierMaterialProposal[]>(
          "/supplier-material-proposals",
          { token: authToken }
        );
        const grouped: Record<string, SupplierMaterialProposal[]> = {};
        for (const proposal of data ?? []) {
          (grouped[proposal.projectId] ??= []).push(proposal);
        }
        return grouped;
      } catch {
        return {};
      }
    },
    [authToken]
  );

  return { fetchAllGroupedByProject };
}