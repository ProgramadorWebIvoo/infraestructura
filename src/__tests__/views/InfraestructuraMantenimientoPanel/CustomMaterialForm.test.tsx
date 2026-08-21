import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CustomMaterialForm from "@/views/InfraestructuraMantenimientoPanel/components/CustomMaterialForm";
import { ToastProvider } from "@/components/UI/Toast";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <p {...rest}>{children}</p>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <span {...rest}>{children}</span>;
    },
  },
}));

afterEach(() => vi.restoreAllMocks());

describe("CustomMaterialForm", () => {
  it("submit válido llama onAdd con el objeto correcto", () => {
    const onAdd = vi.fn();
    render(
      <ToastProvider>
        <CustomMaterialForm onAdd={onAdd} />
      </ToastProvider>,
    );

    fireEvent.change(screen.getByLabelText("Nombre del Material / Servicio"), {
      target: { value: "Mano de obra" },
    });
    fireEvent.click(screen.getByText("Agregar"));

    expect(onAdd).toHaveBeenCalledWith({
      name: "Mano de obra",
      quantity: 1,
      unit: "Unidad",
      estimatedUnitPrice: 1,
      condition: "NUEVO",
    });
  });

  it("submit sin nombre muestra error y no llama onAdd", () => {
    const onAdd = vi.fn();
    render(
      <ToastProvider>
        <CustomMaterialForm onAdd={onAdd} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("Agregar"));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText("Por favor, introduce el nombre del material personalizado.")).toBeInTheDocument();
  });
});
