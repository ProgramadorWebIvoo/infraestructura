/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

// vi.hoisted: vi.mock() se hoistea al tope del archivo, así que las
// variables que su factory referencia deben crearse también hoisteadas.
const { loadChunkNext, loadChunkOther } = vi.hoisted(() => ({
  loadChunkNext: vi.fn(() => Promise.resolve({ default: () => null })),
  loadChunkOther: vi.fn(() => Promise.resolve({ default: () => null })),
}));

vi.mock("@/routes/prefetchRegistry", () => ({
  ROUTE_PREFETCH: {
    "/presidencia": { loadChunk: loadChunkNext },
    "/usuarios": { loadChunk: loadChunkOther },
  },
}));

vi.mock("@/routes", () => ({
  ROUTES: {
    HOME: "/",
    PRESIDENCIA: "/presidencia",
    MARKETING: "/marketing",
    INFRAESTRUCTURA: "/infraestructura",
    CIERRE_OBRA: "/cierre-obra",
    PROCURA: "/procura",
    ANALISTAS: "/analistas",
    FINANZAS: "/finanzas",
    CATALOGOS: "/catalogos",
    USUARIOS: "/usuarios",
    CONFIG_PROVEEDORES: "/config-proveedores",
    CONFIG_MATERIALES: "/config-materiales",
    CONFIG_IA: "/config-ia",
    CONFIG_APP: "/config-app",
  },
}));

import { useIdleRoutePrefetch } from "@/hooks/useIdleRoutePrefetch";

describe("useIdleRoutePrefetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loadChunkNext.mockClear();
    loadChunkOther.mockClear();
    // jsdom no implementa requestIdleCallback — se fuerza el fallback
    // setTimeout(2000) para poder controlar el tiempo con fake timers.
    // @ts-expect-error -- limpiar cualquier polyfill que otro test haya dejado
    delete window.requestIdleCallback;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no dispara nada sin activeRole", async () => {
    renderHook(() => useIdleRoutePrefetch(undefined, () => true));
    await vi.advanceTimersByTimeAsync(3000);
    expect(loadChunkNext).not.toHaveBeenCalled();
  });

  it("precarga el chunk de la ruta probable para el rol tras el idle timeout", async () => {
    renderHook(() => useIdleRoutePrefetch("SUPERADMIN", () => true));
    await vi.advanceTimersByTimeAsync(2100);
    expect(loadChunkNext).toHaveBeenCalledTimes(1);
  });

  it("no precarga una ruta que canAccess deniega (fail-closed)", async () => {
    renderHook(() => useIdleRoutePrefetch("SUPERADMIN", () => false));
    await vi.advanceTimersByTimeAsync(2100);
    expect(loadChunkNext).not.toHaveBeenCalled();
  });

  it("no dispara dos veces para el mismo rol (rerenders no repiten el prefetch)", async () => {
    const { rerender } = renderHook(
      ({ role }: { role: string }) => useIdleRoutePrefetch(role, () => true),
      { initialProps: { role: "SUPERADMIN" } },
    );
    await vi.advanceTimersByTimeAsync(2100);
    expect(loadChunkNext).toHaveBeenCalledTimes(1);

    rerender({ role: "SUPERADMIN" });
    await vi.advanceTimersByTimeAsync(2100);
    expect(loadChunkNext).toHaveBeenCalledTimes(1);
  });

  it("dispara de nuevo si el rol activo cambia", async () => {
    const { rerender } = renderHook(
      ({ role }: { role: string }) => useIdleRoutePrefetch(role, () => true),
      { initialProps: { role: "SUPERADMIN" } },
    );
    await vi.advanceTimersByTimeAsync(2100);
    expect(loadChunkNext).toHaveBeenCalledTimes(1);
    expect(loadChunkOther).not.toHaveBeenCalled();

    rerender({ role: "ADMIN" });
    await vi.advanceTimersByTimeAsync(2100);
    expect(loadChunkOther).toHaveBeenCalledTimes(1);
  });

  it("un rol sin heurística mapeada no dispara nada (no explota)", async () => {
    renderHook(() => useIdleRoutePrefetch("ROL_INEXISTENTE", () => true));
    await vi.advanceTimersByTimeAsync(2100);
    expect(loadChunkNext).not.toHaveBeenCalled();
    expect(loadChunkOther).not.toHaveBeenCalled();
  });

  it("cancela el timer pendiente al desmontar antes del idle timeout", async () => {
    const { unmount } = renderHook(() => useIdleRoutePrefetch("SUPERADMIN", () => true));
    unmount();
    await vi.advanceTimersByTimeAsync(3000);
    expect(loadChunkNext).not.toHaveBeenCalled();
  });
});
