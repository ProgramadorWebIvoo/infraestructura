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
  RECHAZADO_CIERRE: "RECHAZADO_CIERRE",
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
  /** Requerido: la condición del material siempre debe declararse. */
  condition: "NUEVO" | "USADO" | "AMBAS";
  /** Ambos o ninguno — sin garantía es warrantyValue/warrantyUnit undefined. */
  warrantyValue?: number;
  warrantyUnit?: "DIAS" | "MESES" | "ANOS";
  brand?: string;
  model?: string;
  specifications?: string;
  observations?: string;
}

export type ProposalOrigin = "MANUAL" | "RENEGOCIACION" | "PORTAL-PROV" | "SEED-INSERT";

export interface ProposalMaterialItem {
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  /** Presentes solo en propuestas importadas del portal de proveedores
   * (origen PORTAL-PROV) — ausentes en carga manual de Analistas. */
  conditionStatus?: "new" | "used" | "refurbished";
  technicalSpecs?: Record<string, string | number | boolean>;
  warrantyDescription?: string;
  warrantyValue?: number;
  warrantyUnit?: "dias" | "semanas" | "meses";
  /** Path relativo en storage, servido vía GET /supplier-proposal-images/{path}. */
  imagePath?: string;
}

export type ProposalDurationUnit = "dias" | "semanas" | "meses";

export interface Proposal {
  id: string;
  contractorCode: string;
  contractorName: string;
  contractorRating?: number;
  materialCost: number;
  /** Detalle línea por línea, igual al portal público del proveedor. Puede
   * faltar en propuestas antiguas cargadas antes de este campo. */
  materialItems?: ProposalMaterialItem[];
  /** ISO 4217, solo presente en propuestas importadas del portal (origen
   * PORTAL-PROV) — la carga manual siempre es en USD. */
  quoteCurrency?: string;
  laborCost: number;
  totalCost: number;
  deliveryWeeks: number;
  durationValue?: number;
  durationUnit?: ProposalDurationUnit;
  negotiatedAdvancePercent: number;
  description: string;
  origen: ProposalOrigin;
  fechaOferta: string;
  creadoPor?: string | null;
  precioAnterior?: number | null;
  precioNuevo?: number | null;
  diferencia?: number | null;
  /** Por qué se renegoció esta oferta (origen RENEGOCIACION). */
  motivo?: string | null;
  /** Distinto de `motivo`: por qué el anticipo negociado supera el máximo
   * configurado en CONFIG APP — puede darse a la vez que una renegociación. */
  motivoAnticipoExcedido?: string | null;
}

export interface ProjectDocument {
  id: number;
  documentType: "CALC" | "PLANO" | "FOTO" | "CORRECCION";
  originalName: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedBy?: number;
  uploadedAt?: string;
  documentGroupId: number;
  versionNumber: number;
  deletedAt?: string | null;
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
  dossierAiScore?: number;
  dossierAiSummary?: string;
  dossierAiAlerts?: string[];
  dossierAiRecommendation?: string;
  dossierAiSuggestedAmount?: number;
  dossierAiCompletenessFactors?: {
    documentation: number;
    budgetConsistency: number;
    rejectionRisk: number;
  };
  dossierAiProvider?: string;
  dossierAiEvaluatedAt?: string;
  /** Cache de la última Evaluación IA del cuadro comparativo (Procura). Se
   * invalida server-side ante cualquier cambio al conjunto de propuestas
   * (carga, renegociación, eliminación) — null si no hay evaluación vigente. */
  bidEvaluationAi?: {
    winnerContractorCode: string;
    winnerContractorName: string;
    confidenceScore: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    riskFactors: string[];
    recommendation: string;
    providerUsed: "chatgpt" | "gemini" | "claude";
    evaluatedAt: string;
  } | null;
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
  observations?: string;
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
  /** ISO 4217. Ausente = USD (comportamiento previo, sin cambios). */
  quoteCurrency?: string;
  conditionStatus?: "new" | "used" | "refurbished";
  /** Producto ya existente en el catálogo maestro; ausente = producto personalizado. */
  catalogProductId?: number;
  /** Características técnicas declaradas, según el spec_schema de la categoría elegida. */
  technicalSpecs?: Record<string, string | number | boolean>;
  warrantyDescription?: string;
  /** Valor+unidad van juntos o ninguno — sin garantía es warrantyValue/warrantyUnit undefined. */
  warrantyValue?: number;
  warrantyUnit?: "dias" | "semanas" | "meses";
  /** Path devuelto por POST /public/invitations/{token}/proposal-image, subida antes del submit final. */
  imagePath?: string;
}

export interface SupplierMaterialProposal {
  id: string;
  projectId: string;
  projectTitleSnapshot: string;
  supplierName: string;
  supplierCompany?: string;
  supplierContact: string;
  quoteCurrency?: string;
  items: SupplierMaterialProposalItem[];
  generalNotes?: string;
  estimatedDays?: number;
  durationUnit?: string;
  advancePercent?: number;
  /** Opcional, a nivel de todo el pedido (no por línea/material). */
  laborCost?: number;
  submittedAt: string;
}
