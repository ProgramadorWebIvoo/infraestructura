import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfigAuditLogPanel from "@/components/UI/ConfigAuditLogPanel";
import type { ConfigAuditLogRecord } from "@/hooks/useConfigAuditLogs";

function makeLog(overrides: Partial<ConfigAuditLogRecord> = {}): ConfigAuditLogRecord {
  return {
    id: 1,
    entityType: "setting",
    action: "anticipo_maximo_porcentaje",
    settingKey: "anticipo_maximo_porcentaje",
    oldValue: "80",
    newValue: "90",
    userName: "Ana Admin",
    changedAt: "2026-08-14 10:00",
    ...overrides,
  };
}

describe("ConfigAuditLogPanel", () => {
  it("usa el label legible del catálogo para entradas entityType: setting cuando se pasa settingLabelByKey", () => {
    render(
      <ConfigAuditLogPanel
        logs={[makeLog()]}
        isLoading={false}
        settingLabelByKey={{ anticipo_maximo_porcentaje: "Anticipo máximo (%)" }}
      />,
    );

    expect(screen.getByText("Anticipo máximo (%)")).toBeInTheDocument();
  });

  it("cae a la key cruda si no hay label en settingLabelByKey para una entrada tipo setting", () => {
    render(<ConfigAuditLogPanel logs={[makeLog()]} isLoading={false} />);

    expect(screen.getByText("anticipo_maximo_porcentaje")).toBeInTheDocument();
  });

  it("usa `action` como título para entidades administrativas sin settingLabelByKey (ej. config de IA, monedas)", () => {
    render(
      <ConfigAuditLogPanel
        logs={[
          makeLog({
            id: 2,
            entityType: "ai_config",
            action: "Modificacion de configuracion de IA",
            settingKey: null,
          }),
        ]}
        isLoading={false}
      />,
    );

    expect(screen.getByText("Modificacion de configuracion de IA")).toBeInTheDocument();
  });

  it("renderiza el diff de valores y el usuario que hizo el cambio", () => {
    render(<ConfigAuditLogPanel logs={[makeLog()]} isLoading={false} />);

    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByText("por Ana Admin")).toBeInTheDocument();
  });

  it("filtra por texto de búsqueda incluyendo el título resuelto", () => {
    render(
      <ConfigAuditLogPanel
        logs={[
          makeLog({ id: 1, settingKey: "anticipo_maximo_porcentaje" }),
          makeLog({ id: 2, settingKey: "otra_key", action: "otra_key", oldValue: "1", newValue: "2" }),
        ]}
        isLoading={false}
        settingLabelByKey={{ anticipo_maximo_porcentaje: "Anticipo máximo (%)" }}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Buscar por parámetro, usuario o valor..."), {
      target: { value: "anticipo" },
    });

    expect(screen.getByText("Anticipo máximo (%)")).toBeInTheDocument();
    expect(screen.queryByText("otra_key")).not.toBeInTheDocument();
  });

  it("muestra el mensaje vacío cuando no hay logs", () => {
    render(<ConfigAuditLogPanel logs={[]} isLoading={false} />);

    expect(screen.getByText("Todavía no se ha modificado ningún parámetro.")).toBeInTheDocument();
  });

  it("acepta un título personalizado", () => {
    render(<ConfigAuditLogPanel logs={[]} isLoading={false} title="Historial de IA" />);
    expect(screen.getByText("Historial de IA")).toBeInTheDocument();
  });

  it("pasa la paginación a AuditLogPanel correctamente", () => {
    render(
      <ConfigAuditLogPanel
        logs={[makeLog()]}
        isLoading={false}
        pagination={{ page: 2, lastPage: 3, total: 45, onPageChange: () => {} }}
      />,
    );

    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
  });
});
