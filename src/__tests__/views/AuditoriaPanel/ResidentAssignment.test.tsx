import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReviewResidentField from "@/views/AuditoriaPanel/components/ReviewResidentField";
import ChangeResidentModal from "@/components/ChangeResidentModal";
import { canChangeProjectResident, reviewNeedsResidentChoice, reviewResidentPayload } from "@/utils/projectLocation";
import type { Project } from "@/types";

vi.mock("@/hooks/useResidents", () => ({
  useResidents: () => [
    { id: 1, name: "Rita" },
    { id: 2, name: "Omar" },
  ],
}));

const custom = { localizationId: null, status: "EN_EJECUCION", residentUserId: 1, residentName: "Rita", id: "PRJ-001", title: "Obra" } as unknown as Project;
const registered = { ...custom, localizationId: 4, localizationTitle: "Tienda Sur — Valencia" } as Project;

describe("resident rules on review / change", () => {
  it("requires the choice only for custom locations", () => {
    expect(reviewNeedsResidentChoice(custom)).toBe(true);
    expect(reviewNeedsResidentChoice(registered)).toBe(false);
  });

  it("never sends a resident for a registered location", () => {
    expect(reviewResidentPayload(registered, 2)).toBeUndefined();
    expect(reviewResidentPayload(custom, 2)).toBe(2);
    expect(reviewResidentPayload(custom, null)).toBeUndefined();
  });

  it("allows changing the resident only of custom works up to INFORME_ENVIADO", () => {
    expect(canChangeProjectResident(custom)).toBe(true);
    expect(canChangeProjectResident({ ...custom, status: "INFORME_ENVIADO" } as Project)).toBe(true);
    expect(canChangeProjectResident({ ...custom, status: "VERIFICANDO_FINALIZACION" } as Project)).toBe(false);
    expect(canChangeProjectResident({ ...custom, status: "RECHAZADO_AUDITORIA" } as Project)).toBe(false);
    expect(canChangeProjectResident(registered)).toBe(false);
  });
});

describe("ReviewResidentField", () => {
  it("shows a read-only inherited resident for registered locations", () => {
    render(<ReviewResidentField project={registered} value={null} onChange={vi.fn()} />);
    expect(screen.getByText(/hereda a su residente/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Ingeniero residente de la obra/)).not.toBeInTheDocument();
  });

  it("shows the mandatory selector for custom locations", () => {
    render(<ReviewResidentField project={custom} value={null} onChange={vi.fn()} />);
    expect(screen.getByText(/Ingeniero residente de la obra/)).toBeInTheDocument();
  });
});

describe("ChangeResidentModal", () => {
  it("keeps the action disabled until a different resident and a reason are given", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ChangeResidentModal project={custom} onClose={vi.fn()} onSubmit={onSubmit} />);

    const submit = screen.getByRole("button", { name: "Cambiar residente" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Licencia médica" } });
    expect(submit).toBeDisabled(); // reason alone is not enough

    fireEvent.click(screen.getByRole("combobox", { name: "Ingeniero residente" }));
    fireEvent.click(await screen.findByText("Omar"));
    await waitFor(() => expect(submit).toBeEnabled());

    fireEvent.click(submit);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("PRJ-001", 2, "Licencia médica"));
  });
});
