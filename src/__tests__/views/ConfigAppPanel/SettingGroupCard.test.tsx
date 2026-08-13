import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Coins } from "lucide-react";
import SettingGroupCard from "@/views/ConfigAppPanel/components/SettingGroupCard";
import type { AppSettingRecord } from "@/hooks/useAppSettings";

function makeSetting(overrides: Partial<AppSettingRecord> = {}): AppSettingRecord {
  return {
    id: 1,
    group: "presupuesto",
    key: "anticipo_maximo_porcentaje",
    value: "100",
    type: "integer",
    min_value: 0,
    max_value: 100,
    label: "Anticipo máximo (%)",
    description: null,
    created_at: "2026-08-12T00:00:00.000000Z",
    updated_at: "2026-08-12T00:00:00.000000Z",
    ...overrides,
  } as AppSettingRecord;
}

const meta = { title: "Presupuesto y anticipos", description: "desc", icon: <Coins className="h-5 w-5" />, color: "sky" };

describe("SettingGroupCard", () => {
  it("renderiza el header y una fila por setting", () => {
    render(
      <SettingGroupCard
        group="presupuesto"
        meta={meta}
        settings={[makeSetting()]}
        valueOf={s => s.value ?? ""}
        onChange={vi.fn()}
        errors={{}}
      />,
    );

    expect(screen.getByText("Presupuesto y anticipos")).toBeInTheDocument();
    expect(screen.getByText("Anticipo máximo (%)")).toBeInTheDocument();
  });

  it("muestra el banner del semáforo solo para el grupo presupuesto", () => {
    const { rerender } = render(
      <SettingGroupCard group="presupuesto" meta={meta} settings={[makeSetting()]} valueOf={s => s.value ?? ""} onChange={vi.fn()} errors={{}} />,
    );
    expect(screen.getByText(/Cómo funciona el semáforo/)).toBeInTheDocument();

    rerender(
      <SettingGroupCard group="fiscal" meta={meta} settings={[makeSetting()]} valueOf={s => s.value ?? ""} onChange={vi.fn()} errors={{}} />,
    );
    expect(screen.queryByText(/Cómo funciona el semáforo/)).not.toBeInTheDocument();
  });

  it("propaga onChange al editar un input", () => {
    const onChange = vi.fn();
    render(
      <SettingGroupCard group="presupuesto" meta={meta} settings={[makeSetting()]} valueOf={s => s.value ?? ""} onChange={onChange} errors={{}} />,
    );

    fireEvent.change(screen.getByDisplayValue("100"), { target: { value: "50" } });

    expect(onChange).toHaveBeenCalledWith(1, "50");
  });

  it("muestra el error inline correspondiente al id del setting", () => {
    render(
      <SettingGroupCard
        group="presupuesto"
        meta={meta}
        settings={[makeSetting()]}
        valueOf={s => s.value ?? ""}
        onChange={vi.fn()}
        errors={{ 1: "Valor inválido." }}
      />,
    );

    expect(screen.getByText("Valor inválido.")).toBeInTheDocument();
  });
});
