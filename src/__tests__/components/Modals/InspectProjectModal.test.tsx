/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas del modal de inspección de proyecto — estado, snapshot
 * financiero, organigrama IVOO con avance por rol y trazabilidad 8 pasos.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InspectProjectModal from "../../../components/Modals/InspectProjectModal";
import type { Project, Proposal } from "../../../types";
import { ProjectStatus } from "../../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: "PROP-1",
    contractorCode: "C-001",
    contractorName: "Constructora Alpha",
    contractorRating: 4.7,
    materialCost: 50000,
    laborCost: 26000,
    totalCost: 76000,
    deliveryWeeks: 8,
    negotiatedAdvancePercent: 30,
    description: "Oferta completa",
    ...overrides,
  } as Proposal;
}

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "PRJ-001",
    title: "Test Project",
    type: "INFRAESTRUCTURA",
    description: "Construcción de drenaje pluvial.",
    location: "Location",
    createdDate: "2026-07-01",
    status: ProjectStatus.CREADO,
    materials: [],
    estimatedTotal: 100000,
    proposals: [],
    ...overrides,
  } as Project;
}

function renderModal(project: Project | null, isOpen = true) {
  const onClose = vi.fn();
  const utils = render(<InspectProjectModal isOpen={isOpen} project={project} onClose={onClose} />);
  return { onClose, ...utils };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("InspectProjectModal", () => {
  it("NO renderiza nada cuando isOpen=false", () => {
    renderModal(createProject(), false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renderiza título, badge e infoLine (id • tipo)", () => {
    renderModal(createProject());

    expect(screen.getByText("Expediente de Obra")).toBeInTheDocument();
    expect(screen.getByText("Test Project")).toBeInTheDocument();
    expect(screen.getByText("PRJ-001 • INFRAESTRUCTURA")).toBeInTheDocument();
  });

  it("muestra el estado actual y la metadata de la obra", () => {
    renderModal(createProject());

    expect(screen.getByText("Creado")).toBeInTheDocument(); // StatusBadge
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Apertura 2026-07-01")).toBeInTheDocument();
    expect(screen.getByText(/hace \d+d/)).toBeInTheDocument();
  });

  it("muestra el snapshot financiero con todos los montos", () => {
    const project = createProject({
      status: ProjectStatus.LISTO_PAGO_FINAL,
      approvedInvestmentAmount: 80000,
      procuraReviewNotes: "Autorizado",
      proposals: [createProposal()],
      selectedProposalId: "PROP-1",
      selectedContractorCode: "C-001",
      advancePaidAmount: 24000,
      advancePaidDate: "2026-07-10",
      finalPaidAmount: 56000,
      finalPaidDate: "2026-07-20",
    });
    renderModal(project);

    expect(screen.getAllByText("$100,000.00").length).toBeGreaterThan(0); // estimado
    expect(screen.getAllByText("$80,000.00").length).toBe(3); // tope aprobado (snapshot + timeline) + liberado total
    expect(screen.getAllByText("$76,000.00").length).toBeGreaterThan(0); // contrato final (winner) + oferta
    expect(screen.getAllByText("$24,000.00").length).toBeGreaterThan(0); // anticipo (snapshot + timeline)
    expect(screen.getAllByText("$56,000.00").length).toBeGreaterThan(0); // liquidación (snapshot + timeline)
    expect(screen.getByText("100%")).toBeInTheDocument(); // liberado vs aprobado
    expect(screen.getByText("-24.0% vs estimado")).toBeInTheDocument();
  });

  it("muestra los nodos del organigrama IVOO y la leyenda", () => {
    renderModal(createProject());

    expect(screen.getByText("PRESIDENCIA")).toBeInTheDocument();
    expect(screen.getByText("CIERRE DE OBRA")).toBeInTheDocument();
    expect(screen.getByText("GERENCIA PROCURA")).toBeInTheDocument();
    expect(screen.getByText("ANALISTAS")).toBeInTheDocument();
    expect(screen.getByText("FINANZAS")).toBeInTheDocument();
    expect(screen.getByText("BASE DE DATOS IVOO")).toBeInTheDocument();
    expect(screen.getByText("Núcleo Centralizador")).toBeInTheDocument();
    expect(screen.getByText("Infraestructura")).toBeInTheDocument();
    expect(screen.getByText("Mantenimiento")).toBeInTheDocument();
  });

  it("proyecto CREADO: Cierre de Obra en curso, resto pendiente, trazabilidad en paso 2", () => {
    renderModal(createProject());

    // Organigrama: Presidencia hecho + leyenda; Cierre en curso; Procura/Analistas/Finanzas pendientes
    expect(screen.getAllByText("Hecho").length).toBe(2); // nodo Presidencia + leyenda
    expect(screen.getAllByText("En curso").length).toBe(3); // nodo Cierre + paso 2 + leyenda
    expect(screen.getAllByText("Pendiente").length).toBe(10); // 3 nodos + pasos 3-8 (6) + leyenda

    // Trazabilidad: paso 1 completado, pasos 3-8 pendientes
    expect(screen.getAllByText("Completado").length).toBe(1);
  });

  it("proyecto COMPLETADO_PAGADO: todos los nodos hechos y trazabilidad completa", () => {
    const project = createProject({
      status: ProjectStatus.COMPLETADO_PAGADO,
      cierreObraNotes: "Planos validados",
      calculationsAdded: true,
      blueprintsCount: 2,
      approvedInvestmentAmount: 80000,
      proposals: [createProposal()],
      selectedProposalId: "PROP-1",
      selectedContractorCode: "C-001",
      advancePaidAmount: 24000,
      finalPaidAmount: 56000,
      qualityVerified: true,
      completionVerifiedDate: "2026-07-25",
    });
    renderModal(project);

    // 5 nodos hechos + leyenda
    expect(screen.getAllByText("Hecho").length).toBe(6);
    // 8 pasos completados + badge de estado "Completado"
    expect(screen.getAllByText("Completado").length).toBe(9);
  });

  it("lista las ofertas recibidas con contratista, rating y monto", () => {
    const project = createProject({
      status: ProjectStatus.COMPARATIVA_ENVIADA,
      proposals: [createProposal(), createProposal({ id: "PROP-2", contractorCode: "C-002", contractorName: "Beta S.A.", totalCost: 82000, deliveryWeeks: 12, contractorRating: 4.2 })],
    });
    renderModal(project);

    expect(screen.getByText("Constructora Alpha (C-001)")).toBeInTheDocument();
    expect(screen.getByText("Beta S.A. (C-002)")).toBeInTheDocument();
    expect(screen.getByText("$76,000.00")).toBeInTheDocument();
    expect(screen.getByText("$82,000.00")).toBeInTheDocument();
    expect(screen.getAllByText("4.7").length).toBeGreaterThan(0);
    expect(screen.getByText("8 sem")).toBeInTheDocument();
    expect(screen.getByText("12 sem")).toBeInTheDocument();
  });

  it("muestra el proveedor adjudicado con detalle del ganador", () => {
    const project = createProject({
      status: ProjectStatus.CONTRATADO,
      proposals: [createProposal()],
      selectedProposalId: "PROP-1",
      selectedContractorCode: "C-001",
    });
    renderModal(project);

    expect(screen.getByText("Proveedor Adjudicado: C-001")).toBeInTheDocument();
    expect(screen.getByText(/Constructora Alpha · \$76,000\.00/)).toBeInTheDocument();
  });

  it("el botón 'Entendido' cierra el modal", () => {
    const { onClose } = renderModal(createProject());

    fireEvent.click(screen.getByText("Entendido"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("muestra estado vacío cuando no hay proyecto", () => {
    renderModal(null);
    expect(screen.getByText("Proyecto no disponible.")).toBeInTheDocument();
  });
});
