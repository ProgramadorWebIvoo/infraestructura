import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { useNotificationActionsCatalog } from "@/hooks/useNotificationActionsCatalog";

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => { await Promise.resolve(); });
  }
}

describe("useNotificationActionsCatalog", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("no consulta el endpoint sin authToken", async () => {
    renderHook(() => useNotificationActionsCatalog(""));
    await flush();

    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("carga el catálogo real desde /settings/notification-actions", async () => {
    mockApiFetch.mockResolvedValueOnce(["Rechazo de cuadro comparativo", "Confirmacion de contratacion"]);

    const { result } = renderHook(() => useNotificationActionsCatalog("token"));
    await flush();

    expect(mockApiFetch).toHaveBeenCalledWith("/settings/notification-actions", { token: "token" });
    expect(result.current.actions).toEqual(["Rechazo de cuadro comparativo", "Confirmacion de contratacion"]);
    expect(result.current.isLoading).toBe(false);
  });

  it("cae a lista vacía si la respuesta es undefined", async () => {
    mockApiFetch.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useNotificationActionsCatalog("token"));
    await flush();

    expect(result.current.actions).toEqual([]);
  });
});
