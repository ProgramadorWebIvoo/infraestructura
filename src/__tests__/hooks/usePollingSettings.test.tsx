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

import { usePollingSettings } from "@/hooks/usePollingSettings";
import { PublicSettingsProvider } from "@/components/UI/PublicSettingsProvider";

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => { await Promise.resolve(); });
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return <PublicSettingsProvider>{children}</PublicSettingsProvider>;
}

describe("usePollingSettings", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockUseAuth.mockReturnValue({ authToken: "token" });
  });

  it("usa los defaults (8s notificaciones, 25s dashboard) mientras carga", async () => {
    mockApiFetch.mockResolvedValueOnce({});

    const { result } = renderHook(() => usePollingSettings(), { wrapper });

    expect(result.current).toEqual({ notificationsIntervalMs: 8_000, dashboardIntervalMs: 25_000 });
    await flush();
  });

  it("carga los intervalos configurados desde /settings", async () => {
    mockApiFetch.mockResolvedValueOnce({
      notificaciones: [
        { key: "polling_notificaciones_segundos", value: "15" },
        { key: "polling_dashboard_segundos", value: "60" },
      ],
    });

    const { result } = renderHook(() => usePollingSettings(), { wrapper });
    await flush();

    expect(result.current).toEqual({ notificationsIntervalMs: 15_000, dashboardIntervalMs: 60_000 });
  });

  it("cae a los defaults si el fetch falla", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("network error"));

    const { result } = renderHook(() => usePollingSettings(), { wrapper });
    await flush();

    expect(result.current).toEqual({ notificationsIntervalMs: 8_000, dashboardIntervalMs: 25_000 });
  });

  it("cae a los defaults si el grupo notificaciones no existe en la respuesta", async () => {
    mockApiFetch.mockResolvedValueOnce({ presupuesto: [] });

    const { result } = renderHook(() => usePollingSettings(), { wrapper });
    await flush();

    expect(result.current).toEqual({ notificationsIntervalMs: 8_000, dashboardIntervalMs: 25_000 });
  });

  it("cae al default de esa clave si el valor guardado es inválido (0, negativo, no numérico)", async () => {
    mockApiFetch.mockResolvedValueOnce({
      notificaciones: [
        { key: "polling_notificaciones_segundos", value: "0" },
        { key: "polling_dashboard_segundos", value: "abc" },
      ],
    });

    const { result } = renderHook(() => usePollingSettings(), { wrapper });
    await flush();

    expect(result.current).toEqual({ notificationsIntervalMs: 8_000, dashboardIntervalMs: 25_000 });
  });

  it("no fetchea si no hay authToken", async () => {
    mockUseAuth.mockReturnValue({ authToken: "" });

    renderHook(() => usePollingSettings(), { wrapper });
    await flush();

    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});
