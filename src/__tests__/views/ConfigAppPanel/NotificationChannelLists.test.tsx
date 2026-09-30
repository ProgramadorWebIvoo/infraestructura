import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import NotificationChannelLists from "@/views/ConfigAppPanel/components/NotificationChannelLists";
import type { NotificationActionOption, NotificationRuleChannels } from "@/hooks/useNotificationRules";

const RESET = "Correo de restablecimiento de contrasena";

const actions: NotificationActionOption[] = [
  { value: "Alta de material", label: "Alta de material", group: "catalogos", critical: false, appEnabled: true, mailEnabled: false, recipientType: "roles" },
  { value: "Rechazo de cuadro comparativo", label: "Rechazo de cuadro comparativo", group: "proyectos", critical: true, appEnabled: true, mailEnabled: true, recipientType: "roles" },
  { value: "Correo de adjudicacion a proveedor", label: "Correo de adjudicacion a proveedor", group: "proveedores", critical: false, appEnabled: false, mailEnabled: true, recipientType: "external" },
  { value: RESET, label: RESET, group: "usuarios", critical: false, appEnabled: false, mailEnabled: true, recipientType: "external" },
];

const state: Record<string, NotificationRuleChannels> = Object.fromEntries(
  actions.map(a => [a.value, { app: ["SUPERADMIN"], mail: [], appEnabled: a.appEnabled, mailEnabled: a.mailEnabled }]),
);
const valueOf = (action: string) => state[action];

function renderLists(onChange = vi.fn()) {
  render(<NotificationChannelLists actions={actions} valueOf={valueOf} onChange={onChange} />);
  const appSection = screen.getByText("Acciones que envían notificación (app)").closest("section") as HTMLElement;
  const mailSection = screen.getByText("Acciones que envían correo").closest("section") as HTMLElement;
  return { onChange, appSection, mailSection };
}

describe("NotificationChannelLists", () => {
  it("muestra las dos listas y refleja appEnabled/mailEnabled como chips seleccionados", () => {
    const { appSection, mailSection } = renderLists();

    expect(within(appSection).getByText("Alta de material").closest("button")).toHaveAttribute("aria-pressed", "true");
    expect(within(mailSection).getByText("Alta de material").closest("button")).toHaveAttribute("aria-pressed", "false");
    expect(within(mailSection).getByText("Rechazo de cuadro comparativo").closest("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("las acciones externas solo aparecen en la lista de correo", () => {
    const { appSection, mailSection } = renderLists();

    expect(within(appSection).queryByText("Correo de adjudicacion a proveedor")).not.toBeInTheDocument();
    expect(within(mailSection).getByText("Correo de adjudicacion a proveedor")).toBeInTheDocument();
  });

  it("seleccionar un chip de correo propaga appEnabled/mailEnabled solo de esa acción", () => {
    const { onChange, mailSection } = renderLists();

    fireEvent.click(within(mailSection).getByText("Alta de material"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("Alta de material", { app: ["SUPERADMIN"], mail: [], appEnabled: true, mailEnabled: true });
  });

  it("quitar un chip de la lista app apaga solo ese canal y conserva los roles", () => {
    const { onChange, appSection } = renderLists();

    fireEvent.click(within(appSection).getByText("Alta de material"));

    expect(onChange).toHaveBeenCalledWith("Alta de material", { app: ["SUPERADMIN"], mail: [], appEnabled: false, mailEnabled: false });
  });

  it("una acción crítica no se puede quitar de la lista app", () => {
    const { onChange, appSection } = renderLists();

    fireEvent.click(within(appSection).getByText("Rechazo de cuadro comparativo"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("el correo de restablecimiento de contraseña no se puede quitar de la lista de correo", () => {
    const { onChange, mailSection } = renderLists();

    fireEvent.click(within(mailSection).getByText(RESET));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("'Ninguna' apaga todo salvo lo bloqueado", () => {
    const { onChange, mailSection } = renderLists();

    fireEvent.click(within(mailSection).getByText("Ninguna"));

    const changed = onChange.mock.calls.map(c => c[0]);
    expect(changed).toContain("Rechazo de cuadro comparativo");
    expect(changed).toContain("Correo de adjudicacion a proveedor");
    expect(changed).not.toContain(RESET);
  });

  it("muestra la nota de que críticas y reset no se pueden desactivar", () => {
    renderLists();

    expect(screen.getByText(/no pueden desactivarse/)).toBeInTheDocument();
  });
});
