import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  ProjectHistoryDetail,
  ProjectHistoryFigures,
  ProjectHistoryPage,
} from "@/views/PresidenciaDashboard/projectHistoryTypes";

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));
vi.mock("@/hooks/useCurrencyConversion", () => ({
  useCurrencyConversion: () => ({ convert: (n: number) => n * 10, hasRates: false, isLoading: false }),
  formatBs: (n: number) => String(n),
}));

import ProjectHistorySection from "@/views/PresidenciaDashboard/components/ProjectHistorySection";

const figures = (over: Partial<ProjectHistoryFigures> = {}, flags: Partial<ProjectHistoryFigures["flags"]> = {}): ProjectHistoryFigures => ({
  estimated: 1400,
  approved: 2200,
  awarded: 1940,
  executed: 2100,
  executionPercent: 95.45,
  variation: { approvedVsEstimated: 57.14, awardedVsApproved: -11.82, executedVsAwarded: 8.25, executedVsApproved: -4.55 },
  flags: { unapproved: false, awardedExceedsApproved: false, executedExceedsAwarded: true, executedExceedsApproved: false, ...flags },
  ...over,
});

const page: ProjectHistoryPage = {
  currentPage: 1,
  lastPage: 1,
  total: 2,
  perPage: 15,
  items: [
    { id: "PRJ-002", title: "Reparación cubierta", type: "INFRAESTRUCTURA", location: "Caracas", status: "COMPLETADO_PAGADO", createdDate: "2026-09-24", figures: figures() },
    {
      id: "PRJ-004", title: "Pintura fachada", type: "MANTENIMIENTO", location: null, status: "CREADO", createdDate: "2026-09-24",
      figures: figures({ approved: null, awarded: null, executed: 0, executionPercent: null }, { unapproved: true, executedExceedsAwarded: false }),
    },
  ],
};

const detail: ProjectHistoryDetail = {
  project: { id: "PRJ-002", title: "Reparación cubierta", type: "INFRAESTRUCTURA", description: null, location: "Caracas", status: "COMPLETADO_PAGADO", createdDate: "2026-09-24" },
  figures: figures(),
  stages: [
    { key: "obra", label: "Obra", state: "done" },
    { key: "pagos", label: "Pagos", state: "done" },
    { key: "cierre", label: "Cierre", state: "done" },
  ],
  budget: { lines: [{ id: "m1", name: "Cemento", quantity: 100, unit: "saco", estimatedUnitPrice: 8, estimatedSubtotal: 800, condition: null, brand: null, catalogProduct: { id: 1, name: "Cemento Portland" } }], linesTotal: 800 },
  request: { createdDate: "2026-09-24", createdBy: "Infra", reviewNotes: null, procuraNotes: null, dossierAiScore: null },
  suppliers: [
    { id: "P1", contractorCode: "CON-301", contractorName: "TestRif", origen: "MANUAL", fechaOferta: "2026-09-10", createdBy: null, quoteCurrency: "USD", materialCost: 1, laborCost: 1, totalCost: 2050, negotiatedAdvancePercent: 30, deliveryWeeks: 4, precioAnterior: null, precioNuevo: null, diferencia: null, motivo: null, isAwarded: false, replacedById: "P2", isRemoved: false, items: [] },
    { id: "P2", contractorCode: "CON-301", contractorName: "TestRif", origen: "RENEGOCIACION", fechaOferta: "2026-09-15", createdBy: null, quoteCurrency: "USD", materialCost: 1, laborCost: 1, totalCost: 1940, negotiatedAdvancePercent: 30, deliveryWeeks: 4, precioAnterior: 2050, precioNuevo: 1940, diferencia: -110, motivo: "Volumen", isAwarded: true, replacedById: null, isRemoved: false, items: [] },
  ],
  award: { proposalId: "P2", contractorCode: "CON-301", contractorName: "TestRif", totalCost: 1940, negotiatedAdvancePercent: 30, origen: "RENEGOCIACION", rateFreezes: [] },
  payments: {
    items: [
      { id: 1, type: "ADVANCE", amount: 600, currency: "USD", paidDate: "2026-09-24", bank: "Banesco", reference: "REF-1", notes: null, proposalId: "P2", proof: { id: 5, name: "comp_ant.pdf" } },
      { id: 2, type: "FINAL", amount: 1500, currency: "USD", paidDate: "2026-09-24", bank: null, reference: null, notes: null, proposalId: "P2", proof: null },
    ],
    total: 2100,
    percentOfAwarded: 108.25,
    withoutProof: 1,
  },
  drawings: [
    { groupId: 4, type: "PLANO", name: "plano_v2.pdf", currentVersion: 2, versions: [
      { id: 4, version: 1, name: "plano_v1.pdf", uploadedBy: "Infra", uploadedAt: "2026-09-24T10:00:00Z", isDeleted: false },
      { id: 6, version: 2, name: "plano_v2.pdf", uploadedBy: "Infra", uploadedAt: "2026-09-24T11:00:00Z", isDeleted: false },
    ] },
  ],
  closure: { isClosed: true, qualityVerified: true, completionVerifiedDate: "2026-09-22", reevaluations: 0 },
  timeline: [{ id: "L1", at: "2026-09-24T10:00:00Z", role: "INFRAESTRUCTURA", user: "Infra", action: "Creacion de peticion de obra", details: null, observations: null }],
};

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProjectHistorySection authToken="token" />
    </QueryClientProvider>,
  );
}

describe("ProjectHistorySection", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockImplementation((path: string) => {
      if (path.startsWith("/project-history/PRJ-002")) return Promise.resolve(detail);
      return Promise.resolve(page);
    });
  });

  it("lista las obras con estimado, aprobado, adjudicado y ejecutado", async () => {
    renderSection();

    expect(await screen.findByText("Reparación cubierta")).toBeInTheDocument();
    expect(screen.getByText("Pintura fachada")).toBeInTheDocument();
    expect(screen.getByText("Sin aprobar")).toBeInTheDocument();
    expect(screen.getAllByText("$1,400.00")).toHaveLength(2);
    expect(screen.getByText("$2,200.00")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Con alertas de presupuesto")).toHaveLength(1);
  });

  it("envía los filtros al backend y vuelve a la página 1", async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByText("Reparación cubierta");

    await user.click(screen.getByLabelText(/solo con alertas/i));
    await waitFor(() => expect(mockApiFetch.mock.calls.some(([p]) => String(p).includes("withAlerts=1"))).toBe(true));

    await user.type(screen.getByLabelText("Buscar obras en el histórico"), "cubierta");
    await waitFor(() => expect(mockApiFetch.mock.calls.some(([p]) => String(p).includes("q=cubierta"))).toBe(true), { timeout: 2000 });
  });

  it("muestra un mensaje cuando el backend falla", async () => {
    mockApiFetch.mockRejectedValue(new Error("boom"));
    renderSection();

    expect(await screen.findByText(/no se pudo cargar el histórico/i)).toBeInTheDocument();
  });

  it("abre el detalle con cifras, alertas, pagos sin comprobante y versiones de planos", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(await screen.findByText("Reparación cubierta"));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Lo pagado supera lo adjudicado.")).toBeInTheDocument();
    expect(within(dialog).getByText("Estimado")).toBeInTheDocument();
    expect(within(dialog).getByText("Aprobado")).toBeInTheDocument();
    expect(within(dialog).getByText("Adjudicado")).toBeInTheDocument();
    expect(within(dialog).getByText("Ejecutado")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("tab", { name: /Proveedores y adjudicación/ }));
    expect(within(dialog).getByText("Renegociada")).toBeInTheDocument();
    expect(within(dialog).getByText("Adjudicada")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("tab", { name: /Pagos/ }));
    expect(within(dialog).getByText("comp_ant.pdf")).toBeInTheDocument();
    expect(within(dialog).getByText("Sin comprobante")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("tab", { name: /Planos y cierre/ }));
    expect(within(dialog).getByText(/plano_v1\.pdf/)).toBeInTheDocument();
    expect(within(dialog).getByText(/vigente: V2/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Obra completada y pagada/)).toBeInTheDocument();
  });
});
