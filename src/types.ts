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
import type { Contractor } from "@ivoo/shared";

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

// ---------------------------------------------------------------------------
// Histórico de proveedor (GET /api/contractors/{code}/history)
// ---------------------------------------------------------------------------

export interface ContractorHistoryMonthEntry {
  month: string; // 'YYYY-MM'
  quoteCount: number;
  avgPriceUsd: number | null;
}

export interface ContractorHistoryTopProduct {
  catalogProductId: number;
  productName: string;
  quoteCount: number;
  lastPriceUsd: number;
  variationPercent: number;
}

export interface ContractorHistoryStats {
  contractorCode: string;
  contractorName: string | null;
  rating: number | null;
  totalQuoteCount: number;
  distinctProductCount: number;
  trendPercent: number | null;
  periodMonths: number;
}

export interface ContractorHistory {
  monthlySeries: ContractorHistoryMonthEntry[];
  topProducts: ContractorHistoryTopProduct[];
  stats: ContractorHistoryStats;
}

// ---------------------------------------------------------------------------
// Catálogo maestro (GET /api/catalog/products, /catalog-categories, /exchange-rates)
// ---------------------------------------------------------------------------

export interface CatalogSpecSchemaField {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  unit?: string;
  required?: boolean;
  options?: string[];
}

export interface CatalogCategory {
  id: number;
  name: string;
  parent_id: number | null;
  spec_schema: CatalogSpecSchemaField[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface CatalogProductSupplierLink {
  id: number;
  catalog_product_id: number;
  supplier_code: string;
  last_quoted_at: string;
  last_quoted_price_usd: number;
  quote_count: number;
  supplier?: Contractor;
}

export interface CatalogProduct {
  id: number;
  name: string;
  unit: string;
  estimated_unit_price: number;
  is_active: boolean;
  category_id: number | null;
  normalized_specs: Record<string, string | number | boolean> | null;
  is_custom_origin: boolean;
  category?: CatalogCategory;
  suppliers?: CatalogProductSupplierLink[];
  created_at?: string;
  updated_at?: string;
}

export interface CatalogProductPriceHistoryEntry {
  id: number;
  catalog_product_id: number;
  supplier_code: string;
  price_usd: number;
  original_currency: string;
  original_price: number;
  fx_rate_to_usd: number;
  fx_rate_source: string;
  quoted_at: string;
}

export interface PendingCustomProductLine {
  id: number;
  supplier_material_proposal_id: string;
  catalog_product_id: number;
  custom_product_name: string | null;
  condition_status: string;
  quote_currency: string;
  unit_price: number;
  unit_price_usd: number;
  quantity: number;
  unit: string;
  created_at: string;
  catalogProduct?: CatalogProduct;
  proposal?: {
    id: string;
    supplier_name: string;
    supplier_company: string | null;
    project_id: string;
    submitted_at: string;
  };
}

export interface ExchangeRateEntry {
  id: number;
  currency_code: string;
  rate_to_usd: number;
  source: string;
  effective_at: string;
  currencyName?: string;
}

export interface AdminCurrency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  is_base: boolean;
  is_active: boolean;
}

export interface BaseCurrency {
  code: string;
  name: string;
  symbol: string;
  /** null si la base cambió a una moneda sin tasa de cambio cargada todavía. */
  rateToUsd: number | null;
}

interface LaravelPaginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export type CatalogProductsResponse = LaravelPaginated<CatalogProduct>;
export type PendingCustomProductsResponse = LaravelPaginated<PendingCustomProductLine>;
