import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePublicSettingsStore } from "@/stores/publicSettingsStore";
import { useAppGroupSettings } from "@/hooks/useAppGroupSettings";

const DEFAULTS = {
  maxFileSizeBytes: 25 * 1024 * 1024,
  maxFileCount: 10,
  sessionTimeoutMs: 30 * 60_000,
};

describe("useAppGroupSettings", () => {
  beforeEach(() => {
    // Proyección pura sobre publicSettingsStore (ver docblock del hook) —
    // se siembra el store directamente en vez de mockear apiFetch, mismo
    // criterio que useFrozenBsAmount.test.ts/useCurrencyConversion.test.ts
    // para exchangeRatesStore.
    usePublicSettingsStore.setState({ settings: {}, isLoading: false, hasLoaded: false });
  });

  it("usa los defaults (25MB, 10 archivos, 30min) mientras no hay datos en el store", () => {
    const { result } = renderHook(() => useAppGroupSettings());

    expect(result.current).toEqual(DEFAULTS);
  });

  it("lee los valores configurados desde el store compartido", () => {
    usePublicSettingsStore.setState({
      settings: {
        app: [
          { key: "documento_tamano_maximo_mb", value: "15" },
          { key: "documento_cantidad_maxima_archivos", value: "5" },
          { key: "sesion_inactividad_minutos", value: "60" },
        ],
      },
      isLoading: false,
      hasLoaded: true,
    });

    const { result } = renderHook(() => useAppGroupSettings());

    expect(result.current).toEqual({
      maxFileSizeBytes: 15 * 1024 * 1024,
      maxFileCount: 5,
      sessionTimeoutMs: 60 * 60_000,
    });
  });

  it("cae a los defaults si el grupo app no existe en el store", () => {
    usePublicSettingsStore.setState({
      settings: { presupuesto: [] },
      isLoading: false,
      hasLoaded: true,
    });

    const { result } = renderHook(() => useAppGroupSettings());

    expect(result.current).toEqual(DEFAULTS);
  });

  it("cae al default de esa clave si el valor guardado es inválido (0, negativo, no numérico)", () => {
    usePublicSettingsStore.setState({
      settings: {
        app: [
          { key: "documento_tamano_maximo_mb", value: "0" },
          { key: "documento_cantidad_maxima_archivos", value: "-1" },
          { key: "sesion_inactividad_minutos", value: "abc" },
        ],
      },
      isLoading: false,
      hasLoaded: true,
    });

    const { result } = renderHook(() => useAppGroupSettings());

    expect(result.current).toEqual(DEFAULTS);
  });

  it("reacciona cuando el store se actualiza después del mount", () => {
    const { result, rerender } = renderHook(() => useAppGroupSettings());
    expect(result.current).toEqual(DEFAULTS);

    usePublicSettingsStore.setState({
      settings: { app: [{ key: "documento_cantidad_maxima_archivos", value: "3" }] },
      isLoading: false,
      hasLoaded: true,
    });
    rerender();

    expect(result.current.maxFileCount).toBe(3);
  });
});
