/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ROUTE_PREFETCH mockeado: los tests de este hook verifican CUÁNDO se llama
// loadChunk/prefetchData, no el registro real (que apunta a vistas pesadas
// de verdad — importarlas de verdad en cada test sería lento y frágil).
// vi.hoisted: vi.mock() se hoistea al tope del archivo, así que las
// variables que su factory referencia deben crearse también hoisteadas.
const { loadChunkA, prefetchDataA } = vi.hoisted(() => ({
  loadChunkA: vi.fn(() => Promise.resolve({ default: () => null })),
  prefetchDataA: vi.fn(),
}));

vi.mock("@/routes/prefetchRegistry", () => ({
  ROUTE_PREFETCH: {
    "/a": { loadChunk: loadChunkA, prefetchData: prefetchDataA },
    "/b": { loadChunk: vi.fn(() => Promise.resolve({ default: () => null })) },
  },
}));

import { usePrefetchOnIntent, __resetPrefetchStateForTests } from "@/hooks/usePrefetchOnIntent";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("usePrefetchOnIntent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetPrefetchStateForTests();
    loadChunkA.mockClear();
    prefetchDataA.mockClear();
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no dispara nada antes de que venza el debounce", () => {
    const { result } = renderHook(() => usePrefetchOnIntent("/a", "authenticated"), { wrapper });
    act(() => result.current.onMouseEnter());
    act(() => vi.advanceTimersByTime(100));
    expect(loadChunkA).not.toHaveBeenCalled();
  });

  it("precarga chunk + datos tras el debounce en hover sostenido", async () => {
    const { result } = renderHook(() => usePrefetchOnIntent("/a", "authenticated"), { wrapper });
    act(() => result.current.onMouseEnter());
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(loadChunkA).toHaveBeenCalledTimes(1);
    expect(prefetchDataA).toHaveBeenCalledTimes(1);
  });

  it("onMouseLeave cancela el debounce — un hover fugaz no precarga nada", () => {
    const { result } = renderHook(() => usePrefetchOnIntent("/a", "authenticated"), { wrapper });
    act(() => result.current.onMouseEnter());
    act(() => vi.advanceTimersByTime(100));
    act(() => result.current.onMouseLeave());
    act(() => vi.advanceTimersByTime(200));
    expect(loadChunkA).not.toHaveBeenCalled();
  });

  it("onFocus/onBlur se comportan igual que onMouseEnter/onMouseLeave", async () => {
    const { result } = renderHook(() => usePrefetchOnIntent("/a", "authenticated"), { wrapper });
    act(() => result.current.onFocus());
    act(() => result.current.onBlur());
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(loadChunkA).not.toHaveBeenCalled();
  });

  it("no precarga sin authToken (usuario no autenticado)", async () => {
    const { result } = renderHook(() => usePrefetchOnIntent("/a", ""), { wrapper });
    act(() => result.current.onMouseEnter());
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(loadChunkA).not.toHaveBeenCalled();
  });

  it("no precarga rutas fuera del registro (path desconocido)", async () => {
    const { result } = renderHook(() => usePrefetchOnIntent("/nope", "authenticated"), { wrapper });
    act(() => result.current.onMouseEnter());
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    // No debe explotar ni llamar nada — simplemente no hay entry.
    expect(loadChunkA).not.toHaveBeenCalled();
  });

  it("no repite la descarga del mismo chunk en hovers sucesivos (warmedChunks)", async () => {
    const { result } = renderHook(() => usePrefetchOnIntent("/a", "authenticated"), { wrapper });
    act(() => result.current.onMouseEnter());
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(loadChunkA).toHaveBeenCalledTimes(1);

    act(() => result.current.onMouseEnter());
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(loadChunkA).toHaveBeenCalledTimes(1); // sigue en 1, no 2

    // El prefetch de DATOS sí se repite — React Query decide si hace un GET
    // real según staleTime, esto no es responsabilidad del hook.
    expect(prefetchDataA).toHaveBeenCalledTimes(2);
  });

  it("no precarga si la pestaña está oculta (document.hidden)", async () => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    const { result } = renderHook(() => usePrefetchOnIntent("/a", "authenticated"), { wrapper });
    act(() => result.current.onMouseEnter());
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(loadChunkA).not.toHaveBeenCalled();
  });

  it("no precarga en modo ahorro de datos (saveData)", async () => {
    Object.defineProperty(navigator, "connection", {
      value: { saveData: true, effectiveType: "4g" },
      configurable: true,
    });
    const { result } = renderHook(() => usePrefetchOnIntent("/a", "authenticated"), { wrapper });
    act(() => result.current.onMouseEnter());
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(loadChunkA).not.toHaveBeenCalled();
    // @ts-expect-error -- limpieza del mock de navigator.connection
    delete navigator.connection;
  });

  it("no precarga en conexión 2G/slow-2g", async () => {
    Object.defineProperty(navigator, "connection", {
      value: { saveData: false, effectiveType: "2g" },
      configurable: true,
    });
    const { result } = renderHook(() => usePrefetchOnIntent("/a", "authenticated"), { wrapper });
    act(() => result.current.onMouseEnter());
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(loadChunkA).not.toHaveBeenCalled();
    // @ts-expect-error -- limpieza del mock de navigator.connection
    delete navigator.connection;
  });

  it("cancela el timer pendiente al desmontar (no dispara después)", async () => {
    const { result, unmount } = renderHook(() => usePrefetchOnIntent("/a", "authenticated"), { wrapper });
    act(() => result.current.onMouseEnter());
    act(() => vi.advanceTimersByTime(100));
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(loadChunkA).not.toHaveBeenCalled();
  });

  it("respeta el semáforo: no más de 2 descargas de chunk simultáneas", async () => {
    let resolveA: (() => void) | undefined;
    let resolveB: (() => void) | undefined;
    let resolveC: (() => void) | undefined;
    const slowLoadA = vi.fn(() => new Promise((r) => { resolveA = () => r({ default: () => null }); }));
    const slowLoadB = vi.fn(() => new Promise((r) => { resolveB = () => r({ default: () => null }); }));
    const slowLoadC = vi.fn(() => new Promise((r) => { resolveC = () => r({ default: () => null }); }));

    const registry = await import("@/routes/prefetchRegistry");
    // @ts-expect-error -- mutamos el mock del módulo para este caso puntual
    registry.ROUTE_PREFETCH["/slow-a"] = { loadChunk: slowLoadA };
    // @ts-expect-error
    registry.ROUTE_PREFETCH["/slow-b"] = { loadChunk: slowLoadB };
    // @ts-expect-error
    registry.ROUTE_PREFETCH["/slow-c"] = { loadChunk: slowLoadC };

    const hookA = renderHook(() => usePrefetchOnIntent("/slow-a", "authenticated"), { wrapper });
    const hookB = renderHook(() => usePrefetchOnIntent("/slow-b", "authenticated"), { wrapper });
    const hookC = renderHook(() => usePrefetchOnIntent("/slow-c", "authenticated"), { wrapper });

    act(() => hookA.result.current.onMouseEnter());
    act(() => hookB.result.current.onMouseEnter());
    act(() => hookC.result.current.onMouseEnter());
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });

    expect(slowLoadA).toHaveBeenCalledTimes(1);
    expect(slowLoadB).toHaveBeenCalledTimes(1);
    // La tercera queda bloqueada por el semáforo (máx. 2 en vuelo).
    expect(slowLoadC).not.toHaveBeenCalled();

    resolveA?.();
    resolveB?.();
    await act(async () => { await Promise.resolve(); });

    // Liberado un slot, un nuevo hover sobre /slow-c ahora sí dispara.
    act(() => hookC.result.current.onMouseEnter());
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(slowLoadC).toHaveBeenCalledTimes(1);
    resolveC?.();
  });
});
