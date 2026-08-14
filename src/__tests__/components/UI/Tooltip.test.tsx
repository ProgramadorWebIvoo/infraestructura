/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas de Tooltip — visibilidad por hover/focus/teclado, aria-describedby
 * y respeto de `disabled`.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Tooltip from "@/components/UI/Tooltip";

describe("Tooltip", () => {
  it("no muestra el contenido por defecto", () => {
    render(
      <Tooltip content="Ayuda" delay={0}>
        <button>Trigger</button>
      </Tooltip>,
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("aparece en mouseEnter y desaparece en mouseLeave", async () => {
    render(
      <Tooltip content="Ayuda" delay={0}>
        <button>Trigger</button>
      </Tooltip>,
    );
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Trigger" }));
    await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("Ayuda"));

    fireEvent.mouseLeave(screen.getByRole("button", { name: "Trigger" }));
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  it("aparece en focus y desaparece en blur (accesibilidad por teclado)", async () => {
    render(
      <Tooltip content="Ayuda" delay={0}>
        <button>Trigger</button>
      </Tooltip>,
    );
    fireEvent.focus(screen.getByRole("button", { name: "Trigger" }));
    await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("Ayuda"));

    fireEvent.blur(screen.getByRole("button", { name: "Trigger" }));
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  it("setea aria-describedby en el trigger mientras el tooltip está visible", async () => {
    render(
      <Tooltip content="Ayuda" delay={0}>
        <button>Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Trigger" });
    expect(trigger).not.toHaveAttribute("aria-describedby");

    fireEvent.focus(trigger);
    await waitFor(() => {
      const describedBy = trigger.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      expect(screen.getByRole("tooltip")).toHaveAttribute("id", describedBy!);
    });
  });

  it("no aparece cuando disabled", async () => {
    render(
      <Tooltip content="Ayuda" delay={0} disabled>
        <button>Trigger</button>
      </Tooltip>,
    );
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Trigger" }));
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("oculta el tooltip al presionar Escape", async () => {
    render(
      <Tooltip content="Ayuda" delay={0}>
        <button>Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Trigger" });
    fireEvent.focus(trigger);
    await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument());

    fireEvent.keyDown(trigger, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });
});
