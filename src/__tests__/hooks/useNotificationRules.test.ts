import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { useNotificationRules } from "@/hooks/useNotificationRules";

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => { await Promise.resolve(); });
  }
}

const sampleResponse = {
  actions: [
    { value: "Rechazo de cuadro comparativo", label: "Rechazo de cuadro comparativo", group: "proyectos", critical: true },
    { value: "Alta de material", label: "Alta de material", group: "catalogos", critical: false },
  ],
  roles: ["SUPERADMIN", "ADMIN", "PROCURA"],
  rules: {
    "Rechazo de cuadro comparativo": { app: ["PROCURA", "SUPERADMIN"], mail: ["SUPERADMIN"] },
  },
  unconfigured: ["Alta de material"],
};

describe("useNotificationRules", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("no consulta el endpoint cuando enabled es false", async () => {
    renderHook(() => useNotificationRules("token", false));
    await flush();

    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("carga actions, roles, rules y unconfigured", async () => {
    mockApiFetch.mockResolvedValueOnce(sampleResponse);

    const { result } = renderHook(() => useNotificationRules("token", true));
    await flush();

    expect(mockApiFetch).toHaveBeenCalledWith("/notification-rules", { token: "token" });
    expect(result.current.actions).toEqual(sampleResponse.actions);
    expect(result.current.roles).toEqual(sampleResponse.roles);
    expect(result.current.rules).toEqual(sampleResponse.rules);
    expect(result.current.unconfigured).toEqual(["Alta de material"]);
  });

  it("no vuelve a cargar automáticamente tras el primer fetch", async () => {
    mockApiFetch.mockResolvedValueOnce(sampleResponse);

    const { rerender } = renderHook(({ enabled }) => useNotificationRules("token", enabled), {
      initialProps: { enabled: true },
    });
    await flush();
    rerender({ enabled: true });
    await flush();

    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  it("updateRule hace PUT y actualiza el estado local, sin recargar todo", async () => {
    mockApiFetch.mockResolvedValueOnce(sampleResponse);
    const { result } = renderHook(() => useNotificationRules("token", true));
    await flush();

    mockApiFetch.mockResolvedValueOnce({ action: "Alta de material", app: ["CATALOGOS"], mail: [] });

    await act(async () => {
      await result.current.updateRule("Alta de material", { app: ["CATALOGOS"], mail: [] });
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/notification-rules", {
      method: "PUT",
      body: JSON.stringify({ action: "Alta de material", app: ["CATALOGOS"], mail: [] }),
      token: "token",
    });
    expect(result.current.rules["Alta de material"]).toEqual({ app: ["CATALOGOS"], mail: [] });
    // Al guardarse, deja de estar "sin configurar".
    expect(result.current.unconfigured).not.toContain("Alta de material");
  });

  it("updateRule propaga el error si el PUT falla (para que la fila lo muestre)", async () => {
    mockApiFetch.mockResolvedValueOnce(sampleResponse);
    const { result } = renderHook(() => useNotificationRules("token", true));
    await flush();

    mockApiFetch.mockRejectedValueOnce(new Error("Acción crítica sin roles"));

    await expect(
      act(async () => {
        await result.current.updateRule("Rechazo de cuadro comparativo", { app: [], mail: [] });
      }),
    ).rejects.toThrow("Acción crítica sin roles");
  });
});
