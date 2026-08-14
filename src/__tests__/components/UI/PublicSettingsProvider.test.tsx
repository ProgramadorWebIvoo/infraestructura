import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { PublicSettingsProvider, usePublicSettings } from "@/components/UI/PublicSettingsProvider";

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const mockUseAuth = vi.fn(() => ({ authToken: "token" }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => { await Promise.resolve(); });
  }
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <PublicSettingsProvider>{children}</PublicSettingsProvider>;
}

describe("PublicSettingsProvider", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockUseAuth.mockReturnValue({ authToken: "token" });
  });

  it("arranca con isLoading=true y settings vacío", () => {
    mockApiFetch.mockResolvedValueOnce({});

    const { result } = renderHook(() => usePublicSettings(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.settings).toEqual({});
  });

  it("carga /settings una sola vez y expone el resultado a todos los consumidores", async () => {
    mockApiFetch.mockResolvedValueOnce({
      presupuesto: [{ key: "anticipo_maximo_porcentaje", value: "40" }],
    });

    function TwoConsumers() {
      const a = usePublicSettings();
      const b = usePublicSettings();
      return { a, b };
    }

    const { result } = renderHook(() => TwoConsumers(), { wrapper });
    await flush();

    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(mockApiFetch).toHaveBeenCalledWith("/settings", { token: "authenticated" });
    expect(result.current.a.settings).toBe(result.current.b.settings);
    expect(result.current.a.isLoading).toBe(false);
    expect(result.current.a.settings.presupuesto?.[0].value).toBe("40");
  });

  it("no fetchea si no hay authToken", async () => {
    mockUseAuth.mockReturnValue({ authToken: "" });

    renderHook(() => usePublicSettings(), { wrapper });
    await flush();

    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("deja isLoading=false y settings vacío si el fetch falla", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("network error"));

    const { result } = renderHook(() => usePublicSettings(), { wrapper });
    await flush();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.settings).toEqual({});
  });

  it("lanza si se usa fuera del provider", () => {
    expect(() => renderHook(() => usePublicSettings())).toThrow(
      "usePublicSettings debe usarse dentro de PublicSettingsProvider",
    );
  });
});
