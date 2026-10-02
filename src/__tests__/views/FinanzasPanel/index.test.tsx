/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas de integración de FinanzasPanel — verifica las 4 tabs (Diario,
 * Ejecución Financiera, Anticipos, Finiquitos), los KPIs derivados del
 * status de cada proyecto, y que los flujos de pago (onPayAdvance/
 * onPayFinal) se disparan correctamente desde las secciones reales.
 */

import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FinanzasPanel from "@/views/FinanzasPanel";
import { ProjectStatus, type PaymentOrder, type Project, type Proposal } from "@/types";

// Mantiene motion.* real (KpiPill pasa un MotionValue como children de
// <motion.span>, que solo el componente real sabe suscribir/renderizar) —
// solo reemplaza AnimatePresence por passthrough sin transición de salida:
// mode="wait" (usado al alternar Table/GridView) retrasa el montaje del
// contenido entrante hasta que termine la animación de salida, que en
// jsdom nunca completa a tiempo sin esto.
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

// Anticipos/Finiquitos usan Table + GridView (@tanstack/react-virtual) —
// igual que InvestmentApprovalSection.test.tsx (Procura), la virtualización
// necesita dimensiones reales de layout que jsdom no provee por sí solo.
function stubSyncResizeObserver() {
  const OriginalRO = window.ResizeObserver;
  class SyncResizeObserver {
    private callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
    observe(target: Element) {
      this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = SyncResizeObserver as unknown as typeof ResizeObserver;
  return () => {
    window.ResizeObserver = OriginalRO;
  };
}

function stubContainerSize(width: number, height: number) {
  const proto = HTMLDivElement.prototype;
  Object.defineProperty(proto, "clientWidth", { value: width, configurable: true });
  Object.defineProperty(proto, "clientHeight", { value: height, configurable: true });
  Object.defineProperty(proto, "offsetWidth", { value: width, configurable: true });
  Object.defineProperty(proto, "offsetHeight", { value: height, configurable: true });
  return () => {
    // @ts-expect-error restaurar el descriptor original de jsdom
    delete proto.clientWidth;
    // @ts-expect-error restaurar el descriptor original de jsdom
    delete proto.clientHeight;
    // @ts-expect-error restaurar el descriptor original de jsdom
    delete proto.offsetWidth;
    // @ts-expect-error restaurar el descriptor original de jsdom
    delete proto.offsetHeight;
  };
}

// El diario de egresos inspecciona cada pago con useFinanceDisbursements (react-query),
// así que el panel necesita un QueryClient ancestro.
function renderPanel(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: "PROP-1",
    contractorCode: "CON-100",
    contractorName: "Constructora Ejemplo",
    materialCost: 8000,
    laborCost: 2000,
    totalCost: 10000,
    deliveryWeeks: 8,
    negotiatedAdvancePercent: 30,
    description: "Propuesta de ejemplo",
    origen: "MANUAL",
    fechaOferta: "2026-01-01",
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "PRJ-1",
    title: "Obra de ejemplo",
    type: "INFRAESTRUCTURA",
    description: "Descripción",
    location: "Sede Central",
    createdDate: "2026-01-01",
    status: ProjectStatus.CONTRATADO,
    materials: [],
    estimatedTotal: 10000,
    ...overrides,
  };
}

const noop = async () => {};

/** Orden de pago vigente en USD (obligación = importe base) — el pago exige una orden. */
function makeOrder(paymentType: "ADVANCE" | "FINAL", amount: number): PaymentOrder {
  return {
    id: 1,
    number: 1,
    projectId: "PRJ-1",
    proposalId: "PROP-1",
    contractorCode: "CON-100",
    paymentType,
    amount,
    amountBase: amount,
    currency: "USD",
    exchangeRate: null,
    status: "FIRMADA",
    contentHash: "hash",
    voidReason: null,
    elaboratedByName: null,
    snapshot: {
      project: { id: "PRJ-1", title: "Obra", location: "Sede" },
      contractor: { code: "CON-100", name: "Constructora Ejemplo", rif: "J-1" },
      proposal: { id: "PROP-1", total_cost: "10000.00", negotiated_advance_percent: "30.00", currency: "USD" },
      payment_type: paymentType,
      amount: amount.toFixed(2),
    },
    createdAt: "2026-01-01T00:00:00Z",
    pendingRequiredSignature: null,
  };
}

describe("FinanzasPanel", () => {
  it("muestra los KPIs correctos según el status de cada proyecto", () => {
    const projects = [
      makeProject({ id: "PRJ-1", status: ProjectStatus.CONTRATADO }),
      makeProject({ id: "PRJ-2", status: ProjectStatus.LISTO_PAGO_FINAL }),
      makeProject({ id: "PRJ-3", status: ProjectStatus.EN_EJECUCION }),
      makeProject({ id: "PRJ-4", status: ProjectStatus.COMPLETADO_PAGADO }),
      makeProject({ id: "PRJ-5", status: ProjectStatus.COMPLETADO_PAGADO }),
    ];

    renderPanel(<FinanzasPanel projects={projects} onPayAdvance={noop} onPayFinal={noop} />);

    expect(screen.getByText("Anticipos por Liberar")).toBeInTheDocument();
    expect(screen.getByText("Finiquitos por Liquidar")).toBeInTheDocument();
    expect(screen.getByText("En Ejecución")).toBeInTheDocument();
    expect(screen.getByText("Obras Completadas")).toBeInTheDocument();
    // 2 obras COMPLETADO_PAGADO
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("arranca en la tab 'Estadisticas' y cambia de tab al hacer click", () => {
    renderPanel(<FinanzasPanel projects={[]} onPayAdvance={noop} onPayFinal={noop} />);

    const tablist = screen.getByRole("tablist", { name: "Secciones de Finanzas" });
    expect(within(tablist).getByRole("tab", { name: /Estadisticas/ })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(within(tablist).getByRole("tab", { name: /Anticipos/ }));
    expect(within(tablist).getByRole("tab", { name: /Anticipos/ })).toHaveAttribute("aria-selected", "true");
    expect(within(tablist).getByRole("tab", { name: /Estadisticas/ })).toHaveAttribute("aria-selected", "false");
  });

  it("abre en la tab con pendientes y avisa con un banner, sin banner si no hay nada pendiente", () => {
    const { unmount } = renderPanel(
      <FinanzasPanel
        projects={[makeProject({ id: "PRJ-1", status: ProjectStatus.LISTO_PAGO_FINAL })]}
        onPayAdvance={noop}
        onPayFinal={noop}
      />,
    );

    const tablist = screen.getByRole("tablist", { name: "Secciones de Finanzas" });
    expect(within(tablist).getByRole("tab", { name: /Finiquitos/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("1 finiquito por liquidar")).toBeInTheDocument();
    unmount();

    renderPanel(<FinanzasPanel projects={[]} onPayAdvance={noop} onPayFinal={noop} />);
    expect(screen.queryByText(/por liquidar|por liberar$/)).not.toBeInTheDocument();
  });

  it("muestra el contenido de 'Estadisticas' (Ejecución Financiera) sin quedar invisible por herencia de animación rota bajo TabPanel", async () => {
    const projects = [makeProject({ status: ProjectStatus.COMPLETADO_PAGADO })];
    renderPanel(<FinanzasPanel projects={projects} onPayAdvance={noop} onPayFinal={noop} />);

    // Bug real: FinancialSummarySection usaba variants={itemVariants} sin
    // initial/animate propios, dependiendo de que el ancestro propagara el
    // label de variante — TabPanel anima con un objeto literal (no un
    // label), corta esa propagación, y el contenido quedaba atascado en
    // opacity:0 para siempre (invisible) aunque el DOM existiera. A
    // diferencia de una animación de entrada normal (que arranca en 0 y
    // converge), acá se verifica que SÍ converge — no que nunca pase por 0.
    const heading = screen.getByText("Ejecución Financiera del Portafolio");
    const animatedRoot = heading.closest("div.rounded-2xl") as HTMLElement;

    await waitFor(() => expect(animatedRoot).toHaveStyle({ opacity: "1" }), { timeout: 1000 });
  });

  it("reconstruye el diario de egresos a partir de los pagos ya registrados en los proyectos", () => {
    const projects = [
      makeProject({
        id: "PRJ-1",
        title: "Obra con anticipo pagado",
        status: ProjectStatus.EN_EJECUCION,
        selectedContractorCode: "CON-100",
        proposals: [makeProposal({ contractorCode: "CON-100" })],
        advancePaidAmount: 3000,
        advancePaidDate: "2026-02-01",
      }),
      makeProject({
        id: "PRJ-2",
        title: "Obra completada",
        status: ProjectStatus.COMPLETADO_PAGADO,
        selectedContractorCode: "CON-200",
        proposals: [makeProposal({ id: "PROP-2", contractorCode: "CON-200", totalCost: 20000 })],
        advancePaidAmount: 6000,
        advancePaidDate: "2026-01-01",
        finalPaidAmount: 14000,
        finalPaidDate: "2026-03-01",
      }),
    ];

    renderPanel(<FinanzasPanel projects={projects} onPayAdvance={noop} onPayFinal={noop} />);

    fireEvent.click(screen.getByRole("tab", { name: /Diario de Egresos/ }));

    // 3 movimientos: 2 anticipos + 1 finiquito.
    expect(screen.getByText("Obra con anticipo pagado")).toBeInTheDocument();
    expect(screen.getAllByText("Obra completada").length).toBeGreaterThan(0);
  });

  it("libera un anticipo desde la tab 'Anticipos' y llama a onPayAdvance", async () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const onPayAdvance = vi.fn().mockResolvedValue(undefined);
      const projects = [
        makeProject({
          id: "PRJ-1",
          title: "Obra pendiente de anticipo",
          status: ProjectStatus.CONTRATADO,
          selectedContractorCode: "CON-100",
          proposals: [makeProposal({ contractorCode: "CON-100", totalCost: 10000, negotiatedAdvancePercent: 30 })],
          paymentOrders: { advance: makeOrder("ADVANCE", 3000), final: null },
        }),
      ];

      renderPanel(<FinanzasPanel projects={projects} onPayAdvance={onPayAdvance} onPayFinal={noop} />);

      fireEvent.click(screen.getByRole("tab", { name: /Anticipos/ }));
      // GridView (vista por defecto) virtualiza con @tanstack/react-virtual
      // — se cambia a la vista de tabla para interactuar con la fila.
      fireEvent.click(screen.getByLabelText("Vista de tabla"));
      fireEvent.click(screen.getByRole("button", { name: /Liberar$/ }));

      const dialog = await screen.findByRole("dialog");
      // El comprobante es obligatorio: sin adjuntar nada, confirmar debe estar deshabilitado.
      expect(within(dialog).getByRole("button", { name: /Liberar anticipo/ })).toBeDisabled();

      const proofFile = new File(["dummy"], "voucher.pdf", { type: "application/pdf" });
      fireEvent.change(within(dialog).getByTestId("file-input"), { target: { files: [proofFile] } });
      // También hay que indicar en qué moneda se pagó: con comprobante pero sin modo, sigue deshabilitado.
      expect(within(dialog).getByRole("button", { name: /Liberar anticipo/ })).toBeDisabled();

      fireEvent.click(within(dialog).getByRole("radio", { name: /moneda cotizada/i }));
      expect(within(dialog).getByRole("button", { name: /Liberar anticipo/ })).toBeEnabled();
      fireEvent.click(within(dialog).getByRole("button", { name: /Liberar anticipo/ }));

      await waitFor(() =>
        expect(onPayAdvance).toHaveBeenCalledWith("PRJ-1", 3000, proofFile, { paymentMode: "QUOTE_CURRENCY", paidAmount: 3000 }),
      );
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("liquida un finiquito desde la tab 'Finiquitos' y llama a onPayFinal", async () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const onPayFinal = vi.fn().mockResolvedValue(undefined);
      const projects = [
        makeProject({
          id: "PRJ-1",
          title: "Obra lista para finiquito",
          status: ProjectStatus.LISTO_PAGO_FINAL,
          selectedContractorCode: "CON-100",
          advancePaidAmount: 3000,
          proposals: [makeProposal({ contractorCode: "CON-100", totalCost: 10000 })],
          paymentOrders: { advance: null, final: makeOrder("FINAL", 7000) },
        }),
      ];

      renderPanel(<FinanzasPanel projects={projects} onPayAdvance={noop} onPayFinal={onPayFinal} />);

      fireEvent.click(screen.getByRole("tab", { name: /Finiquitos/ }));
      fireEvent.click(screen.getByLabelText("Vista de tabla"));
      fireEvent.click(screen.getByRole("button", { name: /Aprobar$/ }));

      const dialog = await screen.findByRole("dialog");
      const proofFile = new File(["dummy"], "voucher.pdf", { type: "application/pdf" });
      fireEvent.change(within(dialog).getByTestId("file-input"), { target: { files: [proofFile] } });
      fireEvent.click(within(dialog).getByRole("radio", { name: /moneda cotizada/i }));
      fireEvent.click(within(dialog).getByRole("button", { name: /Aprobar finiquito/ }));

      await waitFor(() =>
        expect(onPayFinal).toHaveBeenCalledWith("PRJ-1", 7000, proofFile, { paymentMode: "QUOTE_CURRENCY", paidAmount: 7000 }),
      );
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("precarga el monto con el finiquito propuesto por Auditoría", async () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const onPayFinal = vi.fn().mockResolvedValue(undefined);
      const projects = [
        makeProject({
          id: "PRJ-1",
          title: "Obra lista para finiquito",
          status: ProjectStatus.LISTO_PAGO_FINAL,
          selectedContractorCode: "CON-100",
          advancePaidAmount: 3000,
          finiquitoAmount: 6800,
          proposals: [makeProposal({ contractorCode: "CON-100", totalCost: 10000 })],
          paymentOrders: { advance: null, final: makeOrder("FINAL", 6800) },
        }),
      ];

      renderPanel(<FinanzasPanel projects={projects} onPayAdvance={noop} onPayFinal={onPayFinal} />);

      fireEvent.click(screen.getByRole("tab", { name: /Finiquitos/ }));
      fireEvent.click(screen.getByLabelText("Vista de tabla"));
      fireEvent.click(screen.getByRole("button", { name: /Aprobar$/ }));

      const dialog = await screen.findByRole("dialog");
      const proofFile = new File(["dummy"], "voucher.pdf", { type: "application/pdf" });
      fireEvent.change(within(dialog).getByTestId("file-input"), { target: { files: [proofFile] } });
      fireEvent.click(within(dialog).getByRole("radio", { name: /moneda cotizada/i }));
      fireEvent.click(within(dialog).getByRole("button", { name: /Aprobar finiquito/ }));

      await waitFor(() =>
        expect(onPayFinal).toHaveBeenCalledWith("PRJ-1", 6800, proofFile, { paymentMode: "QUOTE_CURRENCY", paidAmount: 6800 }),
      );
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("muestra el skeleton mientras isLoading es true, sin renderizar las tabs", () => {
    renderPanel(<FinanzasPanel projects={[]} onPayAdvance={noop} onPayFinal={noop} isLoading />);

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
});
