/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook de propuestas de materiales de proveedores. Extraído de
 * ProveedoresRegistrados: GET /supplier-material-proposals + POST /supplier-invitations.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { SupplierMaterialProposal } from "../types";
import { apiFetch } from "../services/api";
import type { ShowToast } from "./useProjects";
import { usePolling } from "./usePolling";

export function useProveedores(authToken: string, showToast: ShowToast) {
  const [proposals, setProposals] = useState<SupplierMaterialProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const lastSig = useRef("");

  const loadProposals = useCallback(async (opts?: { isPoll?: boolean }) => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await apiFetch<SupplierMaterialProposal[]>("/supplier-material-proposals", { token: authToken });
      const sig = data.map(p => p.id).join("|");
      if (opts?.isPoll && sig === lastSig.current) return; // dedupe: evita re-render cada tick
      lastSig.current = sig;
      setProposals(data);
    } catch (error) {
      if (opts?.isPoll) return; // silencioso en poll
      console.error(error);
      showToast("No se pudo cargar las propuestas de proveedores.", "error");
    } finally {
      if (!opts?.isPoll) setIsLoading(false);
    }
  }, [authToken, showToast]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  // Polling esencial: propuestas de proveedores (push externo vía portal público)
  usePolling(
    useCallback(() => loadProposals({ isPoll: true }), [loadProposals]),
    12000,
    !!authToken
  );

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
