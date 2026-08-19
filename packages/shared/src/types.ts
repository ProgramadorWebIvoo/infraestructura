/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tipos compartidos entre web (src/) y mobile/.
 * NO incluir aquí tipos específicos de UI o plataforma.
 */

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export const ProjectStatus = {
  CREADO: "CREADO",
  REVISADO_CIERRE: "REVISADO_CIERRE",
  CONFIRMADO_PROCURA: "CONFIRMADO_PROCURA",
  COMPARATIVA_ENVIADA: "COMPARATIVA_ENVIADA",
  CONTRATADO: "CONTRATADO",
  EN_EJECUCION: "EN_EJECUCION",
  VERIFICANDO_FINALIZACION: "VERIFICANDO_FINALIZACION",
  LISTO_PAGO_FINAL: "LISTO_PAGO_FINAL",
  COMPLETADO_PAGADO: "COMPLETADO_PAGADO",
} as const;

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export interface MaterialItem {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
}

export interface Proposal {
  id: string;
  contractorCode: string;
  contractorName: string;
  contractorRating?: number;
  materialCost: number;
  laborCost: number;
  totalCost: number;
  deliveryWeeks: number;
  negotiatedAdvancePercent: number;
  description: string;
}

export interface ProjectDocument {
  id: number;
  documentType: "CALC" | "PLANO";
  originalName: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedAt?: string;
}

export interface Project {
  id: string;
  title: string;
  type: "INFRAESTRUCTURA" | "MANTENIMIENTO";
  description: string;
  location: string;
  createdDate: string;
  status: ProjectStatus;
  createdAt?: string;
  updatedAt?: string;
  materials: MaterialItem[];
  estimatedTotal: number;
  cierreObraNotes?: string;
  calculationsAdded?: boolean;
  blueprintsCount?: number;
  documents?: ProjectDocument[];
  procuraReviewNotes?: string;
  approvedInvestmentAmount?: number;
  proposals?: Proposal[];
  selectedContractorCode?: string;
  selectedProposalId?: string;
  advancePaidAmount?: number;
  advancePaidDate?: string;
  finalPaidAmount?: number;
  finalPaidDate?: string;
  qualityVerified?: boolean;
  completionVerifiedDate?: string;
}

// ---------------------------------------------------------------------------
// Contractor
// ---------------------------------------------------------------------------

export interface Contractor {
  code: string;
  name: string;
  specialty: string;
  rating: number;
  email: string;
  phone?: string | null;
  status?: string;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export interface AuditLog {
  id: string;
  projectId: string;
  projectTitle: string;
  role: string;
  userName?: string;
  action: string;
  timestamp: string;
  details?: string;
}

// ---------------------------------------------------------------------------
// Supplier material proposal (portal público)
// ---------------------------------------------------------------------------

export interface SupplierMaterialProposalItem {
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface SupplierMaterialProposal {
  id: string;
  projectId: string;
  projectTitleSnapshot: string;
  supplierName: string;
  supplierCompany?: string;
  supplierContact: string;
  items: SupplierMaterialProposalItem[];
  generalNotes?: string;
  estimatedDays?: number;
  durationUnit?: string;
  advancePercent?: number;
  submittedAt: string;
}
