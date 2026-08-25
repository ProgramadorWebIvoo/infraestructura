/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para TechnicalReviewSection — enfocadas en el flujo de
 * rechazo de la petición (nuevo), no en la revisión técnica completa (sin
 * cobertura previa a este cambio).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TechnicalReviewSection from "@/views/CierreObraPanel/components/TechnicalReviewSection";
import { ToastProvider } from "@/components/UI/Toast";
import { ProjectStatus } from "@/types";
import type { Project } from "@/types";

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

vi.mock("react-dom", () => ({ createPortal: (content: React.ReactNode) => content }));

vi.mock("@/hooks/useAppGroupSettings", () => ({
  useAppGroupSettings: () => ({ maxFileSizeBytes: 10 * 1024 * 1024 }),
}));

vi.mock("@/services/api", () => ({
  apiFetch: vi.fn(),
  apiDownload: vi.fn(),
}));

// DossierEvaluationPanel dispara evaluateDossier() automáticamente al montar
// el paso 1 — se mockea para que rechace y el panel caiga al estado "sin
// evaluación" en vez de intentar red real / romper por undefined.
vi.mock("@/services/aiEvaluationService", () => ({
  evaluateDossier: vi.fn().mockRejectedValue(new Error("not configured in this test")),
}));

afterEach(() => vi.restoreAllMocks());

// GridView (vista por defecto de TechnicalReviewSection) usa
// @tanstack/react-virtual, que mide el scroll element vía
// offsetWidth/offsetHeight (no clientWidth/clientHeight ni
// getBoundingClientRect) — el ResizeObserver global de test/setup.ts es un
// no-op, así que hace falta un stub síncrono local (mismo patrón que
// GridView.test.tsx / RequestsTableSection.test.tsx).
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

const pendingProject: Project = {
  id: "PRJ-020",
  title: "Petición pendiente",
  type: "INFRAESTRUCTURA",
  description: "Descripción",
  location: "CD Central",
  createdDate: "2026-08-01",
  status: ProjectStatus.CREADO,
  materials: [{ id: "m1", name: "Cemento", quantity: 1, unit: "Saco", estimatedUnitPrice: 10, condition: "NUEVO" }],
  estimatedTotal: 10,
};

let restoreRO: () => void;
let restoreSize: () => void;

beforeEach(() => {
  restoreRO = stubSyncResizeObserver();
  restoreSize = stubContainerSize(900, 600);
});

afterEach(() => {
  restoreSize();
  restoreRO();
});

function renderSection(
  onRejectProject = vi.fn().mockResolvedValue({ ok: true, partial: false, failedGroups: [] }),
  onReviewProject = vi.fn(),
  projects: Project[] = [pendingProject],
) {
  render(
    <ToastProvider>
      <TechnicalReviewSection
        projects={projects}
        authToken="test-token"
        onReviewProject={onReviewProject}
        onRejectProject={onRejectProject}
        onSyncProject={vi.fn()}
      />
    </ToastProvider>,
  );
  return { onRejectProject, onReviewProject };
}

describe("TechnicalReviewSection — rechazo de petición", () => {
  it("abre el modal de rechazo desde el paso 1 del wizard de revisión", () => {
    renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));
    fireEvent.click(screen.getByRole("button", { name: /Rechazar/ }));

    expect(screen.getByText("Motivo del rechazo")).toBeInTheDocument();
  });

  it("no permite confirmar el rechazo sin motivo", () => {
    renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));
    fireEvent.click(screen.getByRole("button", { name: /Rechazar/ }));

    expect(screen.getByRole("button", { name: /Confirmar rechazo/ })).toBeDisabled();
  });

  it("llama onRejectProject con el motivo y cierra el wizard", async () => {
    const { onRejectProject } = renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));
    fireEvent.click(screen.getByRole("button", { name: /Rechazar/ }));

    fireEvent.change(screen.getByLabelText("Motivo del rechazo"), {
      target: { value: "Descripción insuficiente." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar rechazo/ }));

    expect(onRejectProject).toHaveBeenCalledWith("PRJ-020", "Descripción insuficiente.", "", []);
  });

  it("permite escribir observaciones opcionales y las envía junto con el motivo", async () => {
    const { onRejectProject } = renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));
    fireEvent.click(screen.getByRole("button", { name: /Rechazar/ }));

    fireEvent.change(screen.getByLabelText("Motivo del rechazo"), {
      target: { value: "Descripción insuficiente." },
    });
    fireEvent.change(screen.getByLabelText("Observaciones (opcional)"), {
      target: { value: "Revisar también la cubicación de concreto." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar rechazo/ }));

    expect(onRejectProject).toHaveBeenCalledWith(
      "PRJ-020",
      "Descripción insuficiente.",
      "Revisar también la cubicación de concreto.",
      [],
    );
  });
});

describe("TechnicalReviewSection — Tabla/Grid (TableToolbar + GridView)", () => {
  it("arranca en vista Grid y muestra las tarjetas vía GridView", () => {
    renderSection();

    expect(screen.getByText(pendingProject.title)).toBeInTheDocument();
    expect(screen.getByLabelText("Vista de grid")).toHaveAttribute("aria-pressed", "true");
  });

  it("permite alternar a la vista de tabla con el toggle", () => {
    renderSection();

    fireEvent.click(screen.getByLabelText("Vista de tabla"));

    expect(screen.getByLabelText("Vista de tabla")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(pendingProject.title)).toBeInTheDocument();
  });

  it("filtra por búsqueda de título/ID/ubicación", () => {
    const other: Project = { ...pendingProject, id: "PRJ-021", title: "Cambio de luminarias" };
    renderSection(undefined, undefined, [pendingProject, other]);

    fireEvent.change(screen.getByLabelText("Buscar expedientes pendientes de revisión"), {
      target: { value: "luminarias" },
    });

    expect(screen.getByText("Cambio de luminarias")).toBeInTheDocument();
    expect(screen.queryByText(pendingProject.title)).not.toBeInTheDocument();
  });

  it("abre el wizard de revisión al seleccionar una tarjeta del Grid", () => {
    renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));

    expect(screen.getByRole("button", { name: /Rechazar/ })).toBeInTheDocument();
  });
});

describe("TechnicalReviewSection — revisión (auditoría, sin subida de archivos)", () => {
  it("el paso 1 no precarga texto en Notas de Revisión — placeholder vacío", () => {
    renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));

    expect(screen.getByLabelText("Notas de Revisión y Corrección (opcional)")).toHaveValue("");
  });

  it("permite confirmar la revisión sin escribir notas ni requerir archivos adjuntos", async () => {
    const { onReviewProject } = renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ })); // paso 2
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ })); // paso 3
    fireEvent.click(screen.getByRole("button", { name: /Guardar y Enviar a Procura/ }));

    expect(onReviewProject).toHaveBeenCalledWith("PRJ-020", "");
  });

  it("el paso 2 no ofrece subir archivos — es de solo revisión", () => {
    renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));

    expect(screen.queryByText("Hoja de Cálculo / Cubicaciones")).not.toBeInTheDocument();
    expect(screen.queryByText("Planos de Ingeniería")).not.toBeInTheDocument();
  });

  it("el paso 2 muestra un estado vacío cuando la petición no trae adjuntos", () => {
    renderSection();

    fireEvent.click(screen.getByText(pendingProject.title));
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));

    expect(screen.getByText(/no trae fotos, cálculos ni planos adjuntos/)).toBeInTheDocument();
  });

  it("muestra el detalle de cada material: condición, marca y garantía", () => {
    renderSection(undefined, undefined, [
      {
        ...pendingProject,
        materials: [
          {
            id: "m1",
            name: "Bomba de agua",
            quantity: 2,
            unit: "unidad",
            estimatedUnitPrice: 100,
            condition: "USADO",
            brand: "Pedrollo",
            warrantyValue: 6,
            warrantyUnit: "MESES",
          },
        ],
      },
    ]);

    fireEvent.click(screen.getByText(pendingProject.title));

    expect(screen.getByText("Bomba de agua")).toBeInTheDocument();
    expect(screen.getByText("Usado")).toBeInTheDocument();
    expect(screen.getByText("Pedrollo")).toBeInTheDocument();
    expect(screen.getByText(/Garantía: 6 meses/)).toBeInTheDocument();
  });
});
