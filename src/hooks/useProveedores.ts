/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook de propuestas de materiales de proveedores. Extraído de
 * ProveedoresRegistrados: GET /supplier-material-proposals + POST /supplier-invitations.
 */

import { useCallback } from "react";
import type { SupplierMaterialProposal } from "../types";
import { apiFetch } from "../services/api";
import { getErrorMessage } from "../services/logger";
import type { ShowToast } from "./useProjects";
import { usePolledFetch } from "./usePolledFetch";

export function useProveedores(authToken: string, showToast: ShowToast) {
  const { data: proposals, setData: setProposals, isLoading, refresh: loadProposals } =
    usePolledFetch<SupplierMaterialProposal>({
      authToken,
      showToast,
      fetcher: useCallback(
        () => apiFetch<SupplierMaterialProposal[]>("/supplier-material-proposals", { token: authToken }),
        [authToken],
      ),
      getSignature: useCallback((data: SupplierMaterialProposal[]) => data.map(p => p.id).join("|"), []),
      errorMessage: "No se pudo cargar las propuestas de proveedores.",
      interval: 30000,
    });

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
        const message = getErrorMessage(err, "Error al enviar la invitación.");
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
