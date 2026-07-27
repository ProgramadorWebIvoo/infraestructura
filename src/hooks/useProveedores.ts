/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook de propuestas de materiales de proveedores. Extraído de
 * ProveedoresRegistrados: GET /supplier-material-proposals + POST /supplier-invitations.
 */

import { useCallback } from "react";
import DOMPurify from "dompurify";
import type { SupplierMaterialProposal } from "../types";
import { apiFetch } from "../services/api";
import { getErrorMessage } from "../services/logger";
import type { ShowToast } from "./useProjects";
import { usePolledFetch } from "./usePolledFetch";

// Sin tags/atributos permitidos: son campos de texto plano (nombre, contacto),
// nunca deberían contener HTML. Mitiga XSS almacenado si el backend alguna
// vez renderiza estos valores fuera de un contexto que escape por defecto
// (ej. plantillas de email, PDFs, dangerouslySetInnerHTML).
const sanitize = (value: string) => DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

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
    });

  const handleInviteSupplier = useCallback(
    async (payload: {
      project_id: string;
      supplierName: string;
      supplierCompany: string | null;
      supplierContact: string;
    }): Promise<{ token: string; projectTitle: string }> => {
      try {
        const sanitizedPayload = {
          ...payload,
          supplierName: sanitize(payload.supplierName),
          supplierCompany: payload.supplierCompany ? sanitize(payload.supplierCompany) : null,
          supplierContact: sanitize(payload.supplierContact),
        };
        const data = await apiFetch<{ token: string; projectTitle: string }>("/supplier-invitations", {
          method: "POST",
          token: authToken,
          body: JSON.stringify(sanitizedPayload),
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
