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

export interface SupplierInvitationInfo {
  token: string;
  projectTitle: string;
  expiresAt?: string;
  /**
   * Solo presente en la respuesta de fetchLatestInvitation() (GET
   * /supplier-invitations/latest) — handleInviteSupplier() (POST, recién
   * creado) no lo manda porque un enlace recién generado siempre es
   * "active". Distingue POR QUÉ un enlace ya no es válido (used/expired/
   * replaced) del caso "sigue vigente" (active), en vez de un genérico
   * "ya no disponible" que no le dice al usuario qué pasó realmente.
   */
  status?: "active" | "used" | "expired" | "replaced";
}

export function useProveedores(authToken: string, showToast: ShowToast) {
  // Polling cada 60s (en lugar de 30s) para reducir carga de servidor
  // Las propuestas de proveedores cambian lentamente (solo cuando se envía una nueva)
  const { data: proposals, setData: setProposals, isLoading, refresh: loadProposals } =
    usePolledFetch<SupplierMaterialProposal>({
      authToken,
      showToast,
      fetcher: useCallback(
        () => apiFetch<SupplierMaterialProposal[]>("/supplier-material-proposals"),
        [],
      ),
      getSignature: useCallback((data: SupplierMaterialProposal[]) => data.map(p => p.id).join("|"), []),
      errorMessage: "No se pudo cargar las propuestas de proveedores.",
      interval: 60_000, // 60 segundos (era 30s)
    });

  const handleInviteSupplier = useCallback(
    async (payload: {
      project_id: string;
      supplierName: string;
      supplierCompany: string | null;
      supplierContact: string;
    }): Promise<SupplierInvitationInfo> => {
      try {
        const sanitizedPayload = {
          ...payload,
          supplierName: sanitize(payload.supplierName),
          supplierCompany: payload.supplierCompany ? sanitize(payload.supplierCompany) : null,
          supplierContact: sanitize(payload.supplierContact),
        };
        const data = await apiFetch<SupplierInvitationInfo>("/supplier-invitations", {
          method: "POST",
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
    [showToast],
  );

  /**
   * Consulta la invitación vigente más reciente para un proveedor+obra, sin
   * crear una nueva — usado al abrir InviteModal para mostrar el enlace ya
   * generado en vez de forzar a regenerar uno cada vez. `null` si no hay
   * ninguna vigente (nunca se generó, o la última expiró/fue usada).
   */
  const fetchLatestInvitation = useCallback(
    async (projectId: string, supplierContact: string): Promise<SupplierInvitationInfo | null> => {
      try {
        // apiFetch ya desenvuelve el `.data` de nivel superior (convención
        // Laravel) — acá ese `.data` desenvuelto ES directamente el objeto
        // (o null), no un wrapper adicional.
        return await apiFetch<SupplierInvitationInfo | null>(
          `/supplier-invitations/latest?project_id=${encodeURIComponent(projectId)}&supplierContact=${encodeURIComponent(supplierContact)}`,
        );
      } catch {
        return null;
      }
    },
    [],
  );

  return {
    proposals,
    isLoadingProposals: isLoading,
    loadProposals,
    handleInviteSupplier,
    fetchLatestInvitation,
  };
}
