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
  REVISADO_AUDITORIA: "REVISADO_AUDITORIA",
  RECHAZADO_AUDITORIA: "RECHAZADO_AUDITORIA",
  EN_REEVALUACION_AUDITORIA: "EN_REEVALUACION_AUDITORIA",
  CONFIRMADO_PROCURA: "CONFIRMADO_PROCURA",
  COMPARATIVA_ENVIADA: "COMPARATIVA_ENVIADA",
  PENDIENTE_PRESIDENCIA: "PENDIENTE_PRESIDENCIA",
  APROBADO_PRESIDENCIA: "APROBADO_PRESIDENCIA",
  CONTRATADO: "CONTRATADO",
  EN_EJECUCION: "EN_EJECUCION",
  INFORME_ENVIADO: "INFORME_ENVIADO",
  VERIFICANDO_FINALIZACION: "VERIFICANDO_FINALIZACION",
  PENDIENTE_SOLICITUD_FINIQUITO: "PENDIENTE_SOLICITUD_FINIQUITO",
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

export interface ProposalAuditSnapshot {
  /** Timestamp exacto de fijación de la tasa (ISO 8601). */
  rateSnapshotAt?: string | null;
  /** Fuente de la tasa: "BCV", "MANUAL", "SISTEMA", etc. */
  rateSource?: string | null;
  /** Tasa EUR/Bs vigente al momento del snapshot (solo si quoteCurrency=EUR). */
  rateEurToBs?: number | null;
  /** Tasa USD/Bs vigente al momento del snapshot. */
  rateUsdToBs?: number | null;
  /** Monto calculado en Bs (quoteCurrency x rateEurToBs o rateUsdToBs). */
  amountInBs?: number | null;
}

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
  /**
   * Trazabilidad de conversión de moneda — todos null cuando la propuesta
   * ya estaba en la moneda base al importar (incluye carga manual). Cuando
   * el proveedor cotizó en otra moneda, materialCost/laborCost/totalCost de
   * arriba SIEMPRE están ya convertidos a la moneda base vigente; estos
   * campos preservan el monto ORIGINAL con el que el proveedor cotizó
   * realmente y la tasa exacta usada, para trazabilidad total y reversible
   * (nunca se pierde el dato original, y el histórico sigue siendo
   * interpretable aunque la moneda base cambie más adelante).
   */
  materialCostOriginal?: number | null;
  laborCostOriginal?: number | null;
  totalCostOriginal?: number | null;
  /** Tasa usada para convertir quoteCurrency -> baseCurrencyAtImport. */
  fxRateToBase?: number | null;
  /** Moneda base vigente en el momento del import — puede diferir de la base actual si esta cambió después. */
  baseCurrencyAtImport?: string | null;
  /** Snapshot auditable de tasas y fechas de fijación. */
  auditSnapshot?: ProposalAuditSnapshot | null;
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

/**
 * Snapshot inmutable de la tasa BCV de un proyecto en el momento de un
 * trigger de negocio (adjudicación, pago de anticipo, pago de finiquito) —
 * ver RateFreezeService (backend). `supersededById` no-null significa que
 * esta fila fue reemplazada por una corrección manual posterior y ya no es
 * la vigente para su trigger.
 */
export interface RateFreeze {
  id: number;
  trigger: "CONTRATADO" | "PAGO_ANTICIPO" | "PAGO_FINIQUITO";
  baseCurrency: string;
  /** Bs. por unidad de baseCurrency — null si no había tasa BCV cargada al momento de congelar. */
  frozenRate: number | null;
  frozenAmountBase: number | null;
  source: "AUTO" | "MANUAL";
  reason: string | null;
  frozenAt: string;
  frozenByName: string | null;
  supersededById: number | null;
}

export interface ProjectDocument {
  id: number;
  documentType: "CALC" | "PLANO" | "FOTO" | "CORRECCION" | "REEVALUACION" | "COMPROBANTE_ANTICIPO" | "COMPROBANTE_FINIQUITO";
  originalName: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedBy?: number;
  uploadedAt?: string;
  documentGroupId: number;
  versionNumber: number;
  deletedAt?: string | null;
  /** Solo presente en la respuesta de upload — true si el backend
   *  recomprimió/redimensionó la imagen antes de guardarla. */
  optimized?: boolean;
}

export interface Project {
  id: string;
  title: string;
  /** Catálogo real en GET /project-types (administrable, ver useProjectTypes). */
  type: string;
  description: string;
  location: string;
  createdDate: string;
  status: ProjectStatus;
  createdAt?: string;
  updatedAt?: string;
  materials: MaterialItem[];
  estimatedTotal: number;
  auditNotes?: string;
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
  /** Ingeniero residente / coordinador de mantenimiento asignado a la obra. */
  residentUserId?: number | null;
  residentName?: string | null;
  closureReportStatus?: string | null;
  closureReportRevision?: number | null;
  /** Finiquito propuesto por Auditoría (solo con el informe de cierre cargado). */
  finiquitoAmount?: number | null;
  /** Congelaciones de tasa de cambio — ver RateFreeze. Solo viene poblado cuando el backend carga la relación (detailRelations()). */
  rateFreezes?: RateFreeze[];
}

// ---------------------------------------------------------------------------
// Contractor
// ---------------------------------------------------------------------------

export interface Contractor {
  code: string;
  name: string;
  rif: string;
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
