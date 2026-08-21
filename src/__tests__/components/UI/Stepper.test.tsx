/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para Stepper — indicador de pasos de un wizard.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Stepper from "@/components/UI/Stepper";

vi.mock("motion/react", () => ({
  motion: {
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <span {...rest}>{children}</span>;
    },
  },
}));

afterEach(() => vi.restoreAllMocks());

const steps = [
  { id: "datos", label: "Datos de la Obra" },
  { id: "materiales", label: "Materiales" },
  { id: "adjuntos", label: "Adjuntos" },
];

describe("Stepper", () => {
  it("marca el paso actual con aria-current", () => {
    render(<Stepper steps={steps} currentIndex={1} furthestVisitedIndex={1} onStepClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Materiales/ })).toHaveAttribute("aria-current", "step");
  });

  it("click en un paso ya visitado (completado) navega", () => {
    const onStepClick = vi.fn();
    render(<Stepper steps={steps} currentIndex={1} furthestVisitedIndex={1} onStepClick={onStepClick} />);

    fireEvent.click(screen.getByRole("button", { name: /Datos de la Obra/ }));
    expect(onStepClick).toHaveBeenCalledWith(0);
  });

  it("click en un paso no visitado (pendiente) no navega", () => {
    const onStepClick = vi.fn();
    render(<Stepper steps={steps} currentIndex={0} furthestVisitedIndex={0} onStepClick={onStepClick} />);

    fireEvent.click(screen.getByRole("button", { name: /Adjuntos/ }));
    expect(onStepClick).not.toHaveBeenCalled();
  });

  it("deshabilita el botón de un paso pendiente", () => {
    render(<Stepper steps={steps} currentIndex={0} furthestVisitedIndex={0} onStepClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Materiales/ })).toBeDisabled();
  });
});
