import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ActionRuleRow from "@/views/ConfigAppPanel/components/ActionRuleRow";

const roles = ["PROCURA", "SUPERADMIN", "FINANZAS"];

describe("ActionRuleRow", () => {
  it("arranca colapsada por defecto — no muestra los selectores de roles", () => {
    render(
      <ActionRuleRow
        action="Rechazo de cuadro comparativo"
        label="Rechazo de cuadro comparativo"
        roles={roles}
        value={{ app: ["PROCURA"], mail: [] }}
        onChange={vi.fn()}
        isCritical={false}
        isUnconfigured={false}
        isDirty={false}
      />,
    );

    expect(screen.getByText("Rechazo de cuadro comparativo")).toBeInTheDocument();
    expect(screen.queryByText("Notificación (app)")).not.toBeInTheDocument();
  });

  it("expande al hacer click y muestra los selectores de roles", () => {
    render(
      <ActionRuleRow
        action="Rechazo de cuadro comparativo"
        label="Rechazo de cuadro comparativo"
        roles={roles}
        value={{ app: ["PROCURA"], mail: [] }}
        onChange={vi.fn()}
        isCritical={false}
        isUnconfigured={false}
        isDirty={false}
      />,
    );

    fireEvent.click(screen.getByText("Rechazo de cuadro comparativo"));

    expect(screen.getByText("Notificación (app)")).toBeInTheDocument();
    expect(screen.getByText("Correo")).toBeInTheDocument();
  });

  it("muestra el badge Crítica cuando isCritical es true", () => {
    render(
      <ActionRuleRow
        action="Cambio de rol de usuario"
        label="Cambio de rol de usuario"
        roles={roles}
        value={{ app: ["SUPERADMIN"], mail: [] }}
        onChange={vi.fn()}
        isCritical
        isUnconfigured={false}
        isDirty={false}
      />,
    );

    expect(screen.getByText("Crítica")).toBeInTheDocument();
  });

  it("muestra el aviso de 'sin configurar' al expandir cuando isUnconfigured es true", () => {
    render(
      <ActionRuleRow
        action="Alta de material"
        label="Alta de material"
        roles={roles}
        value={{ app: [], mail: [] }}
        onChange={vi.fn()}
        isCritical={false}
        isUnconfigured
        isDirty={false}
      />,
    );

    fireEvent.click(screen.getByText("Alta de material"));

    expect(screen.getByText(/Sin configurar/)).toBeInTheDocument();
  });

  it("togglear un rol propaga el nuevo value vía onChange (sin guardar directamente)", async () => {
    const onChange = vi.fn();
    render(
      <ActionRuleRow
        action="Rechazo de cuadro comparativo"
        label="Rechazo de cuadro comparativo"
        roles={roles}
        value={{ app: ["PROCURA"], mail: [] }}
        onChange={onChange}
        isCritical={false}
        isUnconfigured={false}
        isDirty={false}
      />,
    );

    fireEvent.click(screen.getByText("Rechazo de cuadro comparativo"));
    fireEvent.click(screen.getAllByText("Finanzas")[0]);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ app: ["PROCURA", "FINANZAS"], mail: [] }));
  });

  it("muestra un indicador visual cuando isDirty es true", async () => {
    const { rerender } = render(
      <ActionRuleRow
        action="X"
        label="X"
        roles={roles}
        value={{ app: ["PROCURA"], mail: [] }}
        onChange={vi.fn()}
        isCritical={false}
        isUnconfigured={false}
        isDirty={false}
      />,
    );

    expect(document.querySelector(".bg-warning-400")).not.toBeInTheDocument();

    rerender(
      <ActionRuleRow
        action="X"
        label="X"
        roles={roles}
        value={{ app: ["PROCURA", "FINANZAS"], mail: [] }}
        onChange={vi.fn()}
        isCritical={false}
        isUnconfigured={false}
        isDirty
      />,
    );

    const dirtyIndicator = document.querySelector(".bg-warning-400");
    expect(dirtyIndicator).toBeInTheDocument();

    fireEvent.focus(dirtyIndicator!);
    await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("Cambios sin guardar"));
  });

  it("muestra un mensaje de error inline cuando se pasa `error`", () => {
    render(
      <ActionRuleRow
        action="X"
        label="X"
        roles={roles}
        value={{ app: [], mail: [] }}
        onChange={vi.fn()}
        isCritical
        isUnconfigured={false}
        isDirty
        error="Esta acción es crítica: debe tener al menos un rol."
      />,
    );

    fireEvent.click(screen.getByText("X"));

    expect(screen.getByText("Esta acción es crítica: debe tener al menos un rol.")).toBeInTheDocument();
  });

  it("muestra el badge 'Silenciada' cuando ambos canales están apagados por el interruptor maestro", () => {
    render(
      <ActionRuleRow
        action="Creacion de peticion de obra"
        label="Creacion de peticion de obra"
        roles={roles}
        value={{ app: ["SUPERADMIN"], mail: [] }}
        onChange={vi.fn()}
        isCritical={false}
        isUnconfigured={false}
        isDirty={false}
        silencedChannels={["app", "mail"]}
      />,
    );

    expect(screen.getByText("Silenciada")).toBeInTheDocument();
  });

  it("no muestra 'Silenciada' cuando solo un canal está apagado", () => {
    render(
      <ActionRuleRow
        action="X"
        label="X"
        roles={roles}
        value={{ app: ["SUPERADMIN"], mail: [] }}
        onChange={vi.fn()}
        isCritical={false}
        isUnconfigured={false}
        isDirty={false}
        silencedChannels={["mail"]}
      />,
    );

    expect(screen.queryByText("Silenciada")).not.toBeInTheDocument();
  });

  it("deshabilita el selector del canal silenciado y muestra el aviso al expandir", () => {
    render(
      <ActionRuleRow
        action="X"
        label="X"
        roles={roles}
        value={{ app: ["SUPERADMIN"], mail: [] }}
        onChange={vi.fn()}
        isCritical={false}
        isUnconfigured={false}
        isDirty={false}
        silencedChannels={["app"]}
      />,
    );

    fireEvent.click(screen.getByText("X"));

    expect(screen.getByText('Desactivada en "Acciones que envían notificación (app)"')).toBeInTheDocument();
    expect(screen.queryByText('Desactivada en "Acciones que envían correo"')).not.toBeInTheDocument();

    const appToggle = screen.getAllByText("Super Administrador")[0].closest("button");
    expect(appToggle).toBeDisabled();
  });
});
