/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para RejectedPetitionDetailModal — modal de solo lectura
 * con motivo (siempre), observaciones (solo si existen) y correcciones
 * adjuntadas por Cierre de Obra (solo si existen documentos CORRECCION).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RejectedPetitionDetailModal from "@/views/InfraestructuraMantenimientoPanel/components/RejectedPetitionDetailModal";
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
  },
}));

vi.mock("react-dom", () => ({ createPortal: (content: React.ReactNode) => content }));

vi.mock("@/services/api", () => ({
  apiFetch: vi.fn(),
  apiDownload: vi.fn(),
}));

afterEach(() => vi.restoreAllMocks());

const project: Project = {
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
};

const baseLog: AuditLog = {
  id: "LOG-1",
  projectId: "PRJ-010",
  projectTitle: "Remodelación depósito",
  role: "CIERRE_DE_OBRA",
  userName: "Ana Cierre",
  action: "Rechazo de petición de obra",
  timestamp: "2026-08-10 10:00:00",
  details: "La descripción no detalla el alcance del trabajo.",
};

function renderModal(props: Partial<React.ComponentProps<typeof RejectedPetitionDetailModal>> = {}) {
  render(
    <ToastProvider>
      <RejectedPetitionDetailModal project={project} log={baseLog} authToken="test-token" onClose={vi.fn()} {...props} />
    </ToastProvider>,
  );
}

describe("RejectedPetitionDetailModal", () => {
  it("muestra siempre el motivo del rechazo", () => {
    renderModal();
    expect(screen.getByText("La descripción no detalla el alcance del trabajo.")).toBeInTheDocument();
    expect(screen.getByText(/Ana Cierre/)).toBeInTheDocument();
  });

  it("no muestra la sección de observaciones si no existen", () => {
    renderModal();
    expect(screen.queryByText("Observaciones")).not.toBeInTheDocument();
  });

  it("muestra las observaciones si existen", () => {
    renderModal({ log: { ...baseLog, observations: "Revisar también la cubicación de concreto." } });
    expect(screen.getByText("Observaciones")).toBeInTheDocument();
    expect(screen.getByText("Revisar también la cubicación de concreto.")).toBeInTheDocument();
  });

  it("no muestra la sección de correcciones si no hay documentos CORRECCION", () => {
    renderModal();
    expect(screen.queryByText("Correcciones adjuntadas por Cierre de Obra")).not.toBeInTheDocument();
  });

  it("muestra las correcciones adjuntadas si existen", () => {
    renderModal({
      project: {
        ...project,
        documents: [
          ...project.documents!,
          { id: 2, documentType: "CORRECCION", originalName: "correccion.pdf", documentGroupId: 2, versionNumber: 1 },
        ],
      },
    });
    expect(screen.getByText("Correcciones adjuntadas por Cierre de Obra")).toBeInTheDocument();
    expect(screen.getByText("correccion.pdf")).toBeInTheDocument();
  });

  it("muestra un mensaje cuando no hay log de rechazo disponible", () => {
    renderModal({ log: undefined });
    expect(screen.getByText("Motivo no disponible.")).toBeInTheDocument();
  });
});
