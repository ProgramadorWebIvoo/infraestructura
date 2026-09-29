import React from "react";
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AdvancesSection from "@/views/FinanzasPanel/components/AdvancesSection";
import type { Project, PaymentOrder } from "@/types";

vi.mock("@/components/UI/Toast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock("@/components/Contractor/ContractorDocumentsSection", () => ({ default: () => <div>Documentos del proveedor</div> }));
vi.mock("react-dom", () => ({ createPortal: (content: React.ReactNode) => content }));

vi.mock("motion/react", () => {
  const stripMotionProps = (props: Record<string, unknown>) => {
    const { initial, animate, exit, variants, transition, layout, ...rest } = props;
    return rest;
  };
  return {
    useReducedMotion: () => false,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy(
      {},
      {
        get: (_target, tag: string) =>
          ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
            React.createElement(tag, stripMotionProps(props), children),
      },
    ),
  };
});

// Table con fillViewport mide el contenedor via ResizeObserver + offsetHeight
// — ambos son 0 en jsdom por defecto, así que sin esto ninguna fila renderiza.
let restoreResizeObserver: () => void;
let restoreContainerSize: () => void;

beforeAll(() => {
  const OriginalRO = window.ResizeObserver;
  class SyncResizeObserver {
    constructor(private callback: ResizeObserverCallback) {}
    observe(target: Element) { this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver); }
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = SyncResizeObserver as unknown as typeof ResizeObserver;
  restoreResizeObserver = () => { window.ResizeObserver = OriginalRO; };

  const proto = HTMLDivElement.prototype;
  Object.defineProperty(proto, "clientWidth", { value: 800, configurable: true });
  Object.defineProperty(proto, "clientHeight", { value: 600, configurable: true });
  Object.defineProperty(proto, "offsetWidth", { value: 800, configurable: true });
  Object.defineProperty(proto, "offsetHeight", { value: 600, configurable: true });
  restoreContainerSize = () => {
    // @ts-expect-error restaurar el descriptor original de jsdom
    delete proto.clientWidth;
    // @ts-expect-error restaurar el descriptor original de jsdom
    delete proto.clientHeight;
    // @ts-expect-error restaurar el descriptor original de jsdom
    delete proto.offsetWidth;
    // @ts-expect-error restaurar el descriptor original de jsdom
    delete proto.offsetHeight;
  };
});

afterAll(() => {
  restoreResizeObserver();
  restoreContainerSize();
});

const ORDER: PaymentOrder = {
  id: 1,
  number: 7,
  projectId: "PRJ-1",
  proposalId: "PROP-1",
  contractorCode: "CON-1",
  paymentType: "ADVANCE",
  amount: 3000,
  currency: "USD",
  exchangeRate: null,
  status: "EN_FIRMA",
  contentHash: "abc123",
  voidReason: null,
  elaboratedByName: "Ana Analista",
  snapshot: {
    project: { id: "PRJ-1", title: "Obra 1", location: "Caracas" },
    contractor: { code: "CON-1", name: "Constructora XYZ", rif: "J-12345678-9" },
    proposal: { id: "PROP-1", total_cost: "10000.00", negotiated_advance_percent: "30.00", currency: "USD" },
    payment_type: "ADVANCE",
    amount: "3000.00",
  },
  createdAt: "2026-09-30T00:00:00Z",
  pendingRequiredSignature: null,
};

function buildProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "PRJ-1",
    title: "Obra 1",
    type: "INFRAESTRUCTURA",
    description: "",
    location: "Caracas",
    createdDate: "2026-09-01",
    status: "CONTRATADO" as Project["status"],
    materials: [],
    estimatedTotal: 10000,
    selectedContractorCode: "CON-1",
    proposals: [{
      id: "PROP-1", contractorCode: "CON-1", contractorName: "Constructora XYZ", contractorRating: 4,
      materialCost: 6000, materialItems: [], laborCost: 4000, totalCost: 10000, deliveryWeeks: 4,
      negotiatedAdvancePercent: 30, description: "", origen: "MANUAL", fechaOferta: "2026-09-01",
    }] as Project["proposals"],
    ...overrides,
  } as Project;
}

describe("AdvancesSection — orden de pago", () => {
  it("no muestra el botón Ver orden cuando el proyecto no tiene orden vigente", () => {
    render(<AdvancesSection pendingAdvances={[buildProject()]} onPayAdvance={vi.fn()} authToken="t" activeRole="FINANZAS" />);
    fireEvent.click(screen.getByRole("button", { name: "Vista de tabla" }));
    expect(screen.queryByRole("button", { name: /Ver orden de pago/ })).not.toBeInTheDocument();
  });

  it("abre el detalle de la orden con sus datos y los documentos del proveedor", async () => {
    const project = buildProject({ paymentOrders: { advance: ORDER, final: null } });
    render(<AdvancesSection pendingAdvances={[project]} onPayAdvance={vi.fn()} authToken="t" activeRole="FINANZAS" />);

    fireEvent.click(screen.getByRole("button", { name: "Vista de tabla" }));
    fireEvent.click(screen.getByRole("button", { name: /Ver orden de pago de Obra 1/ }));

    await waitFor(() => expect(screen.getByText("Orden de pago #7")).toBeInTheDocument());
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Constructora XYZ")).toBeInTheDocument();
    expect(within(dialog).getByText("Ana Analista")).toBeInTheDocument();
    expect(within(dialog).getByText("Documentos del proveedor")).toBeInTheDocument();
  });
});
