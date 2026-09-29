import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExpedienteDetailTab from "@/views/AuditoriaPanel/components/ExpedienteDetailTab";
import type { Project } from "@/types";

const project = (status: string) => ({ id: "P1", status, description: "d", location: "l", materials: [], residentName: null, createdDate: "2026-01-01" }) as unknown as Project;

describe("ExpedienteDetailTab — reenviar enlace", () => {
  it("se ofrece mientras el cierre no haya pasado la verificación de Auditoría, incluso con un informe ya enviado", async () => {
    const onResendLink = vi.fn();
    const { rerender } = render(<ExpedienteDetailTab project={project("EN_EJECUCION")} rejectionCount={0} onResendLink={onResendLink} />);
    await userEvent.click(screen.getByRole("button", { name: /reenviar enlace al contratista/i }));
    expect(onResendLink).toHaveBeenCalledOnce();

    // El residente (u otro) ya mandó su parte del informe de cierre — el enlace del contratista sigue siendo reenviable.
    rerender(<ExpedienteDetailTab project={project("INFORME_ENVIADO")} rejectionCount={0} onResendLink={onResendLink} />);
    expect(screen.getByRole("button", { name: /reenviar enlace al contratista/i })).toBeInTheDocument();

    // Ambos informes llegaron; Auditoría aún no verificó — sigue disponible.
    rerender(<ExpedienteDetailTab project={project("VERIFICANDO_FINALIZACION")} rejectionCount={0} onResendLink={onResendLink} />);
    expect(screen.getByRole("button", { name: /reenviar enlace al contratista/i })).toBeInTheDocument();
  });

  it("desaparece una vez Auditoría verificó el cierre", () => {
    const onResendLink = vi.fn();
    render(<ExpedienteDetailTab project={project("PENDIENTE_SOLICITUD_FINIQUITO")} rejectionCount={0} onResendLink={onResendLink} />);
    expect(screen.queryByRole("button", { name: /reenviar enlace/i })).toBeNull();
  });
});
