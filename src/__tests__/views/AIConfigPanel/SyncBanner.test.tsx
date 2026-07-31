/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas de SyncBanner — banner de resultado de sincronización.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SyncBanner from "@/views/AIConfigPanel/SyncBanner";

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

describe("SyncBanner", () => {
  const onDismiss = vi.fn();

  it("no renderiza nada cuando no hay mensaje", () => {
    const { container } = render(<SyncBanner message={null} onDismiss={onDismiss} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza el mensaje de éxito con estilo emerald", () => {
    render(<SyncBanner message="Sincronizado OK" onDismiss={onDismiss} />);
    expect(screen.getByText("Sincronizado OK")).toBeInTheDocument();
    expect(screen.getByText("Sincronizado OK").className).toContain("text-emerald-700");
  });

  it("renderiza el mensaje de error con estilo rose", () => {
    render(<SyncBanner message="Fallo" isError onDismiss={onDismiss} />);
    expect(screen.getByText("Fallo").className).toContain("text-rose-700");
  });

  it("llama onDismiss al cerrar", () => {
    render(<SyncBanner message="Mensaje" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
