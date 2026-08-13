import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { useMaxAdvancePercent } from "@/hooks/useMaxAdvancePercent";

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => { await Promise.resolve(); });
  }
}

describe("useMaxAdvancePercent", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("usa 100 por defecto mientras carga", async () => {
    mockApiFetch.mockResolvedValueOnce({});

    const { result } = renderHook(() => useMaxAdvancePercent());

    expect(result.current).toBe(100);
    await flush();
  });

  it("carga el máximo configurado desde /settings", async () => {
    mockApiFetch.mockResolvedValueOnce({
      presupuesto: [
        { key: "anticipo_maximo_porcentaje", value: "40" },
        { key: "semaforo_umbral_verde", value: "80" },
      ],
    });

    const { result } = renderHook(() => useMaxAdvancePercent());
    await flush();

    expect(result.current).toBe(40);
  });

  it("cae a 100 si el fetch falla", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("network error"));

    const { result } = renderHook(() => useMaxAdvancePercent());
    await flush();

    expect(result.current).toBe(100);
  });

  it("cae a 100 si el setting no existe en la respuesta", async () => {
    mockApiFetch.mockResolvedValueOnce({ presupuesto: [] });

    const { result } = renderHook(() => useMaxAdvancePercent());
    await flush();

    expect(result.current).toBe(100);
  });
});
