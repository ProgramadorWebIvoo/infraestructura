import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingRow from "@/views/ConfigAppPanel/components/SettingRow";
import type { AppSettingRecord } from "@/hooks/useAppSettings";

type OnChange = (id: number, value: string) => void;

// SettingRow es un componente controlado — para probar el saneamiento del
// input (clamp, bloqueo de notación científica, etc.) necesitamos un wrapper
// que refleje el onChange de vuelta al value, como hace ConfigAppPanel.
function ControlledSettingRow({ setting }: { setting: AppSettingRecord }) {
  const [value, setValue] = useState(setting.value ?? "");
  return <SettingRow setting={setting} value={value} onChange={(_id, v) => setValue(v)} />;
}

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
    description: "Porcentaje máximo de anticipo permitido.",
    created_at: "2026-08-12T00:00:00.000000Z",
    updated_at: "2026-08-12T00:00:00.000000Z",
    ...overrides,
  } as AppSettingRecord;
}

describe("SettingRow", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it("renderiza label y descripción", () => {
    render(<SettingRow setting={makeSetting()} value="100" onChange={onChange as unknown as OnChange} />);

    expect(screen.getByText("Anticipo máximo (%)")).toBeInTheDocument();
    expect(screen.getByText("Porcentaje máximo de anticipo permitido.")).toBeInTheDocument();
  });

  it("llama onChange con el nuevo valor al editar un input de tipo integer", () => {
    render(<SettingRow setting={makeSetting()} value="100" onChange={onChange as unknown as OnChange} />);

    const input = screen.getByDisplayValue("100");
    fireEvent.change(input, { target: { value: "75" } });

    expect(onChange).toHaveBeenCalledWith(1, "75");
  });

  it("renderiza un checkbox para settings de tipo boolean", () => {
    render(
      <SettingRow
        setting={makeSetting({ type: "boolean", value: "false", key: "cambios_bloqueados" })}
        value="false"
        onChange={onChange as unknown as OnChange}
      />,
    );

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(screen.getByText("Desactivado")).toBeInTheDocument();

    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith(1, "true");
  });

  it("renderiza un textarea para settings de tipo json", () => {
    render(
      <SettingRow
        setting={makeSetting({ type: "json", value: '["a","b"]', key: "acciones_con_correo" })}
        value='["a","b"]'
        onChange={onChange as unknown as OnChange}
      />,
    );

    expect(screen.getByDisplayValue('["a","b"]').tagName).toBe("TEXTAREA");
  });

  it("clampa un valor porcentual por encima del máximo permitido", () => {
    render(<ControlledSettingRow setting={makeSetting()} />);

    const input = screen.getByDisplayValue("100");
    fireEvent.change(input, { target: { value: "150" } });

    expect((input as HTMLInputElement).value).toBe("100");
  });

  it("clampa un valor porcentual por debajo del mínimo permitido (sin negativos)", () => {
    render(<ControlledSettingRow setting={makeSetting()} />);

    const input = screen.getByDisplayValue("100");
    fireEvent.change(input, { target: { value: "-5" } });

    expect((input as HTMLInputElement).value).toBe("0");
  });

  it("no permite decimales en un setting de tipo integer", () => {
    render(<ControlledSettingRow setting={makeSetting()} />);

    const input = screen.getByDisplayValue("100");
    fireEvent.change(input, { target: { value: "45.7" } });

    expect((input as HTMLInputElement).value).toBe("45");
  });

  it("bloquea la notación científica ('e') en el input numérico", () => {
    render(<ControlledSettingRow setting={makeSetting({ value: "20", max_value: null })} />);

    const input = screen.getByDisplayValue("20");
    fireEvent.change(input, { target: { value: "10e5" } });

    expect((input as HTMLInputElement).value).toBe("105");
  });

  it("muestra el rango permitido para settings numéricos acotados", () => {
    render(<SettingRow setting={makeSetting()} value="100" onChange={onChange as unknown as OnChange} />);

    expect(screen.getByText("Rango permitido: 0 a 100")).toBeInTheDocument();
  });

  it("renderiza un selector de tags (no textarea) para acciones_con_correo cuando hay catálogo", () => {
    render(
      <SettingRow
        setting={makeSetting({ type: "json", value: '["Rechazo de cuadro comparativo"]', key: "acciones_con_correo" })}
        value='["Rechazo de cuadro comparativo"]'
        onChange={onChange as unknown as OnChange}
        notificationActionsCatalog={["Rechazo de cuadro comparativo", "Confirmacion de contratacion"]}
      />,
    );

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("Rechazo de cuadro comparativo")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Confirmacion de contratacion")).toHaveAttribute("aria-pressed", "false");
  });

  it("al togglear un tag, propaga el nuevo array serializado vía onChange", () => {
    render(
      <SettingRow
        setting={makeSetting({ type: "json", value: "[]", key: "acciones_con_notificacion_app" })}
        value="[]"
        onChange={onChange as unknown as OnChange}
        notificationActionsCatalog={["Carga de propuesta", "Confirmacion de contratacion"]}
      />,
    );

    fireEvent.click(screen.getByText("Carga de propuesta"));

    expect(onChange).toHaveBeenCalledWith(1, JSON.stringify(["Carga de propuesta"]));
  });
});
