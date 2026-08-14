import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ActiveBadge from "@/components/UI/ActiveBadge";

describe("ActiveBadge", () => {
  it("muestra 'Activo' cuando isActive es true", () => {
    render(<ActiveBadge isActive />);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("muestra 'Inactivo' cuando isActive es false", () => {
    render(<ActiveBadge isActive={false} />);
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("acepta labels personalizados", () => {
    render(<ActiveBadge isActive activeLabel="Habilitado" inactiveLabel="Deshabilitado" />);
    expect(screen.getByText("Habilitado")).toBeInTheDocument();
  });

  it("acepta labels personalizados para el estado inactivo", () => {
    render(<ActiveBadge isActive={false} activeLabel="Habilitado" inactiveLabel="Deshabilitado" />);
    expect(screen.getByText("Deshabilitado")).toBeInTheDocument();
  });
});
