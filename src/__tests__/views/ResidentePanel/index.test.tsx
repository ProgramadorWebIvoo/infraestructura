import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ResidentePanel from "@/views/ResidentePanel";
import { getRoleHomeConfig } from "@/views/HomePanel/roleHomeConfig";
import { ROUTES } from "@/routes";
import { roleLabel } from "@/constants/roles";

describe("rol RESIDENTE", () => {
  it("muestra el módulo vacío 'Mis obras'", () => {
    render(<ResidentePanel />);
    expect(screen.getByText("Mis obras")).toBeInTheDocument();
    expect(screen.getByText("No tiene obras asignadas por el momento.")).toBeInTheDocument();
  });

  it("su home solo enlaza a /residente y no muestra KPIs financieros", () => {
    const config = getRoleHomeConfig("RESIDENTE");
    expect(config.modules.map((m) => m.route)).toEqual([ROUTES.RESIDENTE]);
    expect(config.kpis).toEqual([]);
  });

  it("tiene etiqueta legible", () => {
    expect(roleLabel("RESIDENTE")).toBe("Residente");
  });
});
