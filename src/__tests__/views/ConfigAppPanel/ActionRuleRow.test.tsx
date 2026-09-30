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
        value={{ app: ["PROCURA"], mail: [], appEnabled: true, mailEnabled: true }}
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
        value={{ app: ["PROCURA"], mail: [], appEnabled: true, mailEnabled: true }}
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
        value={{ app: ["SUPERADMIN"], mail: [], appEnabled: true, mailEnabled: true }}
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
        value={{ app: [], mail: [], appEnabled: true, mailEnabled: true }}
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
        value={{ app: ["PROCURA"], mail: [], appEnabled: true, mailEnabled: true }}
        onChange={onChange}
        isCritical={false}
        isUnconfigured={false}
        isDirty={false}
      />,
    );

    fireEvent.click(screen.getByText("Rechazo de cuadro comparativo"));
    fireEvent.click(screen.getAllByText("Finanzas")[0]);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ app: ["PROCURA", "FINANZAS"], mail: [], appEnabled: true, mailEnabled: true }));
  });

  it("muestra un indicador visual cuando isDirty es true", async () => {
    const { rerender } = render(
      <ActionRuleRow
        action="X"
        label="X"
        roles={roles}
        value={{ app: ["PROCURA"], mail: [], appEnabled: true, mailEnabled: true }}
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
        value={{ app: ["PROCURA", "FINANZAS"], mail: [], appEnabled: true, mailEnabled: true }}
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
        value={{ app: [], mail: [], appEnabled: true, mailEnabled: true }}
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

  it("no renderiza toggles de canal (el on/off vive en las listas de canales)", () => {
    render(
      <ActionRuleRow
        action="X"
        label="X"
        roles={roles}
        value={{ app: ["SUPERADMIN"], mail: [], appEnabled: true, mailEnabled: true }}
        onChange={vi.fn()}
        isCritical={false}
        isUnconfigured={false}
        isDirty={false}
      />,
    );

    fireEvent.click(screen.getByText("X"));

    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByText("Apagado")).not.toBeInTheDocument();
  });

  it("deshabilita el selector de roles del canal app apagado y explica por qué", () => {
    render(
      <ActionRuleRow
        action="X"
        label="X"
        roles={roles}
        value={{ app: ["SUPERADMIN"], mail: [], appEnabled: false, mailEnabled: true }}
        onChange={vi.fn()}
        isCritical={false}
        isUnconfigured={false}
        isDirty={false}
      />,
    );

    fireEvent.click(screen.getByText("X"));

    expect(screen.getByText(/Desactivado en "Acciones que envían notificación \(app\)"/)).toBeInTheDocument();
    expect(screen.queryByText(/Desactivado en "Acciones que envían correo"/)).not.toBeInTheDocument();
    const appRole = screen.getAllByText("Super Administrador")[0].closest("button");
    expect(appRole).toBeDisabled();
  });

  it("deshabilita el selector de roles del canal correo apagado", () => {
    render(
      <ActionRuleRow
        action="X"
        label="X"
        roles={roles}
        value={{ app: [], mail: ["SUPERADMIN"], appEnabled: true, mailEnabled: false }}
        onChange={vi.fn()}
        isCritical={false}
        isUnconfigured={false}
        isDirty={false}
      />,
    );

    fireEvent.click(screen.getByText("X"));

    expect(screen.getByText(/Desactivado en "Acciones que envían correo"/)).toBeInTheDocument();
  });
});
