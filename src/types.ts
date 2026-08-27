/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Re-exporta todos los tipos compartidos desde @ivoo/shared.
 * Los tipos específicos de web se definen aquí mismo.
 */

export { ProjectStatus } from "@ivoo/shared";
export type {
  MaterialItem,
  Proposal,
  ProposalMaterialItem,
  ProposalDurationUnit,
  ProposalOrigin,
  ProjectDocument,
  Project,
  Contractor,
  AuditLog,
  SupplierMaterialProposalItem,
  SupplierMaterialProposal,
} from "@ivoo/shared";

// ---------------------------------------------------------------------------
// Dashboard ejecutivo de Presidencia (GET /api/dashboard/summary)
// ---------------------------------------------------------------------------

export interface DashboardSummaryFunnelEntry {
  status: string;
  count: number;
  approvedAmount: number;
  committedAmount: number;
}

export interface DashboardSummaryTypeEntry {
  type: string;
  count: number;
  approvedAmount: number;
}

export interface DashboardSummaryLocationEntry {
  location: string;
  count: number;
  approvedAmount: number;
}

export interface DashboardSummaryMonthlyEntry {
  month: string;
  count: number;
}

export interface DashboardSummaryContractorEntry {
  contractorCode: string;
  contractorName: string;
  projectCount: number;
  totalAmount: number;
}

export interface AppNotification {
  id: number;
  project_id: string | null;
  project_title_snapshot: string | null;
  action: string;
  /** Taxonomía de 6 valores (ver App\Support\NotificationType en backend). */
  type: string;
  details: string | null;
  read_at: string | null;
  created_at: string;
}

export interface DashboardSummaryStalledEntry {
  id: string;
  title: string;
  status: string;
  daysSinceUpdate: number;
  createdDate: string;
}

export interface DashboardSummary {
  totalProjects: number;
  totalApprovedInvestment: number;
  totalReleasedFunds: number;
  totalCommittedAmount: number;
  pendingFunds: number;
  releasedPercent: number;
  excessReleased: number;
  funnel: DashboardSummaryFunnelEntry[];
  typeBreakdown: DashboardSummaryTypeEntry[];
  locationBreakdown: DashboardSummaryLocationEntry[];
  monthlyTrend: DashboardSummaryMonthlyEntry[];
  topContractors: DashboardSummaryContractorEntry[];
  stalledProjects: DashboardSummaryStalledEntry[];
  negotiationMetrics: {
    avgAdvancePercent: number;
    avgDeliveryWeeks: number;
  };
  updatedAt?: string;
}
