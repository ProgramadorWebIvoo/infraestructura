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

import { useBudgetSemaphore, levelOf, type SemaphoreThresholds } from "@/hooks/useBudgetSemaphore";
import { PublicSettingsProvider } from "@/components/UI/PublicSettingsProvider";

const DEFAULT_THRESHOLDS: SemaphoreThresholds = { verde: 80, amarillo: 95, naranja: 100 };

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => { await Promise.resolve(); });
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return <PublicSettingsProvider>{children}</PublicSettingsProvider>;
}

describe("levelOf", () => {
  it("clasifica verde hasta el umbral verde inclusive", () => {
    expect(levelOf(0, DEFAULT_THRESHOLDS)).toBe("verde");
    expect(levelOf(80, DEFAULT_THRESHOLDS)).toBe("verde");
  });

  it("clasifica amarillo entre verde y amarillo", () => {
    expect(levelOf(81, DEFAULT_THRESHOLDS)).toBe("amarillo");
    expect(levelOf(95, DEFAULT_THRESHOLDS)).toBe("amarillo");
  });

  it("clasifica naranja entre amarillo y naranja", () => {
    expect(levelOf(96, DEFAULT_THRESHOLDS)).toBe("naranja");
    expect(levelOf(100, DEFAULT_THRESHOLDS)).toBe("naranja");
  });

  it("clasifica rojo por encima del umbral naranja", () => {
    expect(levelOf(101, DEFAULT_THRESHOLDS)).toBe("rojo");
    expect(levelOf(150, DEFAULT_THRESHOLDS)).toBe("rojo");
  });

  it("respeta umbrales personalizados", () => {
    const custom: SemaphoreThresholds = { verde: 50, amarillo: 70, naranja: 90 };
    expect(levelOf(60, custom)).toBe("amarillo");
    expect(levelOf(95, custom)).toBe("rojo");
  });
});

describe("useBudgetSemaphore", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockUseAuth.mockReturnValue({ authToken: "token" });
  });

  it("usa umbrales por defecto mientras carga y hasta que responda el fetch", async () => {
    mockApiFetch.mockResolvedValueOnce({});

    const { result } = renderHook(() => useBudgetSemaphore(), { wrapper });

    expect(result.current.thresholds).toEqual(DEFAULT_THRESHOLDS);
    await flush();
  });

  it("carga los umbrales configurados desde /settings", async () => {
    mockApiFetch.mockResolvedValueOnce({
      presupuesto: [
        { key: "semaforo_umbral_verde", value: "70" },
        { key: "semaforo_umbral_amarillo", value: "85" },
        { key: "semaforo_umbral_naranja", value: "95" },
        { key: "anticipo_maximo_porcentaje", value: "100" },
      ],
    });

    const { result } = renderHook(() => useBudgetSemaphore(), { wrapper });
    await flush();

    expect(result.current.thresholds).toEqual({ verde: 70, amarillo: 85, naranja: 95 });
    expect(result.current.levelOf(80)).toBe("amarillo");
  });

  it("cae a los defaults si el fetch falla", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("network error"));

    const { result } = renderHook(() => useBudgetSemaphore(), { wrapper });
    await flush();

    expect(result.current.thresholds).toEqual(DEFAULT_THRESHOLDS);
  });
});
