import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CatalogPicker from "@/views/InfraestructuraMantenimientoPanel/components/CatalogPicker";

vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <p {...rest}>{children}</p>;
    },
    tbody: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <tbody {...rest}>{children}</tbody>;
    },
    tr: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, layout, ...rest } = props;
      return <tr {...rest}>{children}</tr>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, whileHover, whileTap, ...rest } = props;
      return <span {...rest}>{children}</span>;
    },
  },
}));
vi.mock("react-dom", () => ({ createPortal: (content: React.ReactNode) => content }));

afterEach(() => vi.restoreAllMocks());

const materialsCatalog = [{ name: "Cemento", unit: "Saco", estimatedUnitPrice: 12.5 }];

describe("CatalogPicker", () => {
  it("abre el modal al hacer click y propaga onConfirm", () => {
    const onConfirm = vi.fn();
    render(<CatalogPicker materialsCatalog={materialsCatalog} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByText("Elegir materiales del catálogo..."));
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByText("Agregar 1 material"));

    expect(onConfirm).toHaveBeenCalledWith([{ catalogIndex: 0, quantity: 1 }]);
  });

  it("deshabilita el trigger si el catálogo está vacío", () => {
    render(<CatalogPicker materialsCatalog={[]} onConfirm={vi.fn()} />);
    expect(screen.getByText("Elegir materiales del catálogo...").closest("button")).toBeDisabled();
  });
});
