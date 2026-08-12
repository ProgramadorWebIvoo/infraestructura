/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para PipelineOverview — verifica la tira de chips con los
 * conteos por etapa y el filtrado controlado desde el pipeline.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PipelineOverview from "@/views/InfraestructuraMantenimientoPanel/components/PipelineOverview";
import type { Project } from "@/types";
import { ProjectStatus } from "@/types";

const makeProject = (over: Partial<Project> & { id: string }): Project => ({
  title: "Obra de prueba",
  type: "INFRAESTRUCTURA",
  description: "",
  location: "Tienda Chacao",
  createdDate: "2026-07-01",
  status: ProjectStatus.CREADO,
  materials: [],
  estimatedTotal: 500,
  ...over,
});

describe("PipelineOverview", () => {
  it("muestra el conteo correcto por etapa", () => {
    const projects = [
      makeProject({ id: "P1", status: ProjectStatus.CREADO }),
      makeProject({ id: "P2", status: ProjectStatus.EN_EJECUCION }),
      makeProject({ id: "P3", status: ProjectStatus.EN_EJECUCION }),
      makeProject({ id: "P4", status: ProjectStatus.COMPLETADO_PAGADO }),
    ];

    render(
      <PipelineOverview
        projects={projects}
        stageKey="todas"
        onStageKeyChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("group", { name: "Filtrar por etapa del flujo" })).toBeInTheDocument();
    expect(screen.getByText("Todas")).toBeInTheDocument();
    expect(screen.getByText("Creadas")).toBeInTheDocument();
    expect(screen.getByText("Ejecución")).toBeInTheDocument();
    expect(screen.getByText("Completadas")).toBeInTheDocument();

    // Conteos: 1 creada, 2 en ejecución, 1 completada (más total 4 y ceros)
    const countSpans = screen.getAllByText(/^\d+$/);
    expect(countSpans.map((el) => el.textContent)).toEqual(expect.arrayContaining(["4", "1", "2", "1", "0"]));
  });

  it("notifica el cambio de etapa al tocar un chip", () => {
    const onStageKeyChange = vi.fn();
    render(
      <PipelineOverview
        projects={[]}
        stageKey="todas"
        onStageKeyChange={onStageKeyChange}
      />,
    );

    fireEvent.click(screen.getByText("Ejecución"));
    expect(onStageKeyChange).toHaveBeenCalledWith("ejecucion");
  });

  it("la etapa activa se deselecciona al tocarla de nuevo", () => {
    const onStageKeyChange = vi.fn();
    render(
      <PipelineOverview
        projects={[]}
        stageKey="ejecucion"
        onStageKeyChange={onStageKeyChange}
      />,
    );

    fireEvent.click(screen.getByText("Ejecución"));
    expect(onStageKeyChange).toHaveBeenCalledWith("todas");
  });
});
