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
  settingKey: "anticipo_maximo_porcentaje",
  oldValue: "100",
  newValue: "60",
  userName: "Admin Test",
  changedAt: "2026-08-13 10:00",
};

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
    mockApiFetch.mockResolvedValueOnce([sampleLog]);

    const { result } = renderHook(() => useConfigAuditLogs("token", true));
    await flush();

    expect(mockApiFetch).toHaveBeenCalledWith("/config-audit-logs", { token: "token" });
    expect(result.current.logs).toEqual([sampleLog]);
    expect(result.current.isLoading).toBe(false);
  });

  it("cae a lista vacía si la respuesta es undefined", async () => {
    mockApiFetch.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useConfigAuditLogs("token", true));
    await flush();

    expect(result.current.logs).toEqual([]);
  });

  it("no vuelve a cargar automáticamente tras el primer fetch (hasLoaded)", async () => {
    mockApiFetch.mockResolvedValueOnce([sampleLog]);

    const { rerender } = renderHook(({ enabled }) => useConfigAuditLogs("token", enabled), {
      initialProps: { enabled: true },
    });
    await flush();

    rerender({ enabled: true });
    await flush();

    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });
});
