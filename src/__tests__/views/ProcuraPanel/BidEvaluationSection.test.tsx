/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para BidEvaluationSection — verifica el rediseño:
 * lista compacta de expedientes (TableToolbar + Table/GridView, no una
 * pila de tarjetas grandes con scroll largo) que abre el cuadro comparativo
 * completo (resumen + tabla de propuestas) en un modal al seleccionar uno.
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BidEvaluationSection from "@/views/ProcuraPanel/components/BidEvaluationSection";
import type { Project, Proposal } from "@/types";
import { ProjectStatus } from "@/types";

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

vi.mock("react-dom", () => ({
  createPortal: (content: React.ReactNode) => content,
}));

vi.mock("@/components/UI/PublicSettingsProvider", () => ({
  usePublicSettings: () => ({
    settings: {
      presupuesto: [
        { key: "anticipo_maximo_pct", value: "30" },
        { key: "semaforo_umbral_verde", value: "80" },
        { key: "semaforo_umbral_amarillo", value: "95" },
        { key: "semaforo_umbral_naranja", value: "100" },
      ],
    },
    isLoading: false,
  }),
}));

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

const makeProposal = (over: Partial<Proposal> & { id: string; contractorCode: string }): Proposal => ({
  contractorName: "Constructora ABC",
  description: "Propuesta estándar",
  materialCost: 2000,
  laborCost: 1000,
  totalCost: 3000,
  deliveryWeeks: 4,
  negotiatedAdvancePercent: 20,
  contractorRating: 4.5,
  origen: "MANUAL",
  fechaOferta: "2026-07-01",
  ...over,
});

const makeProject = (over: Partial<Project> & { id: string }): Project => ({
  title: "Obra de prueba",
  type: "INFRAESTRUCTURA",
  description: "",
  location: "Tienda Chacao",
  createdDate: "2026-07-01",
  status: ProjectStatus.COMPARATIVA_ENVIADA,
  materials: [],
  estimatedTotal: 500,
  approvedInvestmentAmount: 4000,
  proposals: [makeProposal({ id: "PROP-1", contractorCode: "C-001" })],
  ...over,
});

function renderSection(props: Partial<React.ComponentProps<typeof BidEvaluationSection>> = {}) {
  return render(
    <BidEvaluationSection
      projects={[]}
      authToken="token"
      onSelectContractor={vi.fn().mockResolvedValue(undefined)}
      onRejectProposals={vi.fn()}
      {...props}
    />,
  );
}

describe("BidEvaluationSection — vista Grid (default)", () => {
  it("arranca en vista Grid y muestra las tarjetas compactas de expedientes vía GridView", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const projects = [
        makeProject({ id: "P1", title: "Remodelación de oficinas" }),
        makeProject({ id: "P2", title: "Cambio de luminarias" }),
      ];
      renderSection({ projects });

      expect(screen.getByText("Remodelación de oficinas")).toBeInTheDocument();
      expect(screen.getByText("Cambio de luminarias")).toBeInTheDocument();
      expect(screen.getByLabelText("Vista de grid")).toHaveAttribute("aria-pressed", "true");
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("no muestra el cuadro comparativo completo hasta seleccionar un expediente", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const projects = [makeProject({ id: "P1", title: "Remodelación de oficinas" })];
      renderSection({ projects });

      expect(screen.queryByText("Costo Total")).not.toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("abre el cuadro comparativo completo (modal) al seleccionar una tarjeta", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const projects = [makeProject({ id: "P1", title: "Remodelación de oficinas" })];
      renderSection({ projects });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));

      expect(screen.getByText("Evaluación Comparativa")).toBeInTheDocument();
      expect(screen.getByText("Costo Total")).toBeInTheDocument();
      expect(screen.getAllByText("Constructora ABC").length).toBeGreaterThan(0);
    } finally {
      restoreSize();
      restoreRO();
    }
  });
});

describe("BidEvaluationSection — vista Tabla", () => {
  it("permite alternar a la vista de tabla y usa el componente Table real", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const projects = [makeProject({ id: "P1", title: "Remodelación de oficinas" })];
      renderSection({ projects });

      fireEvent.click(screen.getByLabelText("Vista de tabla"));

      expect(screen.getByLabelText("Vista de tabla")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("Remodelación de oficinas")).toBeInTheDocument();
      expect(screen.getByText("$3,000.00")).toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("filtra por búsqueda de título/ID/ubicación", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const projects = [
        makeProject({ id: "P1", title: "Remodelación de oficinas" }),
        makeProject({ id: "P2", title: "Cambio de luminarias" }),
      ];
      renderSection({ projects });
      fireEvent.click(screen.getByLabelText("Vista de tabla"));

      fireEvent.change(screen.getByLabelText("Buscar expedientes por adjudicar"), { target: { value: "luminarias" } });

      expect(screen.getByText("Cambio de luminarias")).toBeInTheDocument();
      expect(screen.queryByText("Remodelación de oficinas")).not.toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("muestra empty state cuando no hay cuadros pendientes de adjudicar", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      renderSection({ projects: [] });
      fireEvent.click(screen.getByLabelText("Vista de tabla"));

      expect(screen.getByText("No hay propuestas ni cuadros comparativos pendientes por revisión de contratación en este momento.")).toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });
});

describe("BidEvaluationSection — adjudicación", () => {
  it("abre HireConfirmDialog al hacer click en Adjudicar dentro del cuadro comparativo", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const projects = [makeProject({ id: "P1", title: "Remodelación de oficinas" })];
      renderSection({ projects });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));
      fireEvent.click(screen.getByText("Adjudicar"));

      expect(screen.getByText("Adjudicar Contratista")).toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("llama onSelectContractor al confirmar la adjudicación", async () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    const onSelectContractor = vi.fn().mockResolvedValue(undefined);
    try {
      const projects = [makeProject({ id: "P1", title: "Remodelación de oficinas" })];
      renderSection({ projects, onSelectContractor });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));
      fireEvent.click(screen.getByText("Adjudicar"));
      fireEvent.click(screen.getByText("Confirmar adjudicación"));

      await vi.waitFor(() => expect(onSelectContractor).toHaveBeenCalledWith("P1", "C-001", "PROP-1"));
    } finally {
      restoreSize();
      restoreRO();
    }
  });
});

describe("BidEvaluationSection — rechazo de cuadro comparativo", () => {
  it("muestra el RequiredMark de campo obligatorio en Motivo del rechazo", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const projects = [makeProject({ id: "P1", title: "Remodelación de oficinas" })];
      renderSection({ projects });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));
      fireEvent.click(screen.getByText("Rechazar"));

      // Arranca vacío — el RequiredMark muestra el estado "pendiente".
      expect(screen.getByLabelText("Campo obligatorio pendiente")).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("Motivo del rechazo"), { target: { value: "Precios fuera de rango." } });

      expect(screen.getByLabelText("Campo obligatorio completo")).toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("llama onRejectProposals con el motivo al confirmar el rechazo", async () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    const onRejectProposals = vi.fn();
    try {
      const projects = [makeProject({ id: "P1", title: "Remodelación de oficinas" })];
      renderSection({ projects, onRejectProposals });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));
      fireEvent.click(screen.getByText("Rechazar"));
      fireEvent.change(screen.getByLabelText("Motivo del rechazo"), { target: { value: "Precios fuera de rango." } });
      fireEvent.click(screen.getByText("Confirmar rechazo"));

      expect(onRejectProposals).toHaveBeenCalledWith("P1", "Precios fuera de rango.");
    } finally {
      restoreSize();
      restoreRO();
    }
  });
});
