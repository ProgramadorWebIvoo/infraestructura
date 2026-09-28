import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ClosureFollowUp, { closureStepIndex } from "@/views/InfraestructuraMantenimientoPanel/components/ClosureFollowUp";
import type { Project } from "@/types";

const base = { id: "1", residentName: "Ana Ruiz", closureReportStatus: null } as unknown as Project;

describe("ClosureFollowUp", () => {
  it("no aparece antes de la ejecución", () => {
    expect(closureStepIndex("CREADO")).toBe(-1);
    const { container } = render(<ClosureFollowUp project={{ ...base, status: "CREADO" } as Project} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra residente y pasos en solo lectura, sin acciones", () => {
    render(<ClosureFollowUp project={{ ...base, status: "INFORME_ENVIADO" } as Project} />);
    expect(screen.getByText("Ana Ruiz")).toBeInTheDocument();
    expect(screen.getByText("Falta el informe del contratista o del residente")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("avisa cuando el informe fue devuelto", () => {
    render(<ClosureFollowUp project={{ ...base, status: "EN_EJECUCION", closureReportStatus: "RECHAZADO" } as Project} />);
    expect(screen.getByText(/devuelto/)).toBeInTheDocument();
  });
});
