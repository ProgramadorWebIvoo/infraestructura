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
  userId: 5,
  userName: "Admin Test",
  userEmail: "admin@ivoo.local",
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

  describe("filtros", () => {
    it("expone filtros vacíos y activeFilterCount en 0 por defecto", async () => {
      mockApiFetch.mockResolvedValueOnce(page([sampleLog]));
      const { result } = renderHook(() => useConfigAuditLogs("token", true));
      await flush();

      expect(result.current.filters).toEqual({
        q: "", entityType: "", action: "", user: "", dateFrom: "", dateTo: "",
      });
      expect(result.current.activeFilterCount).toBe(0);
    });

    it("updateFilter envía entity_type/action/user/date_from/date_to al backend y resetea a página 1", async () => {
      mockApiFetch.mockResolvedValueOnce(page([sampleLog]));
      const { result } = renderHook(() => useConfigAuditLogs("token", true));
      await flush();

      mockApiFetch.mockResolvedValueOnce(page([], { total: 0 }));
      act(() => {
        result.current.updateFilter("entityType", "contractor");
      });
      await flush();

      expect(mockApiFetch).toHaveBeenLastCalledWith(
        "/config-audit-logs?page=1&per_page=20&entity_type=contractor",
        { token: "token" },
      );
      expect(result.current.activeFilterCount).toBe(1);
    });

    it("debounce en q: el fetch final incluye el término solo tras el delay, no letra por letra", async () => {
      mockApiFetch.mockResolvedValue(page([sampleLog]));
      const { result } = renderHook(() => useConfigAuditLogs("token", true));
      await flush();

      act(() => {
        result.current.updateFilter("q", "A");
      });
      act(() => {
        result.current.updateFilter("q", "An");
      });
      act(() => {
        result.current.updateFilter("q", "Andes");
      });

      await new Promise((resolve) => setTimeout(resolve, 500));
      await flush();

      // Ninguna llamada intermedia con "A" o "An" — solo el término final,
      // tras asentarse el debounce.
      const queries = mockApiFetch.mock.calls.map((c) => c[0] as string);
      expect(queries.some((q) => q.includes("q=A&") || q.endsWith("q=A"))).toBe(false);
      expect(queries.some((q) => q.includes("q=An&") || q.endsWith("q=An"))).toBe(false);
      expect(mockApiFetch).toHaveBeenLastCalledWith(
        "/config-audit-logs?page=1&per_page=20&q=Andes",
        { token: "token" },
      );
    });

    it("combina múltiples filtros en la misma query", async () => {
      mockApiFetch.mockResolvedValueOnce(page([sampleLog]));
      const { result } = renderHook(() => useConfigAuditLogs("token", true));
      await flush();

      mockApiFetch.mockResolvedValueOnce(page([]));
      act(() => {
        result.current.updateFilter("entityType", "material");
        result.current.updateFilter("dateFrom", "2026-08-01");
        result.current.updateFilter("dateTo", "2026-08-20");
      });
      await flush();

      const lastCall = mockApiFetch.mock.calls.at(-1)?.[0] as string;
      expect(lastCall).toContain("entity_type=material");
      expect(lastCall).toContain("date_from=2026-08-01");
      expect(lastCall).toContain("date_to=2026-08-20");
      expect(result.current.activeFilterCount).toBe(3);
    });

    it("clearFilters vuelve todos los filtros a vacío y recarga sin ellos", async () => {
      mockApiFetch.mockResolvedValueOnce(page([sampleLog]));
      const { result } = renderHook(() => useConfigAuditLogs("token", true));
      await flush();

      mockApiFetch.mockResolvedValueOnce(page([]));
      act(() => {
        result.current.updateFilter("action", "Alta de proveedor");
      });
      await flush();

      mockApiFetch.mockResolvedValueOnce(page([sampleLog]));
      act(() => {
        result.current.clearFilters();
      });
      await flush();

      expect(mockApiFetch).toHaveBeenLastCalledWith("/config-audit-logs?page=1&per_page=20", { token: "token" });
      expect(result.current.activeFilterCount).toBe(0);
    });

    it("prependLocal no inserta la entrada si hay filtros activos", async () => {
      mockApiFetch.mockResolvedValueOnce(page([sampleLog], { total: 1 }));
      const { result } = renderHook(() => useConfigAuditLogs("token", true));
      await flush();

      mockApiFetch.mockResolvedValueOnce(page([sampleLog], { total: 1 }));
      act(() => {
        result.current.updateFilter("entityType", "material");
      });
      await flush();

      const totalBefore = result.current.total;
      act(() => {
        result.current.prependLocal({ ...sampleLog, id: 99 });
      });

      expect(result.current.total).toBe(totalBefore);
    });
  });
});
