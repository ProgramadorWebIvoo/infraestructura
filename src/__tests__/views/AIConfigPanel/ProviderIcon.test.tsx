/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas de ProviderIcon — badge de proveedor con label y color por dominio.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProviderIcon from "@/views/AIConfigPanel/components/ProviderIcon";

describe("ProviderIcon", () => {
  it("renderiza el label amigable del proveedor", () => {
    render(<ProviderIcon provider="openai" />);
    expect(screen.getByText("OpenAI (ChatGPT)")).toBeInTheDocument();
  });

  it("cae al label crudo para proveedores desconocidos", () => {
    render(<ProviderIcon provider="mistral" />);
    expect(screen.getByText("mistral")).toBeInTheDocument();
  });

  it("aplica el badge del proveedor (gemini → azul)", () => {
    const { container } = render(<ProviderIcon provider="gemini" />);
    expect(container.firstChild).toHaveClass("bg-blue-50");
    expect(container.firstChild).toHaveClass("text-blue-700");
  });

  it("usa el fallback de OpenAI para proveedores desconocidos", () => {
    const { container } = render(<ProviderIcon provider="unknown" />);
    expect(container.firstChild).toHaveClass("bg-emerald-50");
  });
});
