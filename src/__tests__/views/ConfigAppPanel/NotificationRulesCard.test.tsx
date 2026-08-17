import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NotificationRulesCard from "@/views/ConfigAppPanel/components/NotificationRulesCard";
import type { NotificationActionOption } from "@/hooks/useNotificationRules";

const actions: NotificationActionOption[] = [
  { value: "Rechazo de cuadro comparativo", label: "Rechazo de cuadro comparativo", group: "proyectos", critical: false },
];

describe("NotificationRulesCard", () => {
  it("renderiza el header y delega en NotificationMatrix", () => {
    render(
      <NotificationRulesCard
        actions={actions}
        roles={["SUPERADMIN"]}
        isLoading={false}
        valueOf={() => ({ app: [], mail: [] })}
        onChange={vi.fn()}
        isDirty={() => false}
        unconfigured={[]}
        errors={{}}
        silencedChannelsFor={() => []}
      />,
    );

    expect(screen.getByText("Notificaciones por rol")).toBeInTheDocument();
    expect(screen.getByText("Rechazo de cuadro comparativo")).toBeInTheDocument();
  });

  it("muestra el spinner cuando isLoading es true", () => {
    const { container } = render(
      <NotificationRulesCard
        actions={[]}
        roles={[]}
        isLoading
        valueOf={() => ({ app: [], mail: [] })}
        onChange={vi.fn()}
        isDirty={() => false}
        unconfigured={[]}
        errors={{}}
        silencedChannelsFor={() => []}
      />,
    );

    expect(container.querySelectorAll(".skeleton-shimmer").length).toBeGreaterThan(0);
  });
});
