/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ProjectStatus {
  CREADO = "CREADO", // Created by Infraestructura/Mantenimiento, waiting for Cierre de Obra
  REVISADO_CIERRE = "REVISADO_CIERRE", // Reviewed and corrected by Cierre de Obra, waiting for Procura
  CONFIRMADO_PROCURA = "CONFIRMADO_PROCURA", // Confirmed by Procura, sent to Analysts
  COMPARATIVA_ENVIADA = "COMPARATIVA_ENVIADA", // Analysts compiled comparative proposals, waiting for Procura winner selection
  CONTRATADO = "CONTRATADO", // Winner contractor selected, waiting for Finanzas advance payment
  EN_EJECUCION = "EN_EJECUCION", // Advance paid, work is active
  VERIFICANDO_FINALIZACION = "VERIFICANDO_FINALIZACION", // Work finished, waiting for Cierre de Obra quality check
  LISTO_PAGO_FINAL = "LISTO_PAGO_FINAL", // Quality checked by Cierre de Obra, waiting for Finanzas final payment
  COMPLETADO_PAGADO = "COMPLETADO_PAGADO", // Fully completed and paid
}

export interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
}

export interface Contractor {
  code: string;
  name: string;
  specialty: string;
  rating: number;
  contact: string;
}

export interface Proposal {
  id: string;
  contractorCode: string;
  contractorName: string;
  contractorRating: number; // 1.0–5.0, tomado de Contractor.rating al crear la propuesta
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

  // Material requirements
  materials: MaterialItem[];
  estimatedTotal: number;

  // Cierre de Obra calculations & files
  cierreObraNotes?: string;
  calculationsAdded?: boolean;
  blueprintsCount?: number;
  documents?: ProjectDocument[];
  
  // Procura review
  procuraReviewNotes?: string;
  approvedInvestmentAmount?: number;
  
  // Bidding & Analyst comparison
  proposals?: Proposal[];
  selectedContractorCode?: string;
  selectedProposalId?: string;
  
  // Finanzas tracking
  advancePaidAmount?: number;
  advancePaidDate?: string;
  finalPaidAmount?: number;
  finalPaidDate?: string;
  
  // Completion audit (Cierre de Obra)
  qualityVerified?: boolean;
  completionVerifiedDate?: string;
}

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
  submittedAt: string;
}

export interface AuditLog {
  id: string;
  projectId: string;
  projectTitle: string;
  role: "PRESIDENCIA" | "INFRAESTRUCTURA" | "CIERRE_DE_OBRA" | "PROCURA" | "ANALISTA" | "FINANZAS" | "SISTEMA";
  userName?: string;
  action: string;
  timestamp: string;
  details?: string;
}
