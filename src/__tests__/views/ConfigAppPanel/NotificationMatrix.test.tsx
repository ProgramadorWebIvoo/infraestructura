import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotificationMatrix from "@/views/ConfigAppPanel/components/NotificationMatrix";
import type { NotificationActionOption, NotificationRuleChannels } from "@/hooks/useNotificationRules";

const actions: NotificationActionOption[] = [
  { value: "Rechazo de cuadro comparativo", label: "Rechazo de cuadro comparativo", group: "proyectos", critical: true },
  { value: "Alta de material", label: "Alta de material", group: "catalogos", critical: false },
];

const roles = ["SUPERADMIN", "PROCURA", "CATALOGOS"];

function makeValueOf(overrides: Record<string, NotificationRuleChannels> = {}) {
  return (action: string): NotificationRuleChannels => overrides[action] ?? { app: [], mail: [] };
}

describe("NotificationMatrix", () => {
  it("muestra el spinner mientras isLoading es true", () => {
    const { container } = render(
      <NotificationMatrix
        actions={[]}
        roles={[]}
        isLoading
        valueOf={makeValueOf()}
        onChange={vi.fn()}
        isDirty={() => false}
        unconfigured={[]}
        errors={{}}
        silencedChannelsFor={() => []}
      />,
    );

    expect(container.querySelector("[class*='animate-spin']")).toBeTruthy();
  });

  it("agrupa las acciones por categoría y las muestra colapsadas", () => {
    render(
      <NotificationMatrix
        actions={actions}
        roles={roles}
        isLoading={false}
        valueOf={makeValueOf({ "Rechazo de cuadro comparativo": { app: ["PROCURA"], mail: [] } })}
        onChange={vi.fn()}
        isDirty={() => false}
        unconfigured={["Alta de material"]}
        errors={{}}
        silencedChannelsFor={() => []}
      />,
    );

    expect(screen.getByText("Flujo de proyectos")).toBeInTheDocument();
    expect(screen.getByText("Catálogos (proveedores y materiales)")).toBeInTheDocument();
    expect(screen.getByText("Rechazo de cuadro comparativo")).toBeInTheDocument();
    expect(screen.getByText("Alta de material")).toBeInTheDocument();
    // Colapsadas por defecto: no se ven los selectores de roles todavía.
    expect(screen.queryByText("Notificación (app)")).not.toBeInTheDocument();
  });

  it("muestra el banner de acciones sin configurar", () => {
    render(
      <NotificationMatrix
        actions={actions}
        roles={roles}
        isLoading={false}
        valueOf={makeValueOf()}
        onChange={vi.fn()}
        isDirty={() => false}
        unconfigured={["Alta de material"]}
        errors={{}}
        silencedChannelsFor={() => []}
      />,
    );

    expect(screen.getByText(/no tiene/)).toBeInTheDocument();
  });

  it("el buscador filtra por texto de la acción", () => {
    render(
      <NotificationMatrix
        actions={actions}
        roles={roles}
        isLoading={false}
        valueOf={makeValueOf()}
        onChange={vi.fn()}
        isDirty={() => false}
        unconfigured={[]}
        errors={{}}
        silencedChannelsFor={() => []}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Buscar acción..."), { target: { value: "material" } });

    expect(screen.queryByText("Rechazo de cuadro comparativo")).not.toBeInTheDocument();
    expect(screen.getByText("Alta de material")).toBeInTheDocument();
  });

  it("togglear un rol de una fila expandida propaga onChange con la acción correcta", () => {
    const onChange = vi.fn();
    render(
      <NotificationMatrix
        actions={actions}
        roles={roles}
        isLoading={false}
        valueOf={makeValueOf()}
        onChange={onChange}
        isDirty={() => false}
        unconfigured={[]}
        errors={{}}
        silencedChannelsFor={() => []}
      />,
    );

    fireEvent.click(screen.getByText("Alta de material"));
    fireEvent.click(screen.getAllByText("Catálogos")[0]);

    expect(onChange).toHaveBeenCalledWith("Alta de material", { app: ["CATALOGOS"], mail: [] });
  });

  it("propaga silencedChannelsFor a la fila correspondiente", () => {
    render(
      <NotificationMatrix
        actions={actions}
        roles={roles}
        isLoading={false}
        valueOf={makeValueOf({ "Rechazo de cuadro comparativo": { app: ["PROCURA"], mail: [] } })}
        onChange={vi.fn()}
        isDirty={() => false}
        unconfigured={[]}
        errors={{}}
        silencedChannelsFor={action => (action === "Rechazo de cuadro comparativo" ? ["app", "mail"] : [])}
      />,
    );

    expect(screen.getByText("Silenciada")).toBeInTheDocument();
  });
});
