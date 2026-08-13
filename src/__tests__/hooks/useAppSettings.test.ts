import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { useAppSettings, type SettingsByGroup, type AppSettingRecord } from "@/hooks/useAppSettings";

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

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => { await Promise.resolve(); });
  }
}

describe("useAppSettings", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("carga los settings agrupados al montar", async () => {
    const grouped: SettingsByGroup = { presupuesto: [makeSetting()] };
    mockApiFetch.mockResolvedValueOnce(grouped);

    const { result } = renderHook(() => useAppSettings("token"));
    await flush();

    expect(mockApiFetch).toHaveBeenCalledWith("/settings", { token: "token" });
    expect(result.current.settings).toEqual(grouped);
    expect(result.current.isLoading).toBe(false);
  });

  it("sin authToken no consulta el endpoint", async () => {
    renderHook(() => useAppSettings(""));
    await flush();

    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("updateSetting reemplaza el registro actualizado dentro de su grupo, preservando el resto", async () => {
    const grouped: SettingsByGroup = {
      presupuesto: [makeSetting({ id: 1 }), makeSetting({ id: 2, key: "semaforo_umbral_verde", value: "80" })],
    };
    mockApiFetch.mockResolvedValueOnce(grouped);

    const { result } = renderHook(() => useAppSettings("token"));
    await flush();

    const updated = makeSetting({ id: 1, value: "60" });
    mockApiFetch.mockResolvedValueOnce(updated);

    await act(async () => {
      await result.current.updateSetting(1, "60");
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/settings/1", {
      method: "PATCH",
      body: JSON.stringify({ value: "60" }),
      token: "token",
    });
    expect(result.current.settings.presupuesto.find(s => s.id === 1)?.value).toBe("60");
    expect(result.current.settings.presupuesto.find(s => s.id === 2)?.value).toBe("80");
  });
});
