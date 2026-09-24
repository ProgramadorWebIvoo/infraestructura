/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contrato de GET /project-history y GET /project-history/{id} (Histórico de Obras).
 * Montos en moneda base (USD). `null` en approved = obra sin aprobar (sin fallback al estimado).
 */

export interface ProjectHistoryFigures {
  estimated: number | null;
  approved: number | null;
  awarded: number | null;
  executed: number;
  executionPercent: number | null;
  variation: {
    approvedVsEstimated: number | null;
    awardedVsApproved: number | null;
    executedVsAwarded: number | null;
    executedVsApproved: number | null;
  };
  flags: {
    unapproved: boolean;
    awardedExceedsApproved: boolean;
    executedExceedsAwarded: boolean;
    executedExceedsApproved: boolean;
  };
}

export interface ProjectHistoryRow {
  id: string;
  title: string;
  type: string;
  location: string | null;
  status: string;
  createdDate: string | null;
  figures: ProjectHistoryFigures;
}

export interface ProjectHistoryPage {
  items: ProjectHistoryRow[];
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
}

export interface ProjectHistoryListFilters {
  q: string;
  status: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  withAlerts: boolean;
}

export type HistoryStageKey = "obra" | "presupuesto" | "solicitud" | "proveedores" | "adjudicacion" | "pagos" | "planos" | "cierre";

export interface HistoryStage {
  key: HistoryStageKey;
  label: string;
  state: "done" | "current" | "pending";
}

export interface HistoryBudgetLine {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  estimatedUnitPrice: number;
  estimatedSubtotal: number;
  condition: string | null;
  brand: string | null;
  catalogProduct: { id: number; name: string } | null;
}

export interface HistorySupplierItem {
  materialName: string | null;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  catalogProductId: number | null;
}

export interface HistorySupplier {
  id: string;
  contractorCode: string;
  contractorName: string | null;
  origen: string | null;
  fechaOferta: string | null;
  createdBy: string | null;
  quoteCurrency: string;
  materialCost: number;
  laborCost: number;
  totalCost: number;
  negotiatedAdvancePercent: number | null;
  deliveryWeeks: number | null;
  precioAnterior: number | null;
  precioNuevo: number | null;
  diferencia: number | null;
  motivo: string | null;
  isAwarded: boolean;
  replacedById: string | null;
  isRemoved: boolean;
  items: HistorySupplierItem[];
}

export interface HistoryRateFreeze {
  trigger: string;
  baseCurrency: string;
  frozenRate: number | null;
  frozenAmountBase: number | null;
  frozenAt: string | null;
  source: string;
}

export interface HistoryAward {
  proposalId: string;
  contractorCode: string;
  contractorName: string | null;
  totalCost: number;
  negotiatedAdvancePercent: number | null;
  origen: string | null;
  rateFreezes: HistoryRateFreeze[];
}

export interface HistoryPayment {
  id: number;
  type: "ADVANCE" | "FINAL" | string;
  amount: number;
  currency: string;
  paidDate: string | null;
  bank: string | null;
  reference: string | null;
  notes: string | null;
  proposalId: string | null;
  proof: { id: number; name: string } | null;
}

export interface HistoryDrawingVersion {
  id: number;
  version: number;
  name: string;
  uploadedBy: string | null;
  uploadedAt: string | null;
  isDeleted: boolean;
}

export interface HistoryDrawing {
  groupId: number;
  type: "PLANO" | "CALC" | "CORRECCION" | string;
  name: string;
  currentVersion: number | null;
  versions: HistoryDrawingVersion[];
}

export interface HistoryTimelineEvent {
  id: string;
  at: string | null;
  role: string;
  user: string | null;
  action: string;
  details: string | null;
  observations: string | null;
}

export interface ProjectHistoryDetail {
  project: {
    id: string;
    title: string;
    type: string;
    description: string | null;
    location: string | null;
    status: string;
    createdDate: string | null;
  };
  figures: ProjectHistoryFigures;
  stages: HistoryStage[];
  budget: { lines: HistoryBudgetLine[]; linesTotal: number };
  request: {
    createdDate: string | null;
    createdBy: string | null;
    reviewNotes: string | null;
    procuraNotes: string | null;
    dossierAiScore: number | null;
  };
  suppliers: HistorySupplier[];
  award: HistoryAward | null;
  payments: { items: HistoryPayment[]; total: number; percentOfAwarded: number | null; withoutProof: number };
  drawings: HistoryDrawing[];
  closure: { isClosed: boolean; qualityVerified: boolean; completionVerifiedDate: string | null; reevaluations: number };
  timeline: HistoryTimelineEvent[];
}
