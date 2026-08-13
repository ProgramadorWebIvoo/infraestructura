import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDraftState } from "@/hooks/useDraftState";

describe("useDraftState", () => {
  it("valueOf devuelve el valor guardado hasta que se togglea", () => {
    const { result } = renderHook(() =>
      useDraftState<string, string>({
        savedValueOf: () => "original",
        isDirty: (draft, saved) => draft !== saved,
        save: vi.fn(),
      }),
    );

    expect(result.current.valueOf("k")).toBe("original");

    act(() => result.current.onChange("k", "nuevo"));

    expect(result.current.valueOf("k")).toBe("nuevo");
  });

  it("onChange no marca dirty si el nuevo valor es igual al guardado", () => {
    const { result } = renderHook(() =>
      useDraftState<string, string>({
        savedValueOf: () => "x",
        isDirty: (draft, saved) => draft !== saved,
        save: vi.fn(),
      }),
    );

    act(() => result.current.onChange("k", "x"));

    expect(result.current.dirtyKeys).toEqual([]);
    expect(result.current.isDirty("k")).toBe(false);
  });

  it("dirtyKeys incluye solo las claves realmente modificadas", () => {
    const { result } = renderHook(() =>
      useDraftState<string, string>({
        savedValueOf: key => (key === "a" ? "1" : "2"),
        isDirty: (draft, saved) => draft !== saved,
        save: vi.fn(),
      }),
    );

    act(() => {
      result.current.onChange("a", "1"); // igual al guardado — no dirty
      result.current.onChange("b", "99"); // distinto — dirty
    });

    expect(result.current.dirtyKeys).toEqual(["b"]);
  });

  it("persist llama a save() por cada clave dirty y limpia el draft de las exitosas", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDraftState<string, string>({
        savedValueOf: () => "orig",
        isDirty: (draft, saved) => draft !== saved,
        save,
      }),
    );

    act(() => result.current.onChange("k", "nuevo"));

    await act(async () => {
      await result.current.persist();
    });

    expect(save).toHaveBeenCalledWith("k", "nuevo");
    expect(result.current.dirtyKeys).toEqual([]);
  });

  it("un error en una clave no aborta el resto — queda en errors y el draft la conserva", async () => {
    const save = vi.fn().mockImplementation((key: string) => {
      if (key === "bad") return Promise.reject(new Error("Valor inválido"));
      return Promise.resolve();
    });
    const { result } = renderHook(() =>
      useDraftState<string, string>({
        savedValueOf: () => "orig",
        isDirty: (draft, saved) => draft !== saved,
        save,
      }),
    );

    act(() => {
      result.current.onChange("good", "1");
      result.current.onChange("bad", "2");
    });

    let outcome: { failedKeys: string[] } | undefined;
    await act(async () => {
      outcome = await result.current.persist();
    });

    expect(outcome?.failedKeys).toEqual(["bad"]);
    expect(result.current.dirtyKeys).toEqual(["bad"]);
    expect(result.current.errors.bad).toBe("Valor inválido");
    expect(result.current.errors.good).toBeUndefined();
  });

  it("discard vacía el draft y los errores", () => {
    const { result } = renderHook(() =>
      useDraftState<string, string>({
        savedValueOf: () => "orig",
        isDirty: (draft, saved) => draft !== saved,
        save: vi.fn(),
      }),
    );

    act(() => result.current.onChange("k", "nuevo"));
    expect(result.current.dirtyKeys).toEqual(["k"]);

    act(() => result.current.discard());

    expect(result.current.dirtyKeys).toEqual([]);
    expect(result.current.valueOf("k")).toBe("orig");
  });

  it("con numericKeys:true, las claves se coercionan a number (no quedan como string)", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDraftState<number, string>({
        numericKeys: true,
        savedValueOf: () => "orig",
        isDirty: (draft, saved) => draft !== saved,
        save,
      }),
    );

    act(() => result.current.onChange(1, "nuevo"));

    expect(result.current.dirtyKeys).toEqual([1]);
    expect(typeof result.current.dirtyKeys[0]).toBe("number");

    await act(async () => {
      await result.current.persist();
    });

    // Regresión: sin la coerción, save() se llamaba con "1" (string) en vez
    // de 1 (number) — Object.keys() de JS siempre devuelve string[].
    expect(save).toHaveBeenCalledWith(1, "nuevo");
    expect(save).not.toHaveBeenCalledWith("1", "nuevo");
  });

  it("isDirty recibe la clave — permite que el criterio de dirty dependa de metadata asociada a ella", () => {
    const isDirty = vi.fn((draft: string, saved: string) => draft !== saved);
    const { result } = renderHook(() =>
      useDraftState<string, string>({
        savedValueOf: () => "orig",
        isDirty,
        save: vi.fn(),
      }),
    );

    act(() => result.current.onChange("k", "nuevo"));

    expect(isDirty).toHaveBeenCalledWith("nuevo", "orig", "k");
  });

  it("persist acepta un subconjunto explícito de claves en vez de todas las dirty", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDraftState<string, string>({
        savedValueOf: () => "orig",
        isDirty: (draft, saved) => draft !== saved,
        save,
      }),
    );

    act(() => {
      result.current.onChange("a", "1");
      result.current.onChange("b", "2");
    });

    await act(async () => {
      await result.current.persist(["a"]);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("a", "1");
    await waitFor(() => expect(result.current.dirtyKeys).toEqual(["b"]));
  });
});
