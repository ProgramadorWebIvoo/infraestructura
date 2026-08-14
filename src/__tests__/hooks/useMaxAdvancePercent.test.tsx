import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const mockUseAuth = vi.fn(() => ({ authToken: "token" }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { useMaxAdvancePercent } from "@/hooks/useMaxAdvancePercent";
import { PublicSettingsProvider } from "@/components/UI/PublicSettingsProvider";

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => { await Promise.resolve(); });
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return <PublicSettingsProvider>{children}</PublicSettingsProvider>;
}

describe("useMaxAdvancePercent", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockUseAuth.mockReturnValue({ authToken: "token" });
  });

  it("usa 100 por defecto mientras carga", async () => {
    mockApiFetch.mockResolvedValueOnce({});

    const { result } = renderHook(() => useMaxAdvancePercent(), { wrapper });

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

    const { result } = renderHook(() => useMaxAdvancePercent(), { wrapper });
    await flush();

    expect(result.current).toBe(40);
  });

  it("cae a 100 si el fetch falla", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("network error"));

    const { result } = renderHook(() => useMaxAdvancePercent(), { wrapper });
    await flush();

    expect(result.current).toBe(100);
  });

  it("cae a 100 si el setting no existe en la respuesta", async () => {
    mockApiFetch.mockResolvedValueOnce({ presupuesto: [] });

    const { result } = renderHook(() => useMaxAdvancePercent(), { wrapper });
    await flush();

    expect(result.current).toBe(100);
  });
});
