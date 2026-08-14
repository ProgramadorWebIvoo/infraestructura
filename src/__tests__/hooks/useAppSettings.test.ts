import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { useAppSettings } from "@/hooks/useAppSettings";

describe("useAppSettings", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("separa `missing` de los grupos de settings al cargar", async () => {
    mockApiFetch.mockResolvedValueOnce({
      presupuesto: [{ id: 1, key: "anticipo_maximo_porcentaje" }],
      missing: ["proyecto_estancado_umbral_dias"],
    });

    const { result } = renderHook(() => useAppSettings("token"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.settings).toEqual({
      presupuesto: [{ id: 1, key: "anticipo_maximo_porcentaje" }],
    });
    expect(result.current.missingKeys).toEqual(["proyecto_estancado_umbral_dias"]);
  });

  it("missingKeys queda vacío si el backend no reporta ninguna key faltante", async () => {
    mockApiFetch.mockResolvedValueOnce({
      presupuesto: [{ id: 1, key: "anticipo_maximo_porcentaje" }],
      missing: [],
    });

    const { result } = renderHook(() => useAppSettings("token"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.missingKeys).toEqual([]);
  });

  it("missingKeys queda vacío por defecto si el backend no incluye la clave", async () => {
    mockApiFetch.mockResolvedValueOnce({
      presupuesto: [{ id: 1, key: "anticipo_maximo_porcentaje" }],
    });

    const { result } = renderHook(() => useAppSettings("token"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.missingKeys).toEqual([]);
  });

  it("no hace fetch sin authToken", async () => {
    renderHook(() => useAppSettings(""));
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});
