import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotificationMatrix from "@/views/ConfigAppPanel/components/NotificationMatrix";
import type { NotificationActionOption, NotificationRuleChannels } from "@/hooks/useNotificationRules";

const actions: NotificationActionOption[] = [
  { value: "Rechazo de cuadro comparativo", label: "Rechazo de cuadro comparativo", group: "proyectos", critical: true, appEnabled: true, mailEnabled: true, recipientType: "roles" },
  { value: "Alta de material", label: "Alta de material", group: "catalogos", critical: false, appEnabled: true, mailEnabled: true, recipientType: "roles" },
];

const roles = ["SUPERADMIN", "PROCURA", "CATALOGOS"];

function makeValueOf(overrides: Record<string, NotificationRuleChannels> = {}) {
  return (action: string): NotificationRuleChannels => overrides[action] ?? { app: [], mail: [], appEnabled: true, mailEnabled: true };
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
      />,
    );

    expect(container.querySelectorAll(".skeleton-shimmer").length).toBeGreaterThan(0);
  });

  it("agrupa las acciones por categoría y las muestra colapsadas", () => {
    render(
      <NotificationMatrix
        actions={actions}
        roles={roles}
        isLoading={false}
        valueOf={makeValueOf({ "Rechazo de cuadro comparativo": { app: ["PROCURA"], mail: [], appEnabled: true, mailEnabled: true } })}
        onChange={vi.fn()}
        isDirty={() => false}
        unconfigured={["Alta de material"]}
        errors={{}}
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
      />,
    );

    fireEvent.click(screen.getByText("Alta de material"));
    fireEvent.click(screen.getAllByText("Catálogos")[0]);

    expect(onChange).toHaveBeenCalledWith("Alta de material", { app: ["CATALOGOS"], mail: [], appEnabled: true, mailEnabled: true });
  });

  it("muestra el grupo 'Configuración administrativa' y oculta las acciones externas (solo van en la lista de correo)", () => {
    render(
      <NotificationMatrix
        actions={[
          { value: "Alta de rol", label: "Alta de rol", group: "configuracion", critical: false, appEnabled: true, mailEnabled: true, recipientType: "roles" },
          { value: "Correo de adjudicacion a proveedor", label: "Correo de adjudicacion a proveedor", group: "proveedores", critical: false, appEnabled: false, mailEnabled: true, recipientType: "external" },
        ]}
        roles={roles}
        isLoading={false}
        valueOf={makeValueOf()}
        onChange={vi.fn()}
        isDirty={() => false}
        unconfigured={[]}
        errors={{}}
      />,
    );

    expect(screen.getByText("Configuración administrativa")).toBeInTheDocument();
    expect(screen.getByText("Alta de rol")).toBeInTheDocument();
    expect(screen.queryByText("Correo de adjudicacion a proveedor")).not.toBeInTheDocument();
  });

  it("con el canal apagado, el selector de roles de esa fila queda deshabilitado", () => {
    render(
      <NotificationMatrix
        actions={actions}
        roles={roles}
        isLoading={false}
        valueOf={makeValueOf({ "Alta de material": { app: ["SUPERADMIN"], mail: [], appEnabled: false, mailEnabled: true } })}
        onChange={vi.fn()}
        isDirty={() => false}
        unconfigured={[]}
        errors={{}}
      />,
    );

    fireEvent.click(screen.getByText("Alta de material"));

    expect(screen.getByText(/Desactivado en "Acciones que envían notificación/)).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});
