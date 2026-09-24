import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Project } from "@/types";
import type {
  ProjectHistoryDetail,
  ProjectHistoryFigures,
  ProjectHistoryPage,
  ProjectHistoryRow,
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

const rowA: ProjectHistoryRow = {
  id: "PRJ-002", title: "Reparación cubierta", type: "INFRAESTRUCTURA", location: "Caracas", status: "COMPLETADO_PAGADO",
  createdDate: "2026-09-24", contractor: { code: "CON-301", name: "TestRif", rating: 4.5 }, figures: figures(),
};
const rowB: ProjectHistoryRow = {
  id: "PRJ-004", title: "Pintura fachada", type: "MANTENIMIENTO", location: null, status: "CREADO", createdDate: "2026-09-24",
  contractor: null, figures: figures({ approved: null, awarded: null, executed: 0, executionPercent: null }, { unapproved: true, executedExceedsAwarded: false }),
};

const page = (over: Partial<ProjectHistoryPage> = {}): ProjectHistoryPage => ({ currentPage: 1, lastPage: 1, total: 2, perPage: 15, items: [rowA, rowB], ...over });

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

/** Project de la sesión (lo que consumen organigrama y paso a paso). */
const sessionProject = {
  id: "PRJ-002", title: "Reparación cubierta", type: "INFRAESTRUCTURA", description: "d", location: "Caracas", createdDate: "2026-09-24",
  status: "COMPLETADO_PAGADO", estimatedTotal: 1400, materials: [], proposals: [], documents: [], blueprintsCount: 1, calculationsAdded: true,
  approvedInvestmentAmount: 2200, qualityVerified: true,
} as unknown as Project;

function Harness({ projects = [sessionProject], initialSelected = null, onSelectSpy }: { projects?: Project[]; initialSelected?: string | null; onSelectSpy?: (id: string | null) => void }) {
  const [selected, setSelected] = useState<string | null>(initialSelected);
  return (
    <ProjectHistorySection
      authToken="token"
      projects={projects}
      selectedId={selected}
      onSelect={(id) => { onSelectSpy?.(id); setSelected(id); }}
    />
  );
}

function renderSection(props: Parameters<typeof Harness>[0] = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Harness {...props} />
    </QueryClientProvider>,
  );
}

const paths = () => mockApiFetch.mock.calls.map(([p]) => String(p));

describe("ProjectHistorySection", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockImplementation((path: string) => {
      if (path.startsWith("/project-history/export")) return Promise.resolve({ items: [rowA, rowB] });
      if (path.startsWith("/project-history/PRJ-002")) return Promise.resolve(detail);
      return Promise.resolve(page());
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("lista las obras con proveedor, ubicación, estimado, aprobado, adjudicado y ejecutado", async () => {
    renderSection();

    expect(await screen.findByText("Reparación cubierta")).toBeInTheDocument();
    expect(screen.getByText("Pintura fachada")).toBeInTheDocument();
    expect(screen.getByText("Sin aprobar")).toBeInTheDocument();
    expect(screen.getByText("TestRif")).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("Sin contratar")).toBeInTheDocument();
    expect(screen.getByText("Caracas")).toBeInTheDocument();
    expect(screen.getAllByText("$1,400.00")).toHaveLength(2);
    expect(screen.getByText("$2,200.00")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Con alertas de presupuesto")).toHaveLength(1);
  });

  it("muestra un estado vacío cuando no hay obras", async () => {
    mockApiFetch.mockResolvedValue(page({ items: [], total: 0 }));
    renderSection();

    expect(await screen.findByText(/no hay obras que coincidan/i)).toBeInTheDocument();
  });

  it("muestra un mensaje cuando el backend falla", async () => {
    mockApiFetch.mockRejectedValue(new Error("boom"));
    renderSection();

    expect(await screen.findByText(/no se pudo cargar el histórico/i)).toBeInTheDocument();
  });

  it("envía búsqueda, alertas y tipo al backend, y 'Limpiar filtros' los quita", async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByText("Reparación cubierta");

    await user.click(screen.getByLabelText(/solo con alertas/i));
    await waitFor(() => expect(paths().some((p) => p.includes("withAlerts=1"))).toBe(true));

    await user.type(screen.getByLabelText("Buscar obras en el histórico"), "cubierta");
    await waitFor(() => expect(paths().some((p) => p.includes("q=cubierta"))).toBe(true), { timeout: 2000 });

    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await waitFor(() => expect(paths().at(-1)).toBe("/project-history?page=1&perPage=15"));
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();
  });

  it("pagina: Siguiente pide la página 2 y Anterior está deshabilitado en la primera", async () => {
    mockApiFetch.mockImplementation((path: string) => {
      const current = Number(new URLSearchParams(path.split("?")[1]).get("page") ?? 1);
      return Promise.resolve(page({ currentPage: current, lastPage: 3, total: 40 }));
    });
    const user = userEvent.setup();
    renderSection();

    expect(await screen.findByText(/40 obras · página 1 de 3/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /anterior/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText(/página 2 de 3/)).toBeInTheDocument();
    expect(paths().at(-1)).toContain("page=2");
    expect(screen.getByRole("button", { name: /anterior/i })).toBeEnabled();
  });

  it("no muestra paginación cuando todo cabe en una página", async () => {
    renderSection();
    await screen.findByText("Reparación cubierta");

    expect(screen.queryByRole("navigation", { name: /paginación/i })).not.toBeInTheDocument();
  });

  it("exporta TODO el conjunto filtrado (endpoint /export), no solo la página visible", async () => {
    const created: Blob[] = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation((b) => { created.push(b as Blob); return "blob:mock"; });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const user = userEvent.setup();
    renderSection();
    await screen.findByText("Reparación cubierta");

    await user.click(screen.getByLabelText("Solo con alertas") as HTMLElement);
    await waitFor(() => expect(paths().some((p) => p.includes("withAlerts=1"))).toBe(true));
    await user.click(screen.getByRole("button", { name: "Exportar histórico a CSV" }));

    await waitFor(() => expect(created).toHaveLength(1));
    expect(paths().some((p) => p === "/project-history/export?withAlerts=1")).toBe(true);
    const csv = await created[0].text();
    expect(csv).toContain("Código,Obra,Tipo");
    expect(csv).toContain("PRJ-002");
    expect(csv).toContain("TestRif");
    expect(csv).toContain("Pagado > adjudicado");
    expect(csv).toContain("Sin aprobar");
  });

  it("deshabilita la exportación cuando no hay resultados", async () => {
    mockApiFetch.mockResolvedValue(page({ items: [], total: 0 }));
    renderSection();
    await screen.findByText(/no hay obras que coincidan/i);

    expect(screen.getByRole("button", { name: "Exportar histórico a CSV" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Exportar histórico a Excel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Exportar histórico a PDF" })).toBeDisabled();
  });

  it("abre el detalle al hacer clic en una fila y lo cierra avisando al padre", async () => {
    const onSelectSpy = vi.fn();
    const user = userEvent.setup();
    renderSection({ onSelectSpy });
    await user.click(await screen.findByText("Reparación cubierta"));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Lo pagado supera lo adjudicado.")).toBeInTheDocument();
    expect(onSelectSpy).toHaveBeenCalledWith("PRJ-002");

    await user.click(within(dialog).getByRole("button", { name: /cerrar/i }));
    await waitFor(() => expect(onSelectSpy).toHaveBeenLastCalledWith(null));
  });

  it("abre el detalle directamente cuando el padre ya seleccionó la obra (ej. desde obras estancadas)", async () => {
    renderSection({ initialSelected: "PRJ-002" });

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Lo pagado supera lo adjudicado.")).toBeInTheDocument();
    expect(paths()).toContain("/project-history/PRJ-002");
  });

  it("recorre las pestañas del detalle: proveedores, pagos, planos", async () => {
    const user = userEvent.setup();
    renderSection({ initialSelected: "PRJ-002" });
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Lo pagado supera lo adjudicado.");

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

  it("la pestaña 'Flujo y organigrama' muestra el organigrama de la obra de la sesión", async () => {
    const user = userEvent.setup();
    renderSection({ initialSelected: "PRJ-002" });
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Lo pagado supera lo adjudicado.");

    await user.click(within(dialog).getByRole("tab", { name: /Flujo y organigrama/ }));

    expect(within(dialog).getByText("Flujo de Decisiones Organigrama IVOO")).toBeInTheDocument();
    expect(within(dialog).getByText(/Ciclo cerrado: obra entregada y liquidada/)).toBeInTheDocument();
  });

  it("la pestaña de flujo avisa si la obra no está cargada en la sesión, sin romper el resto", async () => {
    const user = userEvent.setup();
    renderSection({ initialSelected: "PRJ-002", projects: [] });
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Lo pagado supera lo adjudicado.");

    await user.click(within(dialog).getByRole("tab", { name: /Flujo y organigrama/ }));
    expect(within(dialog).getByText(/aún no está disponible en la sesión/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("tab", { name: /Pagos/ }));
    expect(within(dialog).getByText("comp_ant.pdf")).toBeInTheDocument();
  });

  it("vuelve a la primera pestaña al abrir otra obra", async () => {
    const user = userEvent.setup();
    renderSection({ initialSelected: "PRJ-002" });
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Lo pagado supera lo adjudicado.");
    await user.click(within(dialog).getByRole("tab", { name: /Pagos/ }));

    await user.click(within(dialog).getByRole("button", { name: /cerrar/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(await screen.findByText("Reparación cubierta"));

    const reopened = await screen.findByRole("dialog");
    expect(await within(reopened).findByText("Solicitud creada")).toBeInTheDocument();
  });

  it("muestra un mensaje si el detalle falla al cargar", async () => {
    mockApiFetch.mockImplementation((path: string) => {
      if (path.startsWith("/project-history/PRJ-002")) return Promise.reject(new Error("boom"));
      return Promise.resolve(page());
    });
    renderSection({ initialSelected: "PRJ-002" });

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText(/no se pudo cargar el detalle/i)).toBeInTheDocument();
  });
});
