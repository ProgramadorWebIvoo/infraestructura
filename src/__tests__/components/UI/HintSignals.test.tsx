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
  it("renderiza el asterisco visible y el texto accesible", () => {
    render(<RequiredMark />);
    expect(screen.getByText("*")).toBeInTheDocument();
    expect(screen.getByText("(obligatorio)")).toBeInTheDocument();
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
