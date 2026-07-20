/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook de propuestas de materiales de proveedores. Extraído de
 * ProveedoresRegistrados: GET /supplier-material-proposals + POST /supplier-invitations.
 */

import { useState, useEffect, useCallback } from "react";
import type { SupplierMaterialProposal } from "../types";
import { apiFetch } from "../services/api";
import type { ShowToast } from "./useProjects";

export function useProveedores(authToken: string, showToast: ShowToast) {
  const [proposals, setProposals] = useState<SupplierMaterialProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProposals = useCallback(async () => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await apiFetch<SupplierMaterialProposal[]>("/supplier-material-proposals", { token: authToken });
      setProposals(data);
    } catch (error) {
      console.error(error);
      showToast("No se pudo cargar las propuestas de proveedores.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, showToast]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const handleInviteSupplier = useCallback(
    async (payload: {
      project_id: string;
      supplierName: string;
      supplierCompany: string | null;
      supplierContact: string;
    }): Promise<{ token: string; projectTitle: string }> => {
      try {
        const data = await apiFetch<{ token: string; projectTitle: string }>("/supplier-invitations", {
          method: "POST",
          token: authToken,
          body: JSON.stringify(payload),
        });
        showToast(`Invitación enviada a ${payload.supplierContact}`, "success");
        return data;
      } catch (err) {
        const message = (err as Error).message || "Error al enviar la invitación.";
        showToast(message, "error");
        throw err;
      }
    },
    [authToken, showToast],
  );

  return {
    proposals,
    isLoadingProposals: isLoading,
    loadProposals,
    handleInviteSupplier,
  };
}
