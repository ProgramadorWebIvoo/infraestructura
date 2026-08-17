import { describe, it, expect, vi } from "vitest";
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
    renderPanel({ defaultOpen: true });

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

  it("muestra el skeleton mientras isLoading es true", () => {
    const { container } = renderPanel({ isLoading: true, defaultOpen: true });

    expect(container.querySelectorAll(".skeleton-shimmer").length).toBeGreaterThan(0);
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

  it("muestra el total de pagination en vez de entries.length cuando se pasa pagination", () => {
    renderPanel({ defaultOpen: true, pagination: { page: 1, lastPage: 3, total: 55, onPageChange: () => {} } });

    expect(screen.getByText("55 registros")).toBeInTheDocument();
  });

  it("no muestra controles de página cuando lastPage es 1", () => {
    renderPanel({ defaultOpen: true, pagination: { page: 1, lastPage: 1, total: 2, onPageChange: () => {} } });

    expect(screen.queryByRole("button", { name: "Página siguiente" })).not.toBeInTheDocument();
  });

  it("muestra controles de página y llama a onPageChange al navegar", () => {
    const onPageChange = vi.fn();
    renderPanel({ defaultOpen: true, pagination: { page: 2, lastPage: 3, total: 55, onPageChange } });

    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByRole("button", { name: "Página anterior" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("deshabilita 'anterior' en la primera página y 'siguiente' en la última", () => {
    renderPanel({ defaultOpen: true, pagination: { page: 1, lastPage: 3, total: 55, onPageChange: () => {} } });

    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Página siguiente" })).not.toBeDisabled();
  });
});