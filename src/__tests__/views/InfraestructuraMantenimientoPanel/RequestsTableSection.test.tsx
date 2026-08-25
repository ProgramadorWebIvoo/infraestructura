/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para RequestsTableSection — verifica la tabla consultable
 * de peticiones: estado legible (StatusBadge), montos formateados, búsqueda,
 * filtro por etapa (controlado) y empty state.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RequestsTableSection from "@/views/InfraestructuraMantenimientoPanel/components/RequestsTableSection";
import type { Project } from "@/types";
import { ProjectStatus } from "@/types";

vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <span {...rest}>{children}</span>;
    },
    tbody: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <tbody {...rest}>{children}</tbody>;
    },
    tr: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, layout, ...rest } = props;
      return <tr {...rest}>{children}</tr>;
    },
  },
}));

vi.mock("react-dom", () => ({
  createPortal: (content: React.ReactNode) => content,
}));

const makeProject = (over: Partial<Project> & { id: string }): Project => ({
  title: "Obra de prueba",
  type: "INFRAESTRUCTURA",
  description: "",
  location: "Tienda Chacao",
  createdDate: "2026-07-01",
  status: ProjectStatus.CREADO,
  materials: [{ id: "m1", name: "Cemento", quantity: 2, unit: "Saco", estimatedUnitPrice: 10, condition: "NUEVO" }],
  estimatedTotal: 500,
  ...over,
});

describe("RequestsTableSection", () => {
  it("muestra la tabla con estado legible y montos formateados", () => {
    const projects = [
      makeProject({ id: "P1", status: ProjectStatus.CREADO }),
      makeProject({
        id: "P2",
        title: "Reparación de techo",
        type: "MANTENIMIENTO",
        location: "CD Central",
        status: ProjectStatus.EN_EJECUCION,
        estimatedTotal: 1200,
      }),
    ];

    render(
      <RequestsTableSection
        projects={projects}
        stageKey="todas"
        onStageKeyChange={vi.fn()}
        defaultViewMode="table"
      />,
    );

    expect(screen.getByText("Creado")).toBeInTheDocument();
    expect(screen.getByText("En Ejecución")).toBeInTheDocument();
    expect(screen.getByText("$1,200.00")).toBeInTheDocument();
    expect(screen.getByText("$500.00")).toBeInTheDocument();
  });

  it("filtra por búsqueda de título", () => {
    const projects = [
      makeProject({ id: "P1", title: "Remodelación de oficinas" }),
      makeProject({ id: "P2", title: "Cambio de luminarias" }),
    ];

    render(
      <RequestsTableSection
        projects={projects}
        stageKey="todas"
        onStageKeyChange={vi.fn()}
        defaultViewMode="table"
      />,
    );
    fireEvent.change(screen.getByLabelText("Buscar peticiones"), { target: { value: "luminarias" } });

    expect(screen.getByText("Cambio de luminarias")).toBeInTheDocument();
    expect(screen.queryByText("Remodelación de oficinas")).not.toBeInTheDocument();
  });

  it("filtra por etapa (estado controlado por el padre)", () => {
    const projects = [
      makeProject({ id: "P1", status: ProjectStatus.CREADO }),
      makeProject({ id: "P2", status: ProjectStatus.EN_EJECUCION }),
    ];

    render(
      <RequestsTableSection
        projects={projects}
        stageKey="ejecucion"
        onStageKeyChange={vi.fn()}
        defaultViewMode="table"
      />,
    );

    expect(screen.getByText("P2")).toBeInTheDocument();
    expect(screen.queryByText("P1")).not.toBeInTheDocument();
  });

  it("notifica el cambio de etapa al tocar un chip del pipeline", () => {
    const onStageKeyChange = vi.fn();
    const projects = [
      makeProject({ id: "P1", status: ProjectStatus.CREADO }),
      makeProject({ id: "P2", status: ProjectStatus.EN_EJECUCION }),
    ];

    render(
      <RequestsTableSection
        projects={projects}
        stageKey="todas"
        onStageKeyChange={onStageKeyChange}
        defaultViewMode="table"
      />,
    );

    fireEvent.click(screen.getByText("Ejecución"));
    expect(onStageKeyChange).toHaveBeenCalledWith("ejecucion");
  });

  it("muestra empty state cuando no hay peticiones", () => {
    render(
      <RequestsTableSection
        projects={[]}
        stageKey="todas"
        onStageKeyChange={vi.fn()}
        defaultViewMode="table"
      />,
    );
    expect(screen.getByText("No hay peticiones registradas aún.")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Vista Grid — es la que arranca por defecto (defaultViewMode="grid").
// GridView usa @tanstack/react-virtual, que mide el scroll element vía
// offsetWidth/offsetHeight (no clientWidth/clientHeight ni getBoundingClientRect)
// — el ResizeObserver global de test/setup.ts es un no-op, así que hace
// falta un stub síncrono local (mismo patrón que GridView.test.tsx).
// ---------------------------------------------------------------------------

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

describe("RequestsTableSection — vista Grid (default)", () => {
  it("arranca en vista Grid por defecto y muestra las tarjetas de las peticiones", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const projects = [
        makeProject({ id: "P1", title: "Remodelación de oficinas" }),
        makeProject({ id: "P2", title: "Cambio de luminarias" }),
      ];
      render(<RequestsTableSection projects={projects} stageKey="todas" onStageKeyChange={vi.fn()} />);

      expect(screen.getByText("Remodelación de oficinas")).toBeInTheDocument();
      expect(screen.getByText("Cambio de luminarias")).toBeInTheDocument();
      expect(screen.getByLabelText("Vista de grid")).toHaveAttribute("aria-pressed", "true");
    } finally {
      restoreSize();
      restoreRO();
    }
  });

  it("permite volver a la vista de tabla con el toggle", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      const projects = [makeProject({ id: "P1", status: ProjectStatus.CREADO })];
      render(<RequestsTableSection projects={projects} stageKey="todas" onStageKeyChange={vi.fn()} />);

      fireEvent.click(screen.getByLabelText("Vista de tabla"));

      expect(screen.getByLabelText("Vista de tabla")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("Creado")).toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });
});
