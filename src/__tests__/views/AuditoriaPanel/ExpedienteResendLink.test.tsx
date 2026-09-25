import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExpedienteDetailTab from "@/views/AuditoriaPanel/components/ExpedienteDetailTab";
import type { Project } from "@/types";

const project = (status: string) => ({ id: "P1", status, description: "d", location: "l", materials: [], residentName: null, createdDate: "2026-01-01" }) as unknown as Project;

describe("ExpedienteDetailTab — reenviar enlace", () => {
  it("se ofrece solo mientras la obra está en ejecución", async () => {
    const onResendLink = vi.fn();
    const { rerender } = render(<ExpedienteDetailTab project={project("EN_EJECUCION")} rejectionCount={0} onResendLink={onResendLink} />);
    await userEvent.click(screen.getByRole("button", { name: /reenviar enlace al contratista/i }));
    expect(onResendLink).toHaveBeenCalledOnce();

    rerender(<ExpedienteDetailTab project={project("INFORME_ENVIADO")} rejectionCount={0} onResendLink={onResendLink} />);
    expect(screen.queryByRole("button", { name: /reenviar enlace/i })).toBeNull();
  });
});
