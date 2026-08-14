/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas de IconActionButton — click, disabled, isBusy (swap a Spinner) y
 * tooltip en hover en vez de `title` nativo.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Pencil } from "lucide-react";
import IconActionButton from "@/components/UI/IconActionButton";

describe("IconActionButton", () => {
  it("renderiza aria-label y llama onClick", () => {
    const onClick = vi.fn();
    render(
      <IconActionButton label="Editar" tooltip="Editar registro" onClick={onClick} icon={<Pencil />} />,
    );
    const button = screen.getByRole("button", { name: "Editar" });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respeta disabled", () => {
    const onClick = vi.fn();
    render(
      <IconActionButton label="Editar" tooltip="Editar registro" onClick={onClick} disabled icon={<Pencil />} />,
    );
    expect(screen.getByRole("button", { name: "Editar" })).toBeDisabled();
  });

  it("muestra un Spinner y deshabilita el botón cuando isBusy", () => {
    render(
      <IconActionButton label="Eliminar" tooltip="Eliminar registro" onClick={vi.fn()} isBusy icon={<Pencil />} />,
    );
    const button = screen.getByRole("button", { name: "Eliminar" });
    expect(button).toBeDisabled();
    expect(button.querySelector("svg.animate-spin")).toBeInTheDocument();
  });

  it("muestra el tooltip en hover en vez de usar title nativo", async () => {
    render(
      <IconActionButton label="Editar" tooltip="Editar registro" onClick={vi.fn()} icon={<Pencil />} />,
    );
    const button = screen.getByRole("button", { name: "Editar" });
    expect(button).not.toHaveAttribute("title");

    fireEvent.mouseEnter(button);
    await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("Editar registro"));
  });
});
