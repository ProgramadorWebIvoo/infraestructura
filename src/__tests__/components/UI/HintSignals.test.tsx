/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas de RequiredMark y HelpHint.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequiredMark, HelpHint } from "@/components/UI/HintSignals";

describe("RequiredMark", () => {
  it("muestra alerta y 'Este campo es obligatorio' cuando el campo está vacío", async () => {
    render(<RequiredMark filled={false} />);
    expect(screen.getByLabelText("Campo obligatorio pendiente")).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByLabelText("Campo obligatorio pendiente"));
    await waitFor(() =>
      expect(screen.getByRole("tooltip")).toHaveTextContent("Este campo es obligatorio"),
    );
  });

  it("muestra check y '¡Válido!' cuando el campo está completo", async () => {
    render(<RequiredMark filled={true} />);
    expect(screen.getByLabelText("Campo obligatorio completo")).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByLabelText("Campo obligatorio completo"));
    await waitFor(() =>
      expect(screen.getByRole("tooltip")).toHaveTextContent("¡Válido!"),
    );
  });
});

describe("HelpHint", () => {
  it("muestra el contenido de ayuda en hover", async () => {
    render(<HelpHint content="Debe tener formato de email." />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Ayuda" }));
    await waitFor(() =>
      expect(screen.getByRole("tooltip")).toHaveTextContent("Debe tener formato de email."),
    );
  });

  it("muestra el contenido de ayuda en focus", async () => {
    render(<HelpHint content="Debe tener formato de email." />);
    fireEvent.focus(screen.getByRole("button", { name: "Ayuda" }));
    await waitFor(() =>
      expect(screen.getByRole("tooltip")).toHaveTextContent("Debe tener formato de email."),
    );
  });
});
