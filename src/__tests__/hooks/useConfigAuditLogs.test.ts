import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { useConfigAuditLogs, type ConfigAuditLogRecord } from "@/hooks/useConfigAuditLogs";

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => { await Promise.resolve(); });
  }
}

const sampleLog: ConfigAuditLogRecord = {
  id: 1,
  entityType: "setting",
  action: "anticipo_maximo_porcentaje",
  settingKey: "anticipo_maximo_porcentaje",
  oldValue: "100",
  newValue: "60",
  userName: "Admin Test",
  changedAt: "2026-08-13 10:00",
};

function page(items: ConfigAuditLogRecord[], overrides: Partial<{ currentPage: number; lastPage: number; total: number; perPage: number }> = {}) {
  return { items, currentPage: 1, lastPage: 1, total: items.length, perPage: 20, ...overrides };
}

describe("useConfigAuditLogs", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("no consulta el endpoint cuando enabled es false", async () => {
    renderHook(() => useConfigAuditLogs("token", false));
    await flush();

    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("carga los logs cuando enabled es true", async () => {
    mockApiFetch.mockResolvedValueOnce(page([sampleLog]));

    const { result } = renderHook(() => useConfigAuditLogs("token", true));
    await flush();

    expect(mockApiFetch).toHaveBeenCalledWith("/config-audit-logs?page=1&per_page=20", { token: "token" });
    expect(result.current.logs).toEqual([sampleLog]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.page).toBe(1);
    expect(result.current.lastPage).toBe(1);
    expect(result.current.total).toBe(1);
  });

  it("no vuelve a cargar automáticamente tras el primer fetch (hasLoaded)", async () => {
    mockApiFetch.mockResolvedValueOnce(page([sampleLog]));

    const { rerender } = renderHook(({ enabled }) => useConfigAuditLogs("token", enabled), {
      initialProps: { enabled: true },
    });
    await flush();

    rerender({ enabled: true });
    await flush();

    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  it("goToPage consulta la página solicitada y actualiza el estado", async () => {
    mockApiFetch.mockResolvedValueOnce(page([sampleLog], { currentPage: 1, lastPage: 2, total: 25 }));

    const { result } = renderHook(() => useConfigAuditLogs("token", true));
    await flush();

    mockApiFetch.mockResolvedValueOnce(page([{ ...sampleLog, id: 2 }], { currentPage: 2, lastPage: 2, total: 25 }));

    act(() => {
      result.current.goToPage(2);
    });
    await flush();

    expect(mockApiFetch).toHaveBeenCalledWith("/config-audit-logs?page=2&per_page=20", { token: "token" });
    expect(result.current.page).toBe(2);
    expect(result.current.logs).toEqual([{ ...sampleLog, id: 2 }]);
  });

  it("goToPage ignora páginas fuera de rango o la página actual", async () => {
    mockApiFetch.mockResolvedValueOnce(page([sampleLog], { currentPage: 1, lastPage: 2, total: 25 }));

    const { result } = renderHook(() => useConfigAuditLogs("token", true));
    await flush();

    act(() => {
      result.current.goToPage(1);
      result.current.goToPage(0);
      result.current.goToPage(3);
    });
    await flush();

    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  it("prependLocal inserta la entrada solo cuando se está en la página 1", async () => {
    mockApiFetch.mockResolvedValueOnce(page([sampleLog], { currentPage: 1, lastPage: 1, total: 1 }));

    const { result } = renderHook(() => useConfigAuditLogs("token", true));
    await flush();

    const newEntry: ConfigAuditLogRecord = { ...sampleLog, id: 99, newValue: "75" };
    act(() => {
      result.current.prependLocal(newEntry);
    });

    expect(result.current.logs[0]).toEqual(newEntry);
    expect(result.current.total).toBe(2);
  });
});
