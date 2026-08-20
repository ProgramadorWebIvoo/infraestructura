import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfigAuditLogPanel from "@/components/UI/ConfigAuditLogPanel";
import type { ConfigAuditLogFilters, ConfigAuditLogRecord } from "@/hooks/useConfigAuditLogs";

const EMPTY_FILTERS: ConfigAuditLogFilters = {
  q: "", entityType: "", action: "", user: "", dateFrom: "", dateTo: "",
};

function makeLog(overrides: Partial<ConfigAuditLogRecord> = {}): ConfigAuditLogRecord {
  return {
    id: 1,
    entityType: "setting",
    action: "anticipo_maximo_porcentaje",
    settingKey: "anticipo_maximo_porcentaje",
    oldValue: "80",
    newValue: "90",
    userId: 7,
    userName: "Ana Admin",
    userEmail: "ana@ivoo.local",
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

  describe("filtros avanzados server-side", () => {
    it("sin `filters`/`onFilterChange`, no muestra el botón de filtros avanzados (compatibilidad hacia atrás)", () => {
      render(<ConfigAuditLogPanel logs={[makeLog()]} isLoading={false} />);

      expect(screen.queryByLabelText("Filtros avanzados")).not.toBeInTheDocument();
    });

    it("con `filters`/`onFilterChange`, muestra el botón de filtros avanzados", () => {
      render(
        <ConfigAuditLogPanel
          logs={[makeLog()]}
          isLoading={false}
          filters={EMPTY_FILTERS}
          onFilterChange={vi.fn()}
        />,
      );

      expect(screen.getByLabelText("Filtros avanzados")).toBeInTheDocument();
    });

    it("el buscador queda controlado por `filters.q`/`onFilterChange` en vez de filtrar localmente", () => {
      const onFilterChange = vi.fn();
      render(
        <ConfigAuditLogPanel
          logs={[makeLog()]}
          isLoading={false}
          filters={{ ...EMPTY_FILTERS, q: "texto previo" }}
          onFilterChange={onFilterChange}
        />,
      );

      const input = screen.getByPlaceholderText("Buscar por parámetro, usuario o valor...") as HTMLInputElement;
      expect(input.value).toBe("texto previo");

      fireEvent.change(input, { target: { value: "nuevo" } });
      expect(onFilterChange).toHaveBeenCalledWith("q", "nuevo");
    });

    it("expande el panel de filtros y permite cambiar tipo de entidad", () => {
      const onFilterChange = vi.fn();
      render(
        <ConfigAuditLogPanel
          logs={[makeLog()]}
          isLoading={false}
          filters={EMPTY_FILTERS}
          onFilterChange={onFilterChange}
        />,
      );

      fireEvent.click(screen.getByLabelText("Filtros avanzados"));

      const entityTypeSelect = screen.getByLabelText("Filtrar por tipo");
      fireEvent.click(entityTypeSelect);
      fireEvent.click(screen.getByRole("option", { name: "Proveedores" }));

      expect(onFilterChange).toHaveBeenCalledWith("entityType", "contractor");
    });

    it("deriva las opciones de acción a partir de los logs cargados", () => {
      const onFilterChange = vi.fn();
      render(
        <ConfigAuditLogPanel
          logs={[
            makeLog({ id: 1, entityType: "contractor", action: "Alta de proveedor" }),
            makeLog({ id: 2, entityType: "material", action: "Alta de material" }),
          ]}
          isLoading={false}
          filters={EMPTY_FILTERS}
          onFilterChange={onFilterChange}
        />,
      );

      fireEvent.click(screen.getByLabelText("Filtros avanzados"));
      fireEvent.click(screen.getByLabelText("Filtrar por acción"));

      expect(screen.getByRole("option", { name: "Alta de proveedor" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Alta de material" })).toBeInTheDocument();
    });

    it("dispara onFilterChange al escribir en el filtro de usuario", () => {
      const onFilterChange = vi.fn();
      render(
        <ConfigAuditLogPanel
          logs={[makeLog()]}
          isLoading={false}
          filters={EMPTY_FILTERS}
          onFilterChange={onFilterChange}
        />,
      );

      fireEvent.click(screen.getByLabelText("Filtros avanzados"));
      fireEvent.change(screen.getByLabelText("Filtrar por usuario"), { target: { value: "Ana" } });

      expect(onFilterChange).toHaveBeenCalledWith("user", "Ana");
    });

    it("dispara onFilterChange al elegir fecha desde/hasta", () => {
      const onFilterChange = vi.fn();
      render(
        <ConfigAuditLogPanel
          logs={[makeLog()]}
          isLoading={false}
          filters={EMPTY_FILTERS}
          onFilterChange={onFilterChange}
        />,
      );

      fireEvent.click(screen.getByLabelText("Filtros avanzados"));
      fireEvent.change(screen.getByLabelText("Fecha desde"), { target: { value: "2026-08-01" } });
      expect(onFilterChange).toHaveBeenCalledWith("dateFrom", "2026-08-01");

      fireEvent.change(screen.getByLabelText("Fecha hasta"), { target: { value: "2026-08-20" } });
      expect(onFilterChange).toHaveBeenCalledWith("dateTo", "2026-08-20");
    });

    it("muestra 'Limpiar filtros' solo cuando hay filtros activos, y llama a onClearFilters", () => {
      const onClearFilters = vi.fn();
      const { rerender } = render(
        <ConfigAuditLogPanel
          logs={[makeLog()]}
          isLoading={false}
          filters={EMPTY_FILTERS}
          onFilterChange={vi.fn()}
          onClearFilters={onClearFilters}
          activeFilterCount={0}
        />,
      );

      fireEvent.click(screen.getByLabelText("Filtros avanzados"));
      expect(screen.queryByText("Limpiar filtros")).not.toBeInTheDocument();

      rerender(
        <ConfigAuditLogPanel
          logs={[makeLog()]}
          isLoading={false}
          filters={{ ...EMPTY_FILTERS, entityType: "contractor" }}
          onFilterChange={vi.fn()}
          onClearFilters={onClearFilters}
          activeFilterCount={1}
        />,
      );

      fireEvent.click(screen.getByText("Limpiar filtros"));
      expect(onClearFilters).toHaveBeenCalled();
    });

    it("muestra el email actual del usuario junto al nombre snapshot", () => {
      render(<ConfigAuditLogPanel logs={[makeLog({ userName: "Ana Admin", userEmail: "ana@ivoo.local" })]} isLoading={false} />);

      expect(screen.getByText(/por Ana Admin/)).toBeInTheDocument();
      expect(screen.getByText("(ana@ivoo.local)")).toBeInTheDocument();
    });

    it("no muestra paréntesis de email cuando userEmail es null (usuario eliminado)", () => {
      render(<ConfigAuditLogPanel logs={[makeLog({ userName: "Ana Admin", userEmail: null })]} isLoading={false} />);

      expect(screen.getByText(/por Ana Admin/)).toBeInTheDocument();
      expect(screen.queryByText(/\(.*@.*\)/)).not.toBeInTheDocument();
    });

    it("muestra el badge de tipo de entidad en cada tarjeta cuando no es 'setting'", () => {
      render(
        <ConfigAuditLogPanel
          logs={[makeLog({ entityType: "contractor", action: "Alta de proveedor", settingKey: null })]}
          isLoading={false}
        />,
      );

      expect(screen.getByText("Proveedores")).toBeInTheDocument();
    });
  });
});
