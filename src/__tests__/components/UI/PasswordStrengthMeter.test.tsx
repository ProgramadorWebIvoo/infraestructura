/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PasswordStrengthMeter, { type PasswordRequirement } from "@/components/UI/PasswordStrengthMeter";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants; delete rest.transition;
      return <div {...rest}>{children}</div>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants; delete rest.transition;
      return <span {...rest}>{children}</span>;
    },
  },
}));

const NO_REQ_MET: PasswordRequirement[] = [
  { label: "Mín. 8 caracteres", met: false },
  { label: "Una mayúscula", met: false },
  { label: "Una minúscula", met: false },
  { label: "Un número", met: false },
];

const ALL_REQ_MET: PasswordRequirement[] = [
  { label: "Mín. 8 caracteres", met: true },
  { label: "Una mayúscula", met: true },
  { label: "Una minúscula", met: true },
  { label: "Un número", met: true },
];

describe("PasswordStrengthMeter", () => {
  it("no renderiza nada si la contraseña está vacía", () => {
    const { container } = render(<PasswordStrengthMeter password="" requirements={NO_REQ_MET} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra 'Muy débil' cuando ningún requisito se cumple", () => {
    render(<PasswordStrengthMeter password="a" requirements={NO_REQ_MET} />);
    expect(screen.getByText("Muy débil")).toBeInTheDocument();
  });

  it("muestra 'Fuerte' cuando se cumplen todos los requisitos", () => {
    render(<PasswordStrengthMeter password="Password1" requirements={ALL_REQ_MET} />);
    expect(screen.getByText("Fuerte")).toBeInTheDocument();
  });

  it("renderiza el checklist completo con las etiquetas de cada requisito", () => {
    render(<PasswordStrengthMeter password="Password1" requirements={ALL_REQ_MET} />);
    expect(screen.getByText("Mín. 8 caracteres")).toBeInTheDocument();
    expect(screen.getByText("Una mayúscula")).toBeInTheDocument();
    expect(screen.getByText("Una minúscula")).toBeInTheDocument();
    expect(screen.getByText("Un número")).toBeInTheDocument();
  });

  it("sube de nivel de fuerza a medida que se cumplen más requisitos", () => {
    const { rerender } = render(
      <PasswordStrengthMeter
        password="a"
        requirements={[
          { label: "Mín. 8 caracteres", met: false },
          { label: "Una mayúscula", met: false },
          { label: "Una minúscula", met: true },
          { label: "Un número", met: false },
        ]}
      />,
    );
    const firstLevel = screen.getByText(/Muy débil|Débil/).textContent;

    rerender(
      <PasswordStrengthMeter
        password="Password1"
        requirements={[
          { label: "Mín. 8 caracteres", met: true },
          { label: "Una mayúscula", met: true },
          { label: "Una minúscula", met: true },
          { label: "Un número", met: false },
        ]}
      />,
    );
    const secondLevel = screen.getByText(/Aceptable|Buena|Fuerte/).textContent;

    expect(firstLevel).not.toBe(secondLevel);
  });
});
