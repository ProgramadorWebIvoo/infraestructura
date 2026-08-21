import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TextField from "@/components/UI/TextField";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <p {...rest}>{children}</p>;
    },
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TextField", () => {
  it("asocia label e input vía htmlFor/id", () => {
    render(<TextField id="my-field" label="Nombre" value="" onChange={vi.fn()} />);
    const input = screen.getByLabelText("Nombre");
    expect(input).toHaveAttribute("id", "my-field");
  });

  it("renderiza textarea cuando as='textarea'", () => {
    render(<TextField id="desc" label="Descripción" value="" onChange={vi.fn()} as="textarea" />);
    expect(screen.getByLabelText("Descripción").tagName).toBe("TEXTAREA");
  });

  it("llama onChange con el nuevo valor", () => {
    const onChange = vi.fn();
    render(<TextField id="name" label="Nombre" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Cemento" } });
    expect(onChange).toHaveBeenCalledWith("Cemento");
  });

  it("muestra el mensaje de error vía FieldError", () => {
    render(<TextField id="name" label="Nombre" value="" onChange={vi.fn()} error="Campo requerido" />);
    expect(screen.getByText("Campo requerido")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveAttribute("aria-invalid", "true");
  });

  it("showCounter muestra {len}/{maxLength}", () => {
    render(
      <TextField id="obs" label="Observaciones" value="hola" onChange={vi.fn()} maxLength={500} showCounter />,
    );
    expect(screen.getByText("4/500")).toBeInTheDocument();
  });

  it("renderiza el icono cuando se pasa", () => {
    render(
      <TextField
        id="loc"
        label="Ubicación"
        value=""
        onChange={vi.fn()}
        icon={<span data-testid="pin-icon">📍</span>}
      />,
    );
    expect(screen.getByTestId("pin-icon")).toBeInTheDocument();
  });
});
