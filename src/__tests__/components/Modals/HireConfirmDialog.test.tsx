import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HireConfirmDialog from "@/components/Modals/HireConfirmDialog";

describe("HireConfirmDialog", () => {
  let onConfirm: ReturnType<typeof vi.fn>;
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onConfirm = vi.fn();
    onClose = vi.fn();
  });

  it("variante normal: sin alertas cuando anticipo y presupuesto están dentro de rango", () => {
    render(
      <HireConfirmDialog
        isOpen
        onClose={onClose as unknown as () => void}
        onConfirm={onConfirm as unknown as () => void}
        contractorName="Constructora ABC"
        advancePercent={20}
        maxAdvancePercent={30}
        executedPct={50}
        semaphoreLevel="verde"
      />,
    );

    expect(screen.getByText(/Constructora ABC/)).toBeInTheDocument();
    expect(screen.getByText(/dentro de los parámetros configurados/)).toBeInTheDocument();
    expect(screen.queryByText(/Anticipo por encima del máximo/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Semáforo presupuestario/)).not.toBeInTheDocument();
  });

  it("variante anticipo excedido: muestra alerta de anticipo, sin alerta de semáforo", () => {
    render(
      <HireConfirmDialog
        isOpen
        onClose={onClose as unknown as () => void}
        onConfirm={onConfirm as unknown as () => void}
        contractorName="Constructora ABC"
        advancePercent={50}
        maxAdvancePercent={30}
        executedPct={50}
        semaphoreLevel="verde"
      />,
    );

    expect(screen.getByText(/Anticipo por encima del máximo configurado/)).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
    expect(screen.queryByText(/Semáforo presupuestario/)).not.toBeInTheDocument();
  });

  it("variante semáforo en riesgo: muestra alerta de presupuesto, sin alerta de anticipo", () => {
    render(
      <HireConfirmDialog
        isOpen
        onClose={onClose as unknown as () => void}
        onConfirm={onConfirm as unknown as () => void}
        contractorName="Constructora ABC"
        advancePercent={20}
        maxAdvancePercent={30}
        executedPct={105}
        semaphoreLevel="rojo"
      />,
    );

    expect(screen.queryByText(/Anticipo por encima del máximo/)).not.toBeInTheDocument();
    expect(screen.getByText(/Semáforo presupuestario en sobre-ejecución/)).toBeInTheDocument();
  });

  it("variante combinada: muestra ambas alertas cuando anticipo excede y el semáforo está en riesgo", () => {
    render(
      <HireConfirmDialog
        isOpen
        onClose={onClose as unknown as () => void}
        onConfirm={onConfirm as unknown as () => void}
        contractorName="Constructora ABC"
        advancePercent={50}
        maxAdvancePercent={30}
        executedPct={98}
        semaphoreLevel="naranja"
      />,
    );

    expect(screen.getByText(/Anticipo por encima del máximo configurado/)).toBeInTheDocument();
    expect(screen.getByText(/Semáforo presupuestario en al límite/)).toBeInTheDocument();
  });

  it("naranja también dispara la alerta de semáforo (no solo rojo)", () => {
    render(
      <HireConfirmDialog
        isOpen
        onClose={onClose as unknown as () => void}
        onConfirm={onConfirm as unknown as () => void}
        contractorName="Constructora ABC"
        advancePercent={20}
        maxAdvancePercent={30}
        executedPct={98}
        semaphoreLevel="naranja"
      />,
    );

    expect(screen.getByText(/Semáforo presupuestario/)).toBeInTheDocument();
  });

  it("amarillo NO dispara la alerta de semáforo", () => {
    render(
      <HireConfirmDialog
        isOpen
        onClose={onClose as unknown as () => void}
        onConfirm={onConfirm as unknown as () => void}
        contractorName="Constructora ABC"
        advancePercent={20}
        maxAdvancePercent={30}
        executedPct={90}
        semaphoreLevel="amarillo"
      />,
    );

    expect(screen.queryByText(/Semáforo presupuestario/)).not.toBeInTheDocument();
    expect(screen.getByText(/dentro de los parámetros configurados/)).toBeInTheDocument();
  });

  it("llama onConfirm al hacer click en Confirmar adjudicación", () => {
    render(
      <HireConfirmDialog
        isOpen
        onClose={onClose as unknown as () => void}
        onConfirm={onConfirm as unknown as () => void}
        contractorName="Constructora ABC"
        advancePercent={20}
        maxAdvancePercent={30}
        executedPct={50}
        semaphoreLevel="verde"
      />,
    );

    fireEvent.click(screen.getByText("Confirmar adjudicación"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("llama onClose al hacer click en Cancelar", () => {
    render(
      <HireConfirmDialog
        isOpen
        onClose={onClose as unknown as () => void}
        onConfirm={onConfirm as unknown as () => void}
        contractorName="Constructora ABC"
        advancePercent={20}
        maxAdvancePercent={30}
        executedPct={50}
        semaphoreLevel="verde"
      />,
    );

    fireEvent.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
