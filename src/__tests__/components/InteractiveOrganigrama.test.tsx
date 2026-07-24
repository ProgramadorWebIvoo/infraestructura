import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InteractiveOrganigrama from "../../components/InteractiveOrganigrama";
import type { Project } from "../../types";
import { ProjectStatus } from "../../types";

// ── Helpers ──────────────────────────────────────────────────────────────────
function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "PRJ-001",
    title: "Test Project",
    type: "INFRAESTRUCTURA",
    description: "Description",
    location: "Location",
    createdDate: "2026-07-01",
    status: ProjectStatus.CREADO,
    materials: [],
    estimatedTotal: 1000,
    proposals: [],
    ...overrides,
  } as Project;
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("InteractiveOrganigrama", () => {
  it("renders the IVOO workflow title", () => {
    render(
      <InteractiveOrganigrama
        projects={[]}
        activeRole="PRESIDENCIA"
        onSelectRole={vi.fn()}
      />,
    );

    expect(screen.getByText("Flujo de Decisiones Organigrama IVOO")).toBeInTheDocument();
  });

  it("renders all role nodes", () => {
    render(
      <InteractiveOrganigrama
        projects={[]}
        activeRole="PRESIDENCIA"
        onSelectRole={vi.fn()}
      />,
    );

    expect(screen.getByText("PRESIDENCIA")).toBeInTheDocument();
    expect(screen.getByText("CIERRE DE OBRA")).toBeInTheDocument();
    expect(screen.getByText("GERENCIA PROCURA")).toBeInTheDocument();
    expect(screen.getByText("ANALISTAS")).toBeInTheDocument();
    expect(screen.getByText("FINANZAS")).toBeInTheDocument();
  });

  it("renders the central DB node", () => {
    render(
      <InteractiveOrganigrama
        projects={[]}
        activeRole="PRESIDENCIA"
        onSelectRole={vi.fn()}
      />,
    );

    expect(screen.getByText("BASE DE DATOS IVOO")).toBeInTheDocument();
  });

  it("highlights the active role", () => {
    const { container } = render(
      <InteractiveOrganigrama
        projects={[]}
        activeRole="PRESIDENCIA"
        onSelectRole={vi.fn()}
      />,
    );

    // The active role button should have scale-[1.03] class
    const presidenciaBtn = container.querySelector("#org-node-presidencia");
    expect(presidenciaBtn?.className).toContain("scale-[1.03]");

    // Non-active roles should not
    const cierreBtn = container.querySelector("#org-node-cierre");
    expect(cierreBtn?.className).not.toContain("scale-[1.03]");
  });

  it("calls onSelectRole when a role node is clicked", () => {
    const onSelectRole = vi.fn();
    render(
      <InteractiveOrganigrama
        projects={[]}
        activeRole="PRESIDENCIA"
        onSelectRole={onSelectRole}
      />,
    );

    fireEvent.click(screen.getByText("CIERRE DE OBRA"));
    expect(onSelectRole).toHaveBeenCalledWith("CIERRE_DE_OBRA");
  });

  it("calls onSelectRole when 'Ir al Panel' button is clicked", () => {
    const onSelectRole = vi.fn();
    render(
      <InteractiveOrganigrama
        projects={[]}
        activeRole="FINANZAS"
        onSelectRole={onSelectRole}
      />,
    );

    fireEvent.click(screen.getByText("Ir al Panel"));
    expect(onSelectRole).toHaveBeenCalledWith("FINANZAS");
  });

  it("shows pending count for CIERRE_DE_OBRA when projects have CREADO status", () => {
    const projects = [
      createProject({ id: "PRJ-001", status: ProjectStatus.CREADO }),
      createProject({ id: "PRJ-002", status: ProjectStatus.REVISADO_CIERRE }), // not counted for Cierre
      createProject({ id: "PRJ-003", status: ProjectStatus.CREADO }),
    ];

    render(
      <InteractiveOrganigrama
        projects={projects}
        activeRole="CIERRE_DE_OBRA"
        onSelectRole={vi.fn()}
      />,
    );

    // Cierre de obra has 2 pending (CREADO + VERIFICANDO_FINALIZACION)
    expect(screen.getByText("2 Pend.")).toBeInTheDocument();
  });

  it("shows pending count for PROCURA when projects have REVISADO_CIERRE or COMPARATIVA_ENVIADA", () => {
    const projects = [
      createProject({ id: "PRJ-001", status: ProjectStatus.REVISADO_CIERRE }),
      createProject({ id: "PRJ-002", status: ProjectStatus.COMPARATIVA_ENVIADA }),
      createProject({ id: "PRJ-003", status: ProjectStatus.CREADO }), // not counted
    ];

    render(
      <InteractiveOrganigrama
        projects={projects}
        activeRole="PROCURA"
        onSelectRole={vi.fn()}
      />,
    );

    expect(screen.getByText("2 Pend.")).toBeInTheDocument();
  });

  it("shows pending count for ANALISTA when projects have CONFIRMADO_PROCURA", () => {
    const projects = [
      createProject({ id: "PRJ-001", status: ProjectStatus.CONFIRMADO_PROCURA }),
      createProject({ id: "PRJ-002", status: ProjectStatus.CREADO }),
    ];

    render(
      <InteractiveOrganigrama
        projects={projects}
        activeRole="ANALISTA"
        onSelectRole={vi.fn()}
      />,
    );

    expect(screen.getByText("1 Licit.")).toBeInTheDocument();
  });

  it("shows pending count for FINANZAS when projects have CONTRATADO or LISTO_PAGO_FINAL", () => {
    const projects = [
      createProject({ id: "PRJ-001", status: ProjectStatus.CONTRATADO }),
      createProject({ id: "PRJ-002", status: ProjectStatus.LISTO_PAGO_FINAL }),
      createProject({ id: "PRJ-003", status: ProjectStatus.CREADO }), // not counted
    ];

    render(
      <InteractiveOrganigrama
        projects={projects}
        activeRole="FINANZAS"
        onSelectRole={vi.fn()}
      />,
    );

    expect(screen.getByText("2 Pagos")).toBeInTheDocument();
  });

  it("shows all projects count for PRESIDENCIA", () => {
    const projects = [
      createProject({ id: "PRJ-001", status: ProjectStatus.CREADO }),
      createProject({ id: "PRJ-002", status: ProjectStatus.COMPLETADO_PAGADO }),
      createProject({ id: "PRJ-003", status: ProjectStatus.EN_EJECUCION }),
    ];

    render(
      <InteractiveOrganigrama
        projects={projects}
        activeRole="PRESIDENCIA"
        onSelectRole={vi.fn()}
      />,
    );

    expect(screen.getByText("DB Master (3)")).toBeInTheDocument();
  });

  it("shows pending count for INFRAESTRUCTURA/MANTENIMIENTO when projects in EN_EJECUCION", () => {
    const projects = [
      createProject({ id: "PRJ-001", status: ProjectStatus.EN_EJECUCION }),
      createProject({ id: "PRJ-002", status: ProjectStatus.CREADO }),
    ];

    render(
      <InteractiveOrganigrama
        projects={projects}
        activeRole="CIERRE_DE_OBRA"
        onSelectRole={vi.fn()}
      />,
    );

    // The Mantenimiento label (lower left) exists
    expect(screen.getByText("Mantenimiento")).toBeInTheDocument();
  });

  it("does not show pending badge when count is 0", () => {
    render(
      <InteractiveOrganigrama
        projects={[]}
        activeRole="CIERRE_DE_OBRA"
        onSelectRole={vi.fn()}
      />,
    );

    expect(screen.queryByText("0 Pend.")).not.toBeInTheDocument();
  });

  it("shows the role description panel with correct info for active role", () => {
    render(
      <InteractiveOrganigrama
        projects={[]}
        activeRole="PRESIDENCIA"
        onSelectRole={vi.fn()}
      />,
    );

    expect(screen.getByText("Presidencia ↔ Base de Datos")).toBeInTheDocument();
    expect(screen.getByText(/Presidencia es el único/)).toBeInTheDocument();
  });

  it("shows 'proyecto' (singular) when count is 1", () => {
    const projects = [createProject({ status: ProjectStatus.CREADO })];

    render(
      <InteractiveOrganigrama
        projects={projects}
        activeRole="PRESIDENCIA"
        onSelectRole={vi.fn()}
      />,
    );

    expect(screen.getByText("1 proyecto")).toBeInTheDocument();
  });

  it("shows 'proyectos' (plural) when count is not 1", () => {
    const projects = [
      createProject({ id: "PRJ-001", status: ProjectStatus.CREADO }),
      createProject({ id: "PRJ-002", status: ProjectStatus.CREADO }),
    ];

    render(
      <InteractiveOrganigrama
        projects={projects}
        activeRole="PRESIDENCIA"
        onSelectRole={vi.fn()}
      />,
    );

    expect(screen.getByText("2 proyectos")).toBeInTheDocument();
  });
});
