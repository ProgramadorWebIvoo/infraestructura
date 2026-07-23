/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para ConfirmDialog — variant styles, loading state, accessibility.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmDialog from "@/components/UI/ConfirmDialog";

// ---------------------------------------------------------------------------
// Mock motion para evitar dependencias de animación
// ---------------------------------------------------------------------------

vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock createPortal de Modal
// ---------------------------------------------------------------------------

vi.mock("react-dom", () => ({
  createPortal: (content: React.ReactNode) => content,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ConfirmDialog", () => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Renderizado básico
  // -----------------------------------------------------------------------

  it("NO renderiza cuando isOpen=false", () => {
    render(
      <ConfirmDialog
        isOpen={false}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test"
        message="Mensaje"
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renderiza título, mensaje y botones", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Eliminar elemento"
        message="¿Estás seguro de que quieres eliminar este elemento?"
      />
    );

    expect(screen.getByText("Eliminar elemento")).toBeInTheDocument();
    expect(screen.getByText("¿Estás seguro de que quieres eliminar este elemento?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar/i })).toBeInTheDocument();
  });

  it("usa labels personalizados para botones", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test"
        message="Test"
        confirmLabel="Sí, borrar"
        cancelLabel="No, mantener"
      />
    );

    expect(screen.getByRole("button", { name: /sí, borrar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /no, mantener/i })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Variants (danger, warning, info)
  // -----------------------------------------------------------------------

  it("aplica estilos danger (rojo) por defecto", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test"
        message="Test"
        variant="danger"
      />
    );

    const confirmBtn = screen.getByRole("button", { name: /confirmar/i });
    expect(confirmBtn).toHaveClass("bg-rose-600");
    expect(screen.getByText("Acción crítica")).toBeInTheDocument();
  });

  it("aplica estilos warning (ámbar)", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test"
        message="Test"
        variant="warning"
      />
    );

    const confirmBtn = screen.getByRole("button", { name: /confirmar/i });
    expect(confirmBtn).toHaveClass("bg-amber-600");
    expect(screen.getByText("Confirmación requerida")).toBeInTheDocument();
  });

  it("aplica estilos info (sky)", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test"
        message="Test"
        variant="info"
      />
    );

    const confirmBtn = screen.getByRole("button", { name: /confirmar/i });
    expect(confirmBtn).toHaveClass("bg-sky-600");
    expect(screen.getByText("Confirmación")).toBeInTheDocument();
  });

  it("renderiza icono correcto por variant", () => {
    const { rerender } = render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test"
        message="Test"
        variant="danger"
      />
    );

    expect(screen.getByTestId("alert-triangle")).toBeInTheDocument();

    rerender(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test"
        message="Test"
        variant="info"
      />
    );

    expect(screen.getByTestId("check-circle")).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  it("muestra spinner y 'Procesando...' cuando isLoading=true", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test"
        message="Test"
        isLoading
      />
    );

    expect(screen.getByRole("button", { name: /procesando/i })).toBeInTheDocument();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("deshabilita ambos botones cuando isLoading=true", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test"
        message="Test"
        isLoading
      />
    );

    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /procesando/i })).toBeDisabled();
  });

  it("NO llama onConfirm al click si isLoading=true", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test"
        message="Test"
        isLoading
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /procesando/i }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Interacciones
  // -----------------------------------------------------------------------

  it("llama onConfirm al click en botón confirmar", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test"
        message="Test"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("llama onClose al click en botón cancelar", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test"
        message="Test"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("llama onClose al presionar ESC (via Modal)", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test"
        message="Test"
      />
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("NO cierra con ESC si isLoading=true (closeDisabled)", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test"
        message="Test"
        isLoading
      />
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Accesibilidad
  // -----------------------------------------------------------------------

  it("tiene role=dialog y aria-modal=true", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test"
        message="Test"
      />
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("usa title como aria-label", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Mi Confirmación"
        message="Test"
      />
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Mi Confirmación");
  });

  it("badge del variant es accesible (texto visible)", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test"
        message="Test"
        variant="danger"
      />
    );

    expect(screen.getByText("Acción crítica")).toBeInTheDocument();
  });
});
