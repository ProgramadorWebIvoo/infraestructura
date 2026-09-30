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

  it("muestra el badge 'Apagado' cuando ambos canales están apagados", () => {
    render(
      <ActionRuleRow
        action="Creacion de peticion de obra"
        label="Creacion de peticion de obra"
        roles={roles}
        value={{ app: ["SUPERADMIN"], mail: [], appEnabled: false, mailEnabled: false }}
        onChange={vi.fn()}
        isCritical={false}
        isUnconfigured={false}
        isDirty={false}
      />,
    );

    expect(screen.getByText("Apagado")).toBeInTheDocument();
  });

  it("no muestra 'Apagado' cuando solo un canal está apagado", () => {
    render(
      <ActionRuleRow
        action="X"
        label="X"
        roles={roles}
        value={{ app: ["SUPERADMIN"], mail: [], appEnabled: true, mailEnabled: false }}
        onChange={vi.fn()}
        isCritical={false}
        isUnconfigured={false}
        isDirty={false}
      />,
    );

    expect(screen.queryByText("Apagado")).not.toBeInTheDocument();
  });

  it("el toggle de un canal propaga appEnabled/mailEnabled vía onChange", () => {
    const onChange = vi.fn();
    render(
      <ActionRuleRow
        action="X"
        label="X"
        roles={roles}
        value={{ app: ["SUPERADMIN"], mail: [], appEnabled: true, mailEnabled: true }}
        onChange={onChange}
        isCritical={false}
        isUnconfigured={false}
        isDirty={false}
      />,
    );

    fireEvent.click(screen.getByText("X"));
    fireEvent.click(screen.getByRole("switch", { name: "Canal app activo" }));
    expect(onChange).toHaveBeenCalledWith({ app: ["SUPERADMIN"], mail: [], appEnabled: false, mailEnabled: true });

    fireEvent.click(screen.getByRole("switch", { name: "Canal correo activo" }));
    expect(onChange).toHaveBeenCalledWith({ app: ["SUPERADMIN"], mail: [], appEnabled: true, mailEnabled: false });
  });

  it("deshabilita el selector de roles del canal apagado", () => {
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

    expect(screen.getByText("Canal apagado")).toBeInTheDocument();
    const appRole = screen.getAllByText("Super Administrador")[0].closest("button");
    expect(appRole).toBeDisabled();
  });

  it("en una acción crítica el toggle app no se puede apagar", () => {
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

    fireEvent.click(screen.getByText("Cambio de rol de usuario"));

    expect(screen.getByRole("switch", { name: "Canal app activo" })).toBeDisabled();
  });

  it("una acción externa muestra solo el toggle de correo y el texto de destinatario externo", () => {
    const onChange = vi.fn();
    render(
      <ActionRuleRow
        action="Correo de adjudicacion a proveedor"
        label="Correo de adjudicacion a proveedor"
        roles={roles}
        value={{ app: [], mail: [], appEnabled: false, mailEnabled: true }}
        onChange={onChange}
        isCritical={false}
        recipientType="external"
        isUnconfigured={false}
        isDirty={false}
      />,
    );

    fireEvent.click(screen.getByText("Correo de adjudicacion a proveedor"));

    expect(screen.getByText("Destinatario externo (proveedor / usuario)")).toBeInTheDocument();
    expect(screen.queryByText("Notificación (app)")).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Canal app activo" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "Canal correo activo" }));
    expect(onChange).toHaveBeenCalledWith({ app: [], mail: [], appEnabled: false, mailEnabled: false });
  });

  it("el correo de restablecimiento de contraseña queda bloqueado en encendido", () => {
    render(
      <ActionRuleRow
        action="Correo de restablecimiento de contrasena"
        label="Correo de restablecimiento de contrasena"
        roles={roles}
        value={{ app: [], mail: [], appEnabled: false, mailEnabled: true }}
        onChange={vi.fn()}
        isCritical={false}
        recipientType="external"
        isUnconfigured={false}
        isDirty={false}
      />,
    );

    fireEvent.click(screen.getByText("Correo de restablecimiento de contrasena"));

    const toggle = screen.getByRole("switch", { name: "Canal correo activo" });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });
});
