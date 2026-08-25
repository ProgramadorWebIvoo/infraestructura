/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para RejectedPetitionsSection — muestra peticiones
 * rechazadas con motivo (desde AuditLog) y permite editar y reenviar.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RejectedPetitionsSection from "@/views/InfraestructuraMantenimientoPanel/components/RejectedPetitionsSection";
import { ToastProvider } from "@/components/UI/Toast";
import { ProjectStatus } from "@/types";
import type { AuditLog, Project } from "@/types";

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
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <p {...rest}>{children}</p>;
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

vi.mock("react-dom", () => ({ createPortal: (content: React.ReactNode) => content }));

vi.mock("@/hooks/useAppGroupSettings", () => ({
  useAppGroupSettings: () => ({ maxFileSizeBytes: 10 * 1024 * 1024 }),
}));

vi.mock("@/services/api", () => ({
  apiFetch: vi.fn(),
  apiDownload: vi.fn(),
}));

afterEach(() => vi.restoreAllMocks());

const materialsCatalog = [{ name: "Cemento", unit: "Saco", estimatedUnitPrice: 12.5 }];

function makeRejectedProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "PRJ-010",
    title: "Remodelación depósito",
    type: "INFRAESTRUCTURA",
    description: "Descripción original",
    location: "CD Central",
    createdDate: "2026-08-01",
    status: ProjectStatus.RECHAZADO_CIERRE,
    materials: [{ id: "m1", name: "Cemento", quantity: 1, unit: "Saco", estimatedUnitPrice: 10, condition: "NUEVO" }],
    estimatedTotal: 10,
    documents: [
      { id: 1, documentType: "FOTO", originalName: "foto1.png", documentGroupId: 1, versionNumber: 1 },
    ],
    ...overrides,
  };
}

const rejectionLog: AuditLog = {
  id: "LOG-1",
  projectId: "PRJ-010",
  projectTitle: "Remodelación depósito",
  role: "CIERRE_DE_OBRA",
  userName: "Ana Cierre",
  action: "Rechazo de petición de obra",
  timestamp: "2026-08-10 10:00:00",
  details: "La descripción no detalla el alcance del trabajo.",
};

describe("RejectedPetitionsSection", () => {
  it("muestra un estado vacío (no se autoculta) si no hay peticiones rechazadas", () => {
    render(
      <RejectedPetitionsSection
        projects={[]}
        auditLogs={[]}
        materialsCatalog={materialsCatalog}
        authToken="test-token"
        onResubmitProject={vi.fn()}
        onDeleteDocument={vi.fn()}
        defaultViewMode="table"
      />,
    );
    expect(screen.getByText("Peticiones Rechazadas")).toBeInTheDocument();
    expect(screen.getByText("No hay peticiones rechazadas.")).toBeInTheDocument();
  });

  it("muestra la petición rechazada con su motivo desde AuditLog", () => {
    render(
      <RejectedPetitionsSection
        projects={[makeRejectedProject()]}
        auditLogs={[rejectionLog]}
        materialsCatalog={materialsCatalog}
        authToken="test-token"
        onResubmitProject={vi.fn()}
        onDeleteDocument={vi.fn()}
        defaultViewMode="table"
      />,
    );

    expect(screen.getByText("PRJ-010")).toBeInTheDocument();
    expect(screen.getByText("Remodelación depósito")).toBeInTheDocument();
    expect(screen.getByText("La descripción no detalla el alcance del trabajo.")).toBeInTheDocument();
  });

  it("no muestra proyectos que no están rechazados", () => {
    render(
      <RejectedPetitionsSection
        projects={[makeRejectedProject({ id: "PRJ-011", status: ProjectStatus.CREADO })]}
        auditLogs={[]}
        materialsCatalog={materialsCatalog}
        authToken="test-token"
        onResubmitProject={vi.fn()}
        onDeleteDocument={vi.fn()}
        defaultViewMode="table"
      />,
    );
    expect(screen.queryByText("PRJ-011")).not.toBeInTheDocument();
  });

  it("abre el modal de edición y precarga los datos del proyecto rechazado", () => {
    render(
      <ToastProvider>
        <RejectedPetitionsSection
          projects={[makeRejectedProject()]}
          auditLogs={[rejectionLog]}
          materialsCatalog={materialsCatalog}
          authToken="test-token"
          onResubmitProject={vi.fn()}
          onDeleteDocument={vi.fn()}
          defaultViewMode="table"
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Editar y reenviar/ }));

    expect(screen.getByLabelText("Título de la Obra")).toHaveValue("Remodelación depósito");
    expect(screen.getByLabelText("Ubicación / Tienda / CD")).toHaveValue("CD Central");
    expect(screen.getByText("No editable al reenviar")).toBeInTheDocument();
  });

  it("llama onResubmitProject con el mismo project id al reenviar", async () => {
    const onResubmitProject = vi.fn().mockResolvedValue({ ok: true, partial: false, failedGroups: [] });
    render(
      <ToastProvider>
        <RejectedPetitionsSection
          projects={[makeRejectedProject()]}
          auditLogs={[rejectionLog]}
          materialsCatalog={materialsCatalog}
          authToken="test-token"
          onResubmitProject={onResubmitProject}
          onDeleteDocument={vi.fn()}
          defaultViewMode="table"
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Editar y reenviar/ }));
    // Datos y materiales ya vienen precargados del proyecto rechazado — solo
    // hace falta avanzar los 2 pasos restantes hasta Adjuntos.
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    fireEvent.click(screen.getByRole("button", { name: /Reenviar Petición a Cierre de Obra/ }));

    expect(onResubmitProject).toHaveBeenCalledWith(
      "PRJ-010",
      expect.objectContaining({ title: "Remodelación depósito", location: "CD Central" }),
      { photos: [], documents: [], plans: [] },
      [{ id: 1, documentType: "FOTO", originalName: "foto1.png", documentGroupId: 1, versionNumber: 1 }],
    );
  });

  it("abre el modal de detalle con motivo, observaciones y correcciones al hacer click en Ver petición", () => {
    const logWithObservations: AuditLog = {
      ...rejectionLog,
      observations: "Revisar también la cubicación de concreto.",
    };
    render(
      <ToastProvider>
        <RejectedPetitionsSection
          projects={[
            makeRejectedProject({
              documents: [
                { id: 1, documentType: "FOTO", originalName: "foto1.png", documentGroupId: 1, versionNumber: 1 },
                { id: 2, documentType: "CORRECCION", originalName: "correccion.pdf", documentGroupId: 2, versionNumber: 1 },
              ],
            }),
          ]}
          auditLogs={[logWithObservations]}
          materialsCatalog={materialsCatalog}
          authToken="test-token"
          onResubmitProject={vi.fn()}
          onDeleteDocument={vi.fn()}
          defaultViewMode="table"
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ver petición/ }));

    expect(screen.getByText("Detalle de Petición Rechazada")).toBeInTheDocument();
    expect(screen.getAllByText("La descripción no detalla el alcance del trabajo.").length).toBeGreaterThan(0);
    expect(screen.getByText("Revisar también la cubicación de concreto.")).toBeInTheDocument();
    expect(screen.getByText("correccion.pdf")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Vista Grid — es la que arranca por defecto (defaultViewMode="grid").
// Mismo stub que RequestsTableSection.test.tsx/GridView.test.tsx: el
// ResizeObserver global de test/setup.ts es un no-op y @tanstack/react-virtual
// mide el scroll element vía offsetWidth/offsetHeight.
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

describe("RejectedPetitionsSection — vista Grid (default)", () => {
  it("arranca en vista Grid por defecto y muestra la tarjeta de la petición rechazada", () => {
    const restoreRO = stubSyncResizeObserver();
    const restoreSize = stubContainerSize(900, 600);
    try {
      render(
        <RejectedPetitionsSection
          projects={[makeRejectedProject()]}
          auditLogs={[rejectionLog]}
          materialsCatalog={materialsCatalog}
          authToken="test-token"
          onResubmitProject={vi.fn()}
          onDeleteDocument={vi.fn()}
        />,
      );

      expect(screen.getByText("Remodelación depósito")).toBeInTheDocument();
      expect(screen.getByText("La descripción no detalla el alcance del trabajo.")).toBeInTheDocument();
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
      render(
        <RejectedPetitionsSection
          projects={[makeRejectedProject()]}
          auditLogs={[rejectionLog]}
          materialsCatalog={materialsCatalog}
          authToken="test-token"
          onResubmitProject={vi.fn()}
          onDeleteDocument={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByLabelText("Vista de tabla"));

      expect(screen.getByLabelText("Vista de tabla")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("PRJ-010")).toBeInTheDocument();
    } finally {
      restoreSize();
      restoreRO();
    }
  });
});
