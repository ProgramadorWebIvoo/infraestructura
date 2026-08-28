/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook que trae las propuestas de materiales de proveedores (portal público)
 * para un proyecto específico, para detectar cuáles aún no han sido importadas
 * al cuadro comparativo de Analistas.
 */

import { useCallback } from "react";
import type { SupplierMaterialProposal } from "../types";
import { apiFetch } from "../services/api";

export function useSupplierProposalsForProject(authToken: string) {
  /**
   * Trae todas las propuestas del portal para un proyecto.
   * Retorna un array vacío si no hay, o null si hay error (no falla el flujo).
   */
  const fetchForProject = useCallback(
    async (projectId: string): Promise<SupplierMaterialProposal[]> => {
      try {
        const data = await apiFetch<SupplierMaterialProposal[]>(
          `/supplier-material-proposals?project_id=${encodeURIComponent(projectId)}`,
          { token: authToken }
        );
        return data ?? [];
      } catch {
        // Si falla, retorna array vacío (sin propuestas del portal detectables)
        return [];
      }
    },
    [authToken]
  );

  return { fetchForProject };
}