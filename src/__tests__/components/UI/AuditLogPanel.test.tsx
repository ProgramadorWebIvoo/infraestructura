import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuditLogPanel from "@/components/UI/AuditLogPanel";

interface Entry {
  id: number;
  label: string;
}

const entries: Entry[] = [
  { id: 1, label: "Anticipo máximo cambiado" },
  { id: 2, label: "Retención de notificaciones cambiada" },
];

function renderPanel(props: Partial<React.ComponentProps<typeof AuditLogPanel<Entry>>> = {}) {
  return render(
    <AuditLogPanel<Entry>
      entries={entries}
      searchableText={e => e.label}
      keyOf={e => e.id}
      renderEntry={e => <span>{e.label}</span>}
      {...props}
    />,
  );
}

describe("AuditLogPanel", () => {
  it("arranca colapsado por defecto (defaultOpen=false)", () => {
    renderPanel();

    expect(screen.queryByText("Anticipo máximo cambiado")).not.toBeInTheDocument();
  });

  it("arranca abierto si defaultOpen=true", () => {
    renderPanel({ defaultOpen: true });

    expect(screen.getByText("Anticipo máximo cambiado")).toBeInTheDocument();
  });

  it("muestra la cantidad de registros en el encabezado", () => {
    renderPanel();

    expect(screen.getByText("2 registros")).toBeInTheDocument();
  });

  it("expande y colapsa al hacer click en el encabezado", async () => {
    renderPanel();

    const toggle = screen.getByRole("button", { name: /Historial de cambios/ });
    fireEvent.click(toggle);
    expect(screen.getByText("Anticipo máximo cambiado")).toBeInTheDocument();

    fireEvent.click(toggle);
    await waitFor(() => expect(screen.queryByText("Anticipo máximo cambiado")).not.toBeInTheDocument());
  });

  it("filtra entradas por texto de búsqueda", () => {
    renderPanel({ defaultOpen: true });

    fireEvent.change(screen.getByPlaceholderText("Buscar en el historial..."), {
      target: { value: "retención" },
    });

    expect(screen.queryByText("Anticipo máximo cambiado")).not.toBeInTheDocument();
    expect(screen.getByText("Retención de notificaciones cambiada")).toBeInTheDocument();
  });

  it("muestra el mensaje vacío cuando no hay entradas", () => {
    renderPanel({ entries: [], defaultOpen: true, emptyMessage: "Nada por aquí" });

    expect(screen.getByText("Nada por aquí")).toBeInTheDocument();
  });

  it("muestra el spinner mientras isLoading es true", () => {
    const { container } = renderPanel({ isLoading: true, defaultOpen: true });

    expect(container.querySelector("[class*='animate-spin']")).toBeTruthy();
  });

  it("aplica posición sticky con el offset dado cuando sticky=true", () => {
    const { container } = renderPanel({ sticky: true, stickyOffset: "2rem" });

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("lg:sticky");
    expect(root.style.top).toBe("2rem");
  });

  it("no aplica sticky por defecto", () => {
    const { container } = renderPanel();

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain("lg:sticky");
  });

  it("limita la altura al viewport cuando fillViewport=true", () => {
    const { container } = renderPanel({ fillViewport: true, stickyOffset: "1.5rem" });

    const root = container.firstElementChild as HTMLElement;
    // jsdom normaliza "- 1.5rem - 1.5rem" a "- 1.5rem + 1.5rem" al serializar el CSSOM.
    expect(root.style.maxHeight).toBe("calc(100vh - 1.5rem + 1.5rem)");
  });
});