import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InfoBanner from "@/components/UI/InfoBanner";

describe("InfoBanner", () => {
  it("renderiza el título y el contenido, abierto por defecto", () => {
    render(<InfoBanner title="Título de ayuda">Contenido explicativo.</InfoBanner>);

    expect(screen.getByText("Título de ayuda")).toBeInTheDocument();
    expect(screen.getByText("Contenido explicativo.")).toBeInTheDocument();
  });

  it("respeta defaultOpen=false, ocultando el contenido inicialmente", () => {
    render(
      <InfoBanner title="Título" defaultOpen={false}>
        Contenido oculto.
      </InfoBanner>,
    );

    expect(screen.queryByText("Contenido oculto.")).not.toBeInTheDocument();
  });

  it("colapsa y expande al hacer click en el encabezado", () => {
    render(<InfoBanner title="Título">Contenido toggle.</InfoBanner>);

    const toggle = screen.getByRole("button", { name: /Título/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Contenido toggle.")).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Contenido toggle.")).toBeInTheDocument();
  });
});
