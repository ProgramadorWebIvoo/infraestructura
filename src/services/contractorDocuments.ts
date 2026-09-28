/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Biblioteca documental del proveedor (F4 Bloque A): tipos, llamadas API y
 * helpers de FormData compartidos por el registro público, el alta interna y
 * la sección de documentos de los modales de proveedor.
 */

import { apiDownload, apiFetch } from "@/services/api";

export interface ContractorDocumentType {
  id: number;
  key: string;
  label: string;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  documentsCount?: number;
}

export interface ContractorDocument {
  id: number;
  contractorCode: string;
  documentTypeId: number;
  documentTypeKey?: string;
  documentTypeLabel?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  versionNumber: number;
  documentGroupId: number;
  source: "PUBLIC_PORTAL" | "INTERNAL";
  uploadedBy: number | null;
  uploadedAt: string;
  deletedAt: string | null;
}

export interface ContractorDocumentCompleteness {
  complete: boolean;
  missing: Array<{ id: number; key: string; label: string }>;
}

export const CONTRACTOR_DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png";
export const CONTRACTOR_DOCUMENT_EXTENSIONS_LABEL = "PDF, JPG o PNG";
export const CONTRACTOR_DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;

/** Roles que pueden cargar, reemplazar y eliminar documentos (espejo de las rutas del backend). */
const DOCUMENT_MANAGER_ROLES = ["ADMIN", "SUPERADMIN", "CATALOGOS"];

export function canManageContractorDocuments(role?: string): boolean {
  return !!role && DOCUMENT_MANAGER_ROLES.includes(role);
}

/** Tipos activos que el formulario de registro debe pedir (endpoint público, cacheado en backend). */
export async function fetchPublicDocumentTypes(): Promise<ContractorDocumentType[]> {
  // apiFetch ya desenvuelve `data` (convención Laravel).
  const types = await apiFetch<ContractorDocumentType[]>("/public/contractor-document-types");
  return types ?? [];
}

export async function fetchContractorDocuments(
  code: string,
  token: string,
): Promise<{ documents: ContractorDocument[]; completeness: ContractorDocumentCompleteness }> {
  return apiFetch(`/contractors/${encodeURIComponent(code)}/documents`, { token });
}

export async function uploadContractorDocument(code: string, documentTypeId: number, file: File, token: string): Promise<ContractorDocument> {
  const form = new FormData();
  form.append("document_type_id", String(documentTypeId));
  form.append("file", file);
  return apiFetch<ContractorDocument>(`/contractors/${encodeURIComponent(code)}/documents`, {
    method: "POST",
    token,
    body: form,
  });
}

export async function deleteContractorDocument(code: string, documentId: number, token: string): Promise<void> {
  await apiFetch(`/contractors/${encodeURIComponent(code)}/documents/${documentId}`, { method: "DELETE", token });
}

export function contractorDocumentPath(code: string, documentId: number): string {
  return `/contractors/${encodeURIComponent(code)}/documents/${documentId}/download`;
}

/** Descarga con sesión (blob) y dispara el guardado; lanza si falla. */
export async function downloadContractorDocument(code: string, doc: Pick<ContractorDocument, "id" | "originalName">, token: string): Promise<void> {
  const blob = await apiDownload(contractorDocumentPath(code, doc.id), { token });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.originalName;
  a.click();
  URL.revokeObjectURL(url);
}

/** Tipos obligatorios que aún no tienen archivo seleccionado. */
export function missingRequiredTypes(types: ContractorDocumentType[], files: Record<number, File | undefined>): ContractorDocumentType[] {
  return types.filter((t) => t.isRequired && !files[t.id]);
}

/** Arma el multipart del alta de proveedor: campos de texto (sin nulos) + `documents[<typeId>]`. */
export function buildContractorFormData(fields: Record<string, string | number | null | undefined>, files: Record<number, File | undefined>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined) form.append(key, String(value));
  }
  for (const [typeId, file] of Object.entries(files)) {
    if (file) form.append(`documents[${typeId}]`, file);
  }
  return form;
}
