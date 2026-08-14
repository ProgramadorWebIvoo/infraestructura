import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { useAppGroupSettings } from "@/hooks/useAppGroupSettings";

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => { await Promise.resolve(); });
  }
}

const DEFAULTS = {
  maxFileSizeBytes: 25 * 1024 * 1024,
  maxFileCount: 10,
  sessionTimeoutMs: 30 * 60_000,
};

describe("useAppGroupSettings", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("usa los defaults (25MB, 10 archivos, 30min) mientras carga", async () => {
    mockApiFetch.mockResolvedValueOnce({});

    const { result } = renderHook(() => useAppGroupSettings());

    expect(result.current).toEqual(DEFAULTS);
    await flush();
  });

  it("carga los valores configurados desde /settings", async () => {
    mockApiFetch.mockResolvedValueOnce({
      app: [
        { key: "documento_tamano_maximo_mb", value: "15" },
        { key: "documento_cantidad_maxima_archivos", value: "5" },
        { key: "sesion_inactividad_minutos", value: "60" },
      ],
    });

    const { result } = renderHook(() => useAppGroupSettings());
    await flush();

    expect(result.current).toEqual({
      maxFileSizeBytes: 15 * 1024 * 1024,
      maxFileCount: 5,
      sessionTimeoutMs: 60 * 60_000,
    });
  });

  it("cae a los defaults si el fetch falla", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("network error"));

    const { result } = renderHook(() => useAppGroupSettings());
    await flush();

    expect(result.current).toEqual(DEFAULTS);
  });

  it("cae a los defaults si el grupo app no existe en la respuesta", async () => {
    mockApiFetch.mockResolvedValueOnce({ presupuesto: [] });

    const { result } = renderHook(() => useAppGroupSettings());
    await flush();

    expect(result.current).toEqual(DEFAULTS);
  });

  it("cae al default de esa clave si el valor guardado es inválido (0, negativo, no numérico)", async () => {
    mockApiFetch.mockResolvedValueOnce({
      app: [
        { key: "documento_tamano_maximo_mb", value: "0" },
        { key: "documento_cantidad_maxima_archivos", value: "-1" },
        { key: "sesion_inactividad_minutos", value: "abc" },
      ],
    });

    const { result } = renderHook(() => useAppGroupSettings());
    await flush();

    expect(result.current).toEqual(DEFAULTS);
  });
});
