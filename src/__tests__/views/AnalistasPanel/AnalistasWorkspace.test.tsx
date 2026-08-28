/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para AnalistasWorkspace — lista compacta de expedientes
 * en licitación (TableToolbar + Table/GridView) que abre un modal de detalle
 * donde se registra la oferta del contratista, se revisa el cuadro
 * comparativo y se envía a Procura.
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import AnalistasWorkspace from "@/views/AnalistasPanel/components/AnalistasWorkspace";
import { ToastProvider } from "@/components/UI/Toast";
import type { Project, Contractor, Proposal } from "@/types";

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
      presupuesto: [{ key: "anticipo_maximo_porcentaje", value: "30" }],
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

const makeContractor = (over: Partial<Contractor> & { code: string }): Contractor => ({
  name: "Constructora ABC",
  specialty: "Electricidad",
  rating: 4.5,
  email: "contacto@constructoraabc.test",
  ...over,
});

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
  status: "CONFIRMADO_PROCURA",
  materials: [],
  estimatedTotal: 500,
  approvedInvestmentAmount: 4000,
  proposals: [],
  ...over,
});

function renderWorkspace(props: Partial<React.ComponentProps<typeof AnalistasWorkspace>> = {}) {
  return render(
    <ToastProvider>
      <AnalistasWorkspace
        pendingLicitacion={[]}
        contractors={[makeContractor({ code: "C-001" })]}
        onAddProposal={vi.fn()}
        onRenegotiateProposal={vi.fn().mockResolvedValue(undefined)}
        onRemoveProposal={vi.fn()}
        onSubmitComparative={vi.fn()}
        authToken="test-token"
        {...props}
      />
    </ToastProvider>,
  );
}

describe("AnalistasWorkspace — lista de expedientes en licitación", () => {
  it("arranca en vista Grid y muestra las tarjetas compactas de expedientes", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const projects = [
        makeProject({ id: "P1", title: "Remodelación de oficinas" }),
        makeProject({ id: "P2", title: "Cambio de luminarias" }),
      ];
      renderWorkspace({ pendingLicitacion: projects });

      expect(screen.getByText("Remodelación de oficinas")).toBeInTheDocument();
      expect(screen.getByText("Cambio de luminarias")).toBeInTheDocument();
      expect(screen.getByLabelText("Vista de grid")).toHaveAttribute("aria-pressed", "true");
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("no muestra el modal de detalle hasta seleccionar un expediente", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      renderWorkspace({ pendingLicitacion: [makeProject({ id: "P1", title: "Remodelación de oficinas" })] });

      expect(screen.queryByText("Propuestas Ingresadas (0)")).not.toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("abre el modal de detalle al seleccionar una tarjeta", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      renderWorkspace({ pendingLicitacion: [makeProject({ id: "P1", title: "Remodelación de oficinas" })] });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));

      expect(screen.getByText("Propuestas Ingresadas (0)")).toBeInTheDocument();
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
      renderWorkspace({ pendingLicitacion: projects });

      fireEvent.change(screen.getByLabelText("Buscar expedientes en licitación"), { target: { value: "luminarias" } });

      expect(screen.getByText("Cambio de luminarias")).toBeInTheDocument();
      expect(screen.queryByText("Remodelación de oficinas")).not.toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("muestra empty state cuando no hay expedientes en licitación", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      renderWorkspace({ pendingLicitacion: [] });

      expect(screen.getByText(/No hay expedientes en licitación activa/)).toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("permite alternar a la vista de tabla", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      renderWorkspace({ pendingLicitacion: [makeProject({ id: "P1", title: "Remodelación de oficinas" })] });

      fireEvent.click(screen.getByLabelText("Vista de tabla"));

      expect(screen.getByLabelText("Vista de tabla")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("Remodelación de oficinas")).toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });
});

describe("AnalistasWorkspace — carga de propuestas dentro del modal", () => {
  it("el botón 'Registrar oferta' abre el modal dedicado de registro", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      renderWorkspace({ pendingLicitacion: [makeProject({ id: "P1", title: "Remodelación de oficinas" })] });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));

      expect(screen.queryByText("Agregar al Cuadro")).not.toBeInTheDocument();

      fireEvent.click(screen.getByText("Registrar oferta"));

      expect(screen.getByText("Agregar al Cuadro")).toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("muestra RequiredMark pendiente en Proveedor/Contratista hasta seleccionar uno", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      renderWorkspace({
        pendingLicitacion: [makeProject({ id: "P1", title: "Remodelación de oficinas" })],
        contractors: [],
      });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));
      fireEvent.click(screen.getByText("Registrar oferta"));
      fireEvent.click(screen.getByText("Carga manual"));

      expect(screen.getByLabelText("Campo obligatorio pendiente")).toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("registra una nueva propuesta y la muestra en el cuadro comparativo", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    const onAddProposal = vi.fn();
    try {
      renderWorkspace({
        pendingLicitacion: [makeProject({ id: "P1", title: "Remodelación de oficinas", approvedInvestmentAmount: 10000 })],
        contractors: [makeContractor({ code: "C-001", name: "Constructora ABC" })],
        onAddProposal,
      });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));
      fireEvent.click(screen.getByText("Registrar oferta"));
      fireEvent.click(screen.getByText("Carga manual"));
      fireEvent.click(screen.getByText("Agregar al Cuadro"));

      expect(onAddProposal).toHaveBeenCalledWith(
        "P1",
        expect.objectContaining({ contractorCode: "C-001", materialCost: 0, laborCost: 0, origen: "MANUAL" }),
      );
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("el motivo es obligatorio y bloquea el submit cuando el anticipo excede el máximo configurado", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    const onAddProposal = vi.fn();
    try {
      renderWorkspace({
        pendingLicitacion: [makeProject({ id: "P1", title: "Remodelación de oficinas" })],
        contractors: [makeContractor({ code: "C-001" })],
        onAddProposal,
      });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));
      fireEvent.click(screen.getByText("Registrar oferta"));
      fireEvent.click(screen.getByText("Carga manual"));

      // maxAdvancePercent mockeado en 30 — supera el máximo.
      fireEvent.change(document.getElementById("analistas-advance")!, { target: { value: "50" } });

      expect(screen.getByText("Agregar al Cuadro").closest("button")).toBeDisabled();
      expect(document.getElementById("analistas-motivo-anticipo")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Agregar al Cuadro").closest("button")!);
      expect(onAddProposal).not.toHaveBeenCalled();

      fireEvent.change(document.getElementById("analistas-motivo-anticipo")!, { target: { value: "Proveedor exige anticipo mayor por escasez." } });
      expect(screen.getByText("Agregar al Cuadro").closest("button")).not.toBeDisabled();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("elimina una propuesta ya cargada desde la tabla del cuadro comparativo", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    const onRemoveProposal = vi.fn();
    try {
      const projects = [
        makeProject({
          id: "P1",
          title: "Remodelación de oficinas",
          proposals: [makeProposal({ id: "PROP-1", contractorCode: "C-001", contractorName: "Constructora ABC" })],
        }),
      ];
      renderWorkspace({ pendingLicitacion: projects, onRemoveProposal });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));
      fireEvent.click(screen.getByLabelText("Eliminar propuesta de Constructora ABC"));

      expect(onRemoveProposal).toHaveBeenCalledWith("P1", "PROP-1");
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("el botón 'Renegociar' abre el modal con el precio anterior tomado de la propuesta existente (solo lectura)", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const projects = [
        makeProject({
          id: "P1",
          title: "Remodelación de oficinas",
          proposals: [makeProposal({ id: "PROP-1", contractorCode: "C-001", contractorName: "Constructora ABC", totalCost: 3200 })],
        }),
      ];
      renderWorkspace({ pendingLicitacion: projects });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));
      fireEvent.click(screen.getByLabelText("Renegociar propuesta de Constructora ABC"));

      expect(screen.getByText("Precio Anterior")).toBeInTheDocument();
      expect(screen.getAllByText("$3,200.00").length).toBeGreaterThan(0);
      // No hay ningún input editable para el precio anterior — es de solo lectura.
      expect(screen.queryByLabelText(/Precio Anterior/)).not.toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("el motivo es obligatorio para confirmar una renegociación", async () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    const onRenegotiateProposal = vi.fn().mockResolvedValue(undefined);
    try {
      const projects = [
        makeProject({
          id: "P1",
          title: "Remodelación de oficinas",
          proposals: [makeProposal({ id: "PROP-1", contractorCode: "C-001", contractorName: "Constructora ABC" })],
        }),
      ];
      renderWorkspace({ pendingLicitacion: projects, onRenegotiateProposal });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));
      fireEvent.click(screen.getByLabelText("Renegociar propuesta de Constructora ABC"));

      const confirmButton = screen.getByText("Confirmar Renegociación").closest("button");
      expect(confirmButton).toBeDisabled();

      const motivoField = document.getElementById("renegotiate-motivo") as HTMLTextAreaElement;
      fireEvent.change(motivoField, { target: { value: "El contratista bajó el precio." } });
      expect(motivoField.value).toBe("El contratista bajó el precio.");
      const enabledConfirmButton = screen.getByText("Confirmar Renegociación").closest("button");
      expect(enabledConfirmButton).not.toBeDisabled();

      fireEvent.click(enabledConfirmButton!);
      await vi.waitFor(() => expect(onRenegotiateProposal).toHaveBeenCalledWith(
        "P1",
        "PROP-1",
        expect.objectContaining({ motivo: "El contratista bajó el precio." }),
      ));
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("muestra el badge de origen en la tabla de propuestas ya cargadas", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const projects = [
        makeProject({
          id: "P1",
          title: "Remodelación de oficinas",
          proposals: [
            makeProposal({ id: "PROP-1", contractorCode: "C-001", origen: "RENEGOCIACION", motivo: "Ajuste de precio tras revisión." }),
          ],
        }),
      ];
      renderWorkspace({ pendingLicitacion: projects });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));

      expect(screen.getByText("Renegoc.")).toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("muestra el resumen ProposalSummary (Mejor Oferta) cuando hay al menos una propuesta", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const projects = [
        makeProject({
          id: "P1",
          title: "Remodelación de oficinas",
          approvedInvestmentAmount: 4000,
          proposals: [makeProposal({ id: "PROP-1", contractorCode: "C-001", totalCost: 3000 })],
        }),
      ];
      renderWorkspace({ pendingLicitacion: projects });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));

      expect(screen.getByText("Mejor Oferta")).toBeInTheDocument();
      expect(screen.getAllByText("$3,000.00").length).toBeGreaterThan(0);
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("importa propuestas del portal cuando se provee onImportSupplierProposals", async () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    const onImportSupplierProposals = vi.fn().mockResolvedValue({ message: "2 propuestas importadas.", imported: 2, skipped: 0 });
    try {
      renderWorkspace({
        pendingLicitacion: [makeProject({ id: "P1", title: "Remodelación de oficinas" })],
        onImportSupplierProposals,
      });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));
      fireEvent.click(screen.getByText("Registrar oferta"));
      fireEvent.click(screen.getByRole("button", { name: "Traer del portal" }));

      await vi.waitFor(() => expect(onImportSupplierProposals).toHaveBeenCalledWith("P1"));
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("el botón 'Traer del portal' del modal de registro está deshabilitado cuando no se provee la prop", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      renderWorkspace({ pendingLicitacion: [makeProject({ id: "P1", title: "Remodelación de oficinas" })] });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));
      fireEvent.click(screen.getByText("Registrar oferta"));
      fireEvent.click(screen.getByRole("tab", { name: "Traer del portal" }));

      expect(screen.getByRole("button", { name: "Traer del portal" })).toBeDisabled();
    } finally {
      restoreSize();
      restoreRO();
    }
  });
});

describe("AnalistasWorkspace — envío del cuadro comparativo", () => {
  it("deshabilita 'Enviar Cuadro a Procura' sin propuestas cargadas", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      renderWorkspace({ pendingLicitacion: [makeProject({ id: "P1", title: "Remodelación de oficinas" })] });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));

      expect(screen.getByText("Enviar Cuadro a Procura").closest("button")).toBeDisabled();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("llama onSubmitComparative y cierra el modal al confirmar el envío", async () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    const onSubmitComparative = vi.fn();
    try {
      const projects = [
        makeProject({
          id: "P1",
          title: "Remodelación de oficinas",
          proposals: [makeProposal({ id: "PROP-1", contractorCode: "C-001" })],
        }),
      ];
      renderWorkspace({ pendingLicitacion: projects, onSubmitComparative });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));
      fireEvent.click(screen.getByText("Enviar Cuadro a Procura"));

      const dialog = screen.getByRole("dialog", { name: /Enviar Cuadro Comparativo/i }) ?? document.body;
      fireEvent.click(within(dialog as HTMLElement).getByText("Enviar a Procura"));

      expect(onSubmitComparative).toHaveBeenCalledWith("P1");
      await vi.waitFor(() => expect(screen.queryByText("Propuestas Ingresadas (1)")).not.toBeInTheDocument());
    } finally {
      restoreSize();
      restoreRO();
    }
  });
});
