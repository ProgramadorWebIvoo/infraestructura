import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Project } from "@/types";
import { computeDashboardSummary } from "@/utils/dashboardSummary";

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));
vi.mock("@/hooks/useCurrencyConversion", () => ({
  useCurrencyConversion: () => ({ convert: (n: number) => n, hasRates: false, isLoading: false }),
  formatBs: (n: number) => String(n),
}));

const stalledEntry = { id: "PRJ-002", title: "Reparación cubierta", status: "EN_EJECUCION", daysSinceUpdate: 30, createdDate: "2026-08-01" };
vi.mock("@/hooks/useDashboardSummary", () => ({
  useDashboardSummary: () => ({
    summary: { ...computeDashboardSummary([]), stalledProjects: [stalledEntry] },
    isExact: true,
    isLoading: false,
    lastSync: null,
  }),
}));

// Secciones pesadas y ajenas a esta integración: se sustituyen por stubs.
vi.mock("@/views/PresidenciaDashboard/components/KpiSection", () => ({ default: () => <div>kpi-section</div> }));
vi.mock("@/views/PresidenciaDashboard/components/DistributionChart", () => ({ default: () => <div>distribution</div> }));
vi.mock("@/views/PresidenciaDashboard/components/StatusFunnelSection", () => ({ default: () => <div>funnel</div> }));
vi.mock("@/views/PresidenciaDashboard/components/FinancialOverviewSection", () => ({ default: () => <div>financial</div> }));
vi.mock("@/views/PresidenciaDashboard/components/PipelineHealthSection", () => ({ default: () => <div>pipeline</div> }));
vi.mock("@/views/PresidenciaDashboard/components/CashFlowSection", () => ({ default: () => <div>cashflow</div> }));
vi.mock("@/views/PresidenciaDashboard/components/InsightsSection", () => ({ default: () => <div>insights</div> }));
vi.mock("@/views/PresidenciaDashboard/components/AuditLogSection", () => ({ default: () => <div>audit-section</div> }));

import PresidenciaDashboard from "@/views/PresidenciaDashboard";

const project = {
  id: "PRJ-002", title: "Reparación cubierta", type: "INFRAESTRUCTURA", description: "d", location: "Caracas", createdDate: "2026-08-01",
  status: "EN_EJECUCION", estimatedTotal: 1400, materials: [], proposals: [], documents: [], approvedInvestmentAmount: 2200,
} as unknown as Project;

const detail = {
  project: { id: "PRJ-002", title: "Reparación cubierta", type: "INFRAESTRUCTURA", description: null, location: "Caracas", status: "EN_EJECUCION", createdDate: "2026-08-01" },
  figures: {
    estimated: 1400, approved: 2200, awarded: null, executed: 0, executionPercent: 0,
    variation: { approvedVsEstimated: 57, awardedVsApproved: null, executedVsAwarded: null, executedVsApproved: -100 },
    flags: { unapproved: false, awardedExceedsApproved: false, executedExceedsAwarded: false, executedExceedsApproved: false },
  },
  stages: [{ key: "obra", label: "Obra", state: "done" }],
  budget: { lines: [], linesTotal: 0 },
  request: { createdDate: "2026-08-01", createdBy: "Infra", reviewNotes: null, procuraNotes: null, dossierAiScore: null },
  suppliers: [], award: null,
  payments: { items: [], total: 0, percentOfAwarded: null, withoutProof: 0 },
  drawings: [], closure: { isClosed: false, qualityVerified: false, completionVerifiedDate: null, reevaluations: 0 }, timeline: [],
};

function renderDashboard(projects: Project[] = [project]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PresidenciaDashboard projects={projects} auditLogs={[]} authToken="token" />
    </QueryClientProvider>,
  );
}

describe("PresidenciaDashboard — Histórico de Obras reemplaza al Master", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockImplementation((path: string) => {
      if (path.startsWith("/project-history/PRJ-002")) return Promise.resolve(detail);
      return Promise.resolve({ items: [], currentPage: 1, lastPage: 1, total: 0, perPage: 15 });
    });
  });

  it("ofrece Estadísticas, Histórico de Obras y Auditoría, y ya no el Master de Obras", () => {
    renderDashboard();

    const tabs = within(screen.getByRole("tablist", { name: "Secciones de Presidencia" })).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent?.replace(/\d+$/, "").trim())).toEqual(["Estadísticas", "Histórico de Obras", "Auditoría"]);
    expect(screen.queryByText(/master de obras/i)).not.toBeInTheDocument();
  });

  it("no consulta el histórico hasta que se abre su pestaña", async () => {
    const user = userEvent.setup();
    renderDashboard();
    expect(mockApiFetch).not.toHaveBeenCalled();

    await user.click(screen.getByRole("tab", { name: /Histórico de Obras/ }));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining("/project-history?"), expect.anything()));
  });

  it("'Inspeccionar' en obras estancadas cambia a Histórico y abre el detalle de esa obra", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole("button", { name: /inspeccionar/i }));

    expect(screen.getByRole("tab", { name: /Histórico de Obras/ })).toHaveAttribute("aria-selected", "true");
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Solicitud creada")).toBeInTheDocument();
    expect(mockApiFetch).toHaveBeenCalledWith("/project-history/PRJ-002", expect.anything());
  });

  it("'Inspeccionar' queda deshabilitado si la obra estancada no está cargada en la sesión", () => {
    renderDashboard([]);

    expect(screen.getByRole("button", { name: /inspeccionar/i })).toBeDisabled();
  });

  it("al cerrar el detalle se queda en el Histórico y se puede reabrir la misma obra desde estancadas", async () => {
    const user = userEvent.setup();
    renderDashboard();
    await user.click(screen.getByRole("button", { name: /inspeccionar/i }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Solicitud creada");

    await user.click(within(dialog).getByRole("button", { name: /cerrar/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("tab", { name: /Histórico de Obras/ })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: /Estadísticas/ }));
    await user.click(screen.getByRole("button", { name: /inspeccionar/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
