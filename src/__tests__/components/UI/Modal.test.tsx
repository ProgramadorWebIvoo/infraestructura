/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para Modal — focus trap, ESC, portal, animaciones.
 */

import { describe, it, expect, vi, afterEach, act } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Modal from "@/components/UI/Modal";
import { X } from "lucide-react";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Modal", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Renderizado básico
  // -----------------------------------------------------------------------

  it("NO renderiza nada cuando isOpen=false", () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test" >
        <p>Contenido</p>
      </Modal>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it("renderiza en portal (document.body) cuando isOpen=true", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal" >
        <p>Contenido del modal</p>
      </Modal>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(document.body.contains(dialog)).toBe(true);
  });

  it("renderiza título, badge, infoLine e icon", () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        title="Título Principal"
        badge="BADGE-123"
        infoLine="ID: 456"
        icon={<span data-testid="modal-icon-inner"><X className="h-5 w-5" /></span>}
        iconColor="sky"
      >
        <p>Body</p>
      </Modal>
    );

    expect(screen.getByText("Título Principal")).toBeInTheDocument();
    expect(screen.getByText("BADGE-123")).toBeInTheDocument();
    expect(screen.getByText("ID: 456")).toBeInTheDocument();
    expect(screen.getByTestId("modal-icon-inner")).toBeInTheDocument();
  });

  it("renderiza footer cuando se proporciona", () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        footer={<button data-testid="footer-btn">Footer Action</button>}
      >
        <p>Body</p>
      </Modal>
    );

    expect(screen.getByTestId("footer-btn")).toBeInTheDocument();
  });

  it("aplica maxWidth correcto", () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={vi.fn()} maxWidth="max-w-sm" >
        <p>Body</p>
      </Modal>
    );

    const modal = screen.getByRole("dialog").querySelector(".max-w-sm");
    expect(modal).toBeInTheDocument();

    rerender(
      <Modal isOpen={true} onClose={vi.fn()} maxWidth="max-w-4xl" >
        <p>Body</p>
      </Modal>
    );

    const modal2 = screen.getByRole("dialog").querySelector(".max-w-4xl");
    expect(modal2).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Close button
  // -----------------------------------------------------------------------

  it("muestra botón de cierre por defecto", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test" >
        <p>Body</p>
      </Modal>
    );

    expect(screen.getByRole("button", { name: /cerrar/i })).toBeInTheDocument();
  });

  it("oculta botón de cierre con hideCloseButton=true", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test" hideCloseButton >
        <p>Body</p>
      </Modal>
    );

    expect(screen.queryByRole("button", { name: /cerrar/i })).not.toBeInTheDocument();
  });

  it("deshabilita botón de cierre con closeDisabled=true", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test" closeDisabled >
        <p>Body</p>
      </Modal>
    );

    expect(screen.getByRole("button", { name: /cerrar/i })).toBeDisabled();
  });

  it("llama onClose al click en botón cerrar", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test" >
        <p>Body</p>
      </Modal>
    );

    fireEvent.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // ESC key
  // -----------------------------------------------------------------------

  it("cierra con tecla ESC", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test" >
        <p>Body</p>
      </Modal>
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("NO cierra con ESC si closeDisabled=true", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test" closeDisabled >
        <p>Body</p>
      </Modal>
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Focus trap
  // -----------------------------------------------------------------------

  it("envuelve al primer foco cuando Tab en el último elemento", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test" >
        <button data-testid="btn1">Btn 1</button>
        <button data-testid="btn2">Btn 2</button>
      </Modal>
    );

    const closeBtn = screen.getByRole("button", { name: /cerrar/i });
    const btn1 = screen.getByTestId("btn1");
    const btn2 = screen.getByTestId("btn2");

    // Simular focus en el último elemento y Tab → debe envolver al primero
    btn2.focus();
    fireEvent.keyDown(btn2, { key: "Tab", shiftKey: false });
    expect(closeBtn).toHaveFocus();

    // Simular focus en el primer elemento y Shift+Tab → debe envolver al último
    closeBtn.focus();
    fireEvent.keyDown(closeBtn, { key: "Tab", shiftKey: true });
    expect(btn2).toHaveFocus();
  });

  it("envuelve correctamente incluso con elementos deshabilitados", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test" >
        <button data-testid="btn1">Btn 1</button>
        <button data-testid="btn2" disabled>Btn 2 (disabled)</button>
        <button data-testid="btn3">Btn 3</button>
      </Modal>
    );

    const closeBtn = screen.getByRole("button", { name: /cerrar/i });
    const btn3 = screen.getByTestId("btn3");

    // Último focusable = btn3 (disabled btn2 es saltado por FOCUSABLE selector)
    btn3.focus();
    fireEvent.keyDown(btn3, { key: "Tab", shiftKey: false });
    expect(closeBtn).toHaveFocus();

    // Shift+Tab en closeBtn debe ir al último (btn3, no btn2 disabled)
    closeBtn.focus();
    fireEvent.keyDown(closeBtn, { key: "Tab", shiftKey: true });
    expect(btn3).toHaveFocus();
  });

  // -----------------------------------------------------------------------
  // Accesibilidad
  // -----------------------------------------------------------------------

  it("tiene role=dialog y aria-modal=true", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test" >
        <p>Body</p>
      </Modal>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("usa title como aria-label", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Mi Título" >
        <p>Body</p>
      </Modal>
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Mi Título");
  });

  it("usa 'Diálogo' como aria-label fallback si no hay title", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} >
        <p>Body</p>
      </Modal>
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Diálogo");
  });

  // -----------------------------------------------------------------------
  // Animaciones (AnimatePresence renderiza el contenido)
  // -----------------------------------------------------------------------

  it("renderiza contenido dentro de AnimatePresence cuando isOpen=true", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test" >
        <p>Body</p>
      </Modal>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Body");
  });
});
