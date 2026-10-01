import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { useDebugStore, defaultCategory } from "@/stores/debugStore";
import { appendToRing, MAX_DEBUG_ENTRIES } from "@/stores/debugRingBuffer";
import { installGlobalErrorCapture, installConsoleCapture, installStateCapture } from "@/stores/debugCapture";

const entries = () => useDebugStore.getState().entries;

beforeEach(() => {
  useDebugStore.setState({ enabled: true, paused: false, entries: [], dropped: 0 });
});

describe("appendToRing", () => {
  it("descarta los más antiguos al superar el máximo y reporta cuántos", () => {
    const full = Array.from({ length: 3 }, (_, i) => i);
    expect(appendToRing(full, 3, 3)).toEqual({ entries: [1, 2, 3], dropped: 1 });
    expect(appendToRing([1], 2, 3)).toEqual({ entries: [1, 2], dropped: 0 });
  });

  it("el máximo por defecto es 300", () => {
    expect(MAX_DEBUG_ENTRIES).toBe(300);
  });
});

describe("debugStore — ring buffer y categorías", () => {
  it("mantiene 300 entradas y acumula el contador de descartados", () => {
    for (let i = 0; i < 305; i++) useDebugStore.getState().push({ kind: "log", label: `e${i}` });
    expect(entries()).toHaveLength(300);
    expect(entries()[0].label).toBe("e5");
    expect(useDebugStore.getState().dropped).toBe(5);

    useDebugStore.getState().clear();
    expect(useDebugStore.getState().dropped).toBe(0);
  });

  it("deriva la categoría del kind en un solo lugar y respeta la explícita", () => {
    expect(defaultCategory("http")).toBe("NETWORK");
    expect(defaultCategory("websocket")).toBe("NETWORK");
    expect(defaultCategory("log")).toBe("SYSTEM");
    expect(defaultCategory("error")).toBe("SYSTEM");

    useDebugStore.getState().push({ kind: "http", label: "a" });
    useDebugStore.getState().push({ kind: "log", label: "b", category: "STATE" });
    expect(entries().map(e => e.category)).toEqual(["NETWORK", "STATE"]);
  });
});

describe("captura global — nivel fatal", () => {
  it("un error no atrapado se registra como fatal", () => {
    const dispose = installGlobalErrorCapture();
    window.dispatchEvent(new ErrorEvent("error", { message: "boom" }));
    dispose();
    expect(entries()[0]).toMatchObject({ level: "fatal", kind: "error", category: "SYSTEM" });
  });
});

describe("captura de console.error / console.warn", () => {
  let originalError: typeof console.error;
  let originalWarn: typeof console.warn;
  let errorSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalError = console.error;
    originalWarn = console.warn;
    errorSpy = vi.fn();
    console.error = errorSpy as unknown as typeof console.error;
    console.warn = vi.fn() as unknown as typeof console.warn;
  });
  afterEach(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });

  it("registra console.error/warn, sigue llamando al original y restaura al desinstalar", () => {
    const base = console.error;
    const dispose = installConsoleCapture();
    expect(console.error).not.toBe(base);

    console.error("algo falló", { password: "hunter2" });
    console.warn("cuidado");
    expect(errorSpy).toHaveBeenCalledWith("algo falló", { password: "hunter2" });
    expect(entries().map(e => [e.level, e.label])).toEqual([
      ["error", "console.error: algo falló"],
      ["warn", "console.warn: cuidado"],
    ]);
    expect(JSON.stringify(entries())).not.toContain("hunter2");

    dispose();
    expect(console.error).toBe(base);
  });

  it("omite los logs de logger.ts (prefijo [IVOO], también con %c) para no duplicar", () => {
    const dispose = installConsoleCapture();
    console.error("[IVOO] ctx:", "msg");
    console.error("%c[IVOO]", "color:red", "msg");
    dispose();
    expect(entries()).toHaveLength(0);
  });

  it("no entra en bucle si el push vuelve a llamar a console.error (reentrancia)", () => {
    const dispose = installConsoleCapture();
    const unsubscribe = useDebugStore.subscribe(() => console.error("render warning"));
    console.error("primero");
    unsubscribe();
    dispose();
    expect(entries()).toHaveLength(1);
  });

  it("si otra herramienta parchea encima, no pisa su parche y queda inerte", () => {
    const dispose = installConsoleCapture();
    const other = vi.fn();
    console.error = other as unknown as typeof console.error;
    dispose();
    expect(console.error).toBe(other);
    console.error("x");
    expect(entries()).toHaveLength(0);
  });
});

describe("captura de estado de TanStack Query (STATE)", () => {
  it("registra errores de queries y mutaciones, no los éxitos de queries", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const dispose = installStateCapture(queryClient);

    await queryClient.fetchQuery({ queryKey: ["ok"], queryFn: async () => 1 });
    await queryClient.fetchQuery({ queryKey: ["bad"], queryFn: async () => { throw new Error("fallo"); } }).catch(() => undefined);
    await queryClient.getMutationCache().build(queryClient, { mutationFn: async (v: number) => v, mutationKey: ["save"] }).execute(7);

    dispose();
    const labels = entries().map(e => e.label);
    expect(labels).toContain('Query error: ["bad"]');
    expect(labels).toContain('Mutation ok: ["save"]');
    expect(labels.some(l => l.includes('["ok"]'))).toBe(false);
    expect(entries().every(e => e.category === "STATE")).toBe(true);
  });
});
