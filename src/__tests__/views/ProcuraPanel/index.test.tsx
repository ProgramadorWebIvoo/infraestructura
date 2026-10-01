/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ProcuraPanel: indicador "Listas para Finanzas" y banner que avisa a Procura
 * cuando Presidencia aprobó adjudicaciones pendientes de enviar a Finanzas.
 * Las secciones hijas se simulan — acá solo se verifica la orquestación.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProcuraPanel from "@/views/ProcuraPanel";
import { ProjectStatus, type Project } from "@/types";

const { mockFilterTabs } = vi.hoisted(() => ({
  mockFilterTabs: vi.fn(<T,>(_view: string, tabs: T[]): T[] => tabs),
}));

vi.mock("@/hooks/useTabAccess", () => ({
  useTabAccess: () => ({ filterTabs: mockFilterTabs, isLoadingTabs: false }),
  useSyncActiveTab: () => {},
}));

vi.mock("@/components/UI/RateModeSwitch", () => ({ default: () => null }));
vi.mock("@/views/ProcuraPanel/components/InvestmentApprovalSection", () => ({ default: () => <div>seccion-autorizacion</div> }));
vi.mock("@/views/ProcuraPanel/components/BidEvaluationSection", () => ({ default: () => <div>seccion-comparativa</div> }));
vi.mock("@/views/ProcuraPanel/components/SendToFinanceSection", () => ({ default: () => <div>seccion-finanzas</div> }));
vi.mock("@/views/ProcuraPanel/components/FiniquitoRequestSection", () => ({ default: () => <div>seccion-finiquito</div> }));

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "PRJ-1",
    title: "Obra de ejemplo",
    type: "INFRAESTRUCTURA",
    description: "Descripción",
    location: "Sede Central",
    createdDate: "2026-01-01",
    status: ProjectStatus.APROBADO_PRESIDENCIA,
    materials: [],
    estimatedTotal: 10000,
    ...overrides,
  };
}

function renderPanel(projects: Project[]) {
  const noop = vi.fn();
  return render(
    <ProcuraPanel
      projects={projects}
      onApproveInvestment={noop}
      onSendToReevaluation={vi.fn()}
      onSelectContractor={vi.fn()}
      onRejectProposals={noop}
      onSendToFinance={vi.fn()}
      closureActions={{} as never}
      authToken="authenticated"
    />,
  );
}

describe("ProcuraPanel — aviso de adjudicaciones listas para Finanzas", () => {
  beforeEach(() => {
    mockFilterTabs.mockImplementation(<T,>(_view: string, tabs: T[]): T[] => tabs);
  });

  it("muestra el indicador con el conteo de obras aprobadas por Presidencia", () => {
    renderPanel([makeProject({ id: "A" }), makeProject({ id: "B" }), makeProject({ id: "C", status: ProjectStatus.CONTRATADO })]);

    expect(screen.getByText("Listas para Finanzas")).toBeInTheDocument();
  });

  it("muestra el banner con singular/plural según la cantidad", () => {
    const { unmount } = renderPanel([makeProject({ id: "A" })]);
    expect(screen.getByRole("alert")).toHaveTextContent("Presidencia aprobó 1 adjudicación");
    unmount();

    renderPanel([makeProject({ id: "A" }), makeProject({ id: "B" })]);
    expect(screen.getByRole("alert")).toHaveTextContent("Presidencia aprobó 2 adjudicaciones");
  });

  it("no muestra banner si no hay obras aprobadas por Presidencia", () => {
    renderPanel([makeProject({ status: ProjectStatus.PENDIENTE_PRESIDENCIA }), makeProject({ id: "B", status: ProjectStatus.CONTRATADO })]);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("el enlace del banner lleva a la pestaña Envío a Finanzas y el banner desaparece", () => {
    renderPanel([makeProject()]);

    expect(screen.getByText("seccion-autorizacion")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ir a Envío a Finanzas" }));

    expect(screen.getByText("seccion-finanzas")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("no muestra banner si el usuario no tiene acceso a la pestaña Envío a Finanzas", () => {
    mockFilterTabs.mockImplementation(<T extends { key: string }>(_view: string, tabs: T[]): T[] => tabs.filter((t) => t.key !== "finanzas"));

    renderPanel([makeProject()]);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
