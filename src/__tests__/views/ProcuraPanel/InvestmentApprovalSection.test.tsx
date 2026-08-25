/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para InvestmentApprovalSection — verifica la migración
 * del grid de tarjetas hecho a mano (antes <button> con clases replicando el
 * look de GridCard) al componente GridView real, con Table como alternativa
 * vía TableToolbar.viewToggle (mismo patrón que RequestsTableSection).
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InvestmentApprovalSection from "@/views/ProcuraPanel/components/InvestmentApprovalSection";
import { ToastProvider } from "@/components/UI/Toast";
import type { Project } from "@/types";
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

function renderSection(props: React.ComponentProps<typeof InvestmentApprovalSection>) {
  return render(
    <ToastProvider>
      <InvestmentApprovalSection {...props} />
    </ToastProvider>,
  );
}

const makeProject = (over: Partial<Project> & { id: string }): Project => ({
  title: "Obra de prueba",
  type: "INFRAESTRUCTURA",
  description: "",
  location: "Tienda Chacao",
  createdDate: "2026-07-01",
  status: ProjectStatus.REVISADO_CIERRE,
  materials: [{ id: "m1", name: "Cemento", quantity: 2, unit: "Saco", estimatedUnitPrice: 10, condition: "NUEVO" }],
  estimatedTotal: 500,
  ...over,
});

describe("InvestmentApprovalSection — vista Grid (default)", () => {
  it("arranca en vista Grid y muestra las tarjetas vía GridView (no un <button> hecho a mano)", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const projects = [
        makeProject({ id: "P1", title: "Remodelación de oficinas" }),
        makeProject({ id: "P2", title: "Cambio de luminarias" }),
      ];
      renderSection({ projects, authToken: "token", onApproveInvestment: vi.fn() });

      expect(screen.getByText("Remodelación de oficinas")).toBeInTheDocument();
      expect(screen.getByText("Cambio de luminarias")).toBeInTheDocument();
      expect(screen.getByLabelText("Vista de grid")).toHaveAttribute("aria-pressed", "true");
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("abre el wizard de autorización al seleccionar una tarjeta", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const projects = [makeProject({ id: "P1", title: "Remodelación de oficinas" })];
      renderSection({ projects, authToken: "token", onApproveInvestment: vi.fn() });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));

      expect(screen.getByText("Autorización de Inversión")).toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });
});

describe("InvestmentApprovalSection — vista Tabla", () => {
  it("permite alternar a la vista de tabla con el toggle y usa el componente Table real", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const projects = [makeProject({ id: "P1", estimatedTotal: 1234 })];
      renderSection({ projects, authToken: "token", onApproveInvestment: vi.fn() });

      fireEvent.click(screen.getByLabelText("Vista de tabla"));

      expect(screen.getByLabelText("Vista de tabla")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("$1,234.00")).toBeInTheDocument();
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
      renderSection({ projects, authToken: "token", onApproveInvestment: vi.fn() });
      fireEvent.click(screen.getByLabelText("Vista de tabla"));

      fireEvent.change(screen.getByLabelText("Buscar peticiones listas para Procura"), { target: { value: "luminarias" } });

      expect(screen.getByText("Cambio de luminarias")).toBeInTheDocument();
      expect(screen.queryByText("Remodelación de oficinas")).not.toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("filtra únicamente proyectos en estado REVISADO_CIERRE", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const projects = [
        makeProject({ id: "P1", status: ProjectStatus.REVISADO_CIERRE }),
        makeProject({ id: "P2", status: ProjectStatus.EN_EJECUCION }),
      ];
      renderSection({ projects, authToken: "token", onApproveInvestment: vi.fn() });
      fireEvent.click(screen.getByLabelText("Vista de tabla"));

      expect(screen.getByText("P1")).toBeInTheDocument();
      expect(screen.queryByText("P2")).not.toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("muestra empty state cuando no hay peticiones pendientes", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      renderSection({ projects: [], authToken: "token", onApproveInvestment: vi.fn() });
      fireEvent.click(screen.getByLabelText("Vista de tabla"));

      expect(screen.getByText("No hay nuevas peticiones aprobadas por Cierre de Obra esperando tope presupuestario.")).toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });
});

describe("InvestmentApprovalSection — retroalimentación de la evaluación IA de Cierre de Obra", () => {
  it("muestra el panel completo de evaluación IA (score, resumen, alertas, monto sugerido) cuando el expediente fue evaluado", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const project = makeProject({
        id: "P1",
        title: "Remodelación de oficinas",
        dossierAiScore: 82,
        dossierAiSummary: "Expediente completo con cubicación consistente.",
        dossierAiAlerts: ["Falta un plano de detalle eléctrico."],
        dossierAiRecommendation: "Aprobar con seguimiento del plano faltante.",
        dossierAiSuggestedAmount: 4800,
        dossierAiCompletenessFactors: { documentation: 90, budgetConsistency: 80, rejectionRisk: 20 },
        dossierAiProvider: "chatgpt",
        dossierAiEvaluatedAt: "2026-08-20T10:00:00.000000Z",
      });
      renderSection({ projects: [project], authToken: "token", onApproveInvestment: vi.fn() });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));

      expect(screen.getByText("Evaluación IA del Expediente")).toBeInTheDocument();
      expect(screen.getByText("82")).toBeInTheDocument();
      expect(screen.getByText("Expediente completo con cubicación consistente.")).toBeInTheDocument();
      expect(screen.getByText("Falta un plano de detalle eléctrico.")).toBeInTheDocument();
      expect(screen.getByText("Aprobar con seguimiento del plano faltante.")).toBeInTheDocument();
      // Monto sugerido: a diferencia de Cierre de Obra, en Procura sí se
      // muestra dentro del panel (showSuggestedAmount).
      expect(screen.getByText("Monto sugerido por IA")).toBeInTheDocument();
      expect(screen.getByText("$4,800.00")).toBeInTheDocument();
      // No hay botón "Reevaluar" — Procura consulta la evaluación ya hecha
      // por Cierre de Obra, no la dispara ni la repite.
      expect(screen.queryByRole("button", { name: /Reevaluar/ })).not.toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("no muestra el panel de evaluación IA cuando el expediente no fue evaluado", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const project = makeProject({ id: "P1", title: "Remodelación de oficinas" });
      renderSection({ projects: [project], authToken: "token", onApproveInvestment: vi.fn() });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));

      expect(screen.queryByText("Evaluación IA del Expediente")).not.toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("muestra el monto sugerido por IA como referencia en el Paso 2, sin autocompletar el campo de inversión aprobada", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const project = makeProject({
        id: "P1",
        title: "Remodelación de oficinas",
        estimatedTotal: 500,
        dossierAiSuggestedAmount: 4800,
        dossierAiEvaluatedAt: "2026-08-20T10:00:00.000000Z",
      });
      renderSection({ projects: [project], authToken: "token", onApproveInvestment: vi.fn() });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));
      fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));

      expect(screen.getByText("Sugerido por IA (referencial)")).toBeInTheDocument();
      // El campo sigue precargado con el estimado de Cierre de Obra (500),
      // no con el monto sugerido por IA (4800) — nunca se autocompleta.
      expect(document.getElementById("procura-approved-amount")).toHaveValue(500);
    } finally {
      restoreSize();
      restoreRO();
    }
  });
});

describe("InvestmentApprovalSection — Stepper (componente compartido)", () => {
  it("usa el Stepper genérico con los 2 pasos del wizard", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const project = makeProject({ id: "P1", title: "Remodelación de oficinas" });
      renderSection({ projects: [project], authToken: "token", onApproveInvestment: vi.fn() });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));

      expect(screen.getByRole("list", { name: "Progreso de autorización" })).toBeInTheDocument();
      expect(screen.getByText("Revisar")).toBeInTheDocument();
      expect(screen.getByText("Autorizar")).toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("permite volver al paso 1 haciendo click en el Stepper (no solo con el botón Atrás)", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const project = makeProject({ id: "P1", title: "Remodelación de oficinas" });
      renderSection({ projects: [project], authToken: "token", onApproveInvestment: vi.fn() });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));
      fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
      expect(screen.getByLabelText("Notas de Aprobación de Presupuesto")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Revisar"));

      expect(screen.queryByLabelText("Notas de Aprobación de Presupuesto")).not.toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("muestra el RequiredMark de campo obligatorio en Inversión Aprobada y Notas de Aprobación", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const project = makeProject({ id: "P1", title: "Remodelación de oficinas" });
      renderSection({ projects: [project], authToken: "token", onApproveInvestment: vi.fn() });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));
      fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));

      // El campo de monto arranca precargado con el estimado (> 0) — el
      // RequiredMark ya se ve "válido"; el de notas arranca vacío.
      expect(screen.getByLabelText("Campo obligatorio completo")).toBeInTheDocument();
      expect(screen.getByLabelText("Campo obligatorio pendiente")).toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("muestra el HelpHint junto al monto sugerido por IA cuando existe", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const project = makeProject({
        id: "P1",
        title: "Remodelación de oficinas",
        dossierAiSuggestedAmount: 4800,
        dossierAiEvaluatedAt: "2026-08-20T10:00:00.000000Z",
      });
      renderSection({ projects: [project], authToken: "token", onApproveInvestment: vi.fn() });

      fireEvent.click(screen.getByText("Remodelación de oficinas"));
      fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));

      expect(screen.getByLabelText("Ayuda")).toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });
});
