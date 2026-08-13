import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RoleMultiSelect from "@/components/UI/RoleMultiSelect";

describe("RoleMultiSelect", () => {
  it("muestra el label legible de cada rol, no el valor técnico", () => {
    render(<RoleMultiSelect roles={["CIERRE_DE_OBRA", "SUPERADMIN"]} value={[]} onChange={() => {}} />);

    expect(screen.getByText("Cierre de Obra")).toBeInTheDocument();
    expect(screen.getByText("Super Administrador")).toBeInTheDocument();
    expect(screen.queryByText("CIERRE_DE_OBRA")).not.toBeInTheDocument();
  });

  it("propaga el value técnico (no el label) al hacer click", () => {
    const onChange = vi.fn();
    render(<RoleMultiSelect roles={["PROCURA"]} value={[]} onChange={onChange} />);

    fireEvent.click(screen.getByText("Procura"));

    expect(onChange).toHaveBeenCalledWith(["PROCURA"]);
  });

  it("muestra un rol sin label mapeado tal cual", () => {
    render(<RoleMultiSelect roles={["ROL_FUTURO"]} value={[]} onChange={() => {}} />);

    expect(screen.getByText("ROL_FUTURO")).toBeInTheDocument();
  });
});
