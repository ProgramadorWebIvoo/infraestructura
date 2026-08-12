/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para usePolling — polling logic, visibility change, overlap guard.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { renderHook } from "@testing-library/react";
import { usePolling } from "@/hooks/usePolling";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("usePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock document.hidden y visibilitychange
    Object.defineProperty(document, "hidden", {
      writable: true,
      value: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Básico: callback se ejecuta cada interval
  // -----------------------------------------------------------------------

  it("ejecuta callback cada interval cuando enabled=true", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);

    renderHook(() => usePolling(callback, 1000, true));

    // Primer tick después de 1000ms (setTimeout(tick, interval))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // Segundo tick después de otros 1000ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callback).toHaveBeenCalledTimes(2);

    // Tercer tick
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it("NO ejecuta callback cuando enabled=false", async () => {
    const callback = vi.fn();

    renderHook(() => usePolling(callback, 1000, false));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("NO ejecuta callback cuando interval <= 0", async () => {
    const callback = vi.fn();

    renderHook(() => usePolling(callback, 0, true));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Overlap guard: no apila requests si el anterior no terminó
  // -----------------------------------------------------------------------

  it("no ejecuta callback en paralelo si el anterior no terminó (overlap guard)", async () => {
    let resolveFirst: () => void;
    const firstPromise = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });

    const callback = vi
      .fn()
      .mockImplementationOnce(() => firstPromise)
      .mockResolvedValue(undefined);

    renderHook(() => usePolling(callback, 1000, true));

    // Primer tick después de 1000ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // Segundo tick antes de que termine el primero (avanza 1000ms pero el primero aún no resuelve)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // No debe llamar de nuevo porque isRunning=true
    expect(callback).toHaveBeenCalledTimes(1);

    // Resolver el primero
    await act(async () => {
      resolveFirst!();
      await Promise.resolve();
    });

    // Tercer tick después de resolver
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  // -----------------------------------------------------------------------
  // Visibility change: pausa en tab oculto
  // -----------------------------------------------------------------------

  it("pausa polling cuando document.hidden=true (tab en background)", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);

    renderHook(() => usePolling(callback, 1000, true));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // Simular tab oculto
    Object.defineProperty(document, "hidden", { value: true });
    document.dispatchEvent(new Event("visibilitychange"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    // No debe haber llamado más veces (el tick salta por hidden)
    expect(callback).toHaveBeenCalledTimes(1);

    // Volver a tab visible
    Object.defineProperty(document, "hidden", { value: false });
    document.dispatchEvent(new Event("visibilitychange"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("ejecuta callback inmediatamente al volver a tab visible (chequeo inmediato)", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);

    renderHook(() => usePolling(callback, 1000, true));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // Ocultar tab
    Object.defineProperty(document, "hidden", { value: true });
    document.dispatchEvent(new Event("visibilitychange"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // Mostrar tab - debe ejecutar tick en el próximo setTimeout (interval)
    Object.defineProperty(document, "hidden", { value: false });
    document.dispatchEvent(new Event("visibilitychange"));

    // El callback NO se ejecuta inmediatamente, solo se reanuda el timer
    await act(async () => {
      await Promise.resolve();
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // Avanzar 1000ms para que dispare el siguiente tick
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("con pauseWhenHidden=false sigue ejecutando el callback aunque document.hidden=true", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);

    renderHook(() => usePolling(callback, 1000, true, false));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // Simular tab oculto — a diferencia del default, NO debe pausar.
    Object.defineProperty(document, "hidden", { value: true });
    document.dispatchEvent(new Event("visibilitychange"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // 3 ticks más mientras "oculto" — regression test del bug real: las
    // notificaciones nativas del navegador (Notification API) exigen que el
    // fetch ocurra MIENTRAS la pestaña sigue oculta, no al volver a mirarla
    // (para entonces ya es tarde, notifyBrowser() exige document.hidden en
    // el momento del disparo). Pausar el polling en background rompía eso.
    expect(callback).toHaveBeenCalledTimes(4);
  });

  // -----------------------------------------------------------------------
  // Cleanup: clearTimeout y removeEventListener al desmontar
  // -----------------------------------------------------------------------

  it("limpia timer y event listener al desmontar", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = renderHook(() => usePolling(callback, 1000, true));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });

  // -----------------------------------------------------------------------
  // Reactividad a cambios de interval y enabled
  // -----------------------------------------------------------------------

  it("reinicia timer cuando cambia interval", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);

    const { rerender } = renderHook(
      ({ interval }) => usePolling(callback, interval, true),
      { initialProps: { interval: 1000 } }
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // Cambiar interval
    rerender({ interval: 500 });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("detiene polling cuando enabled cambia a false", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);

    const { rerender } = renderHook(
      ({ enabled }) => usePolling(callback, 1000, enabled),
      { initialProps: { enabled: true } }
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callback).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(callback).toHaveBeenCalledTimes(1); // No más llamadas
  });

  it("reanuda polling cuando enabled cambia a true", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);

    const { rerender } = renderHook(
      ({ enabled }) => usePolling(callback, 1000, enabled),
      { initialProps: { enabled: false } }
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(callback).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // Actualización de callback (useRef interno)
  // -----------------------------------------------------------------------

  it("usa la versión más reciente del callback (ref)", async () => {
    const callbackV1 = vi.fn().mockResolvedValue(undefined);
    const callbackV2 = vi.fn().mockResolvedValue(undefined);

    const { rerender } = renderHook(
      ({ cb }) => usePolling(cb, 1000, true),
      { initialProps: { cb: callbackV1 } }
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callbackV1).toHaveBeenCalledTimes(1);

    // Cambiar callback
    rerender({ cb: callbackV2 });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(callbackV2).toHaveBeenCalledTimes(1);
    expect(callbackV1).toHaveBeenCalledTimes(1); // No llamado de nuevo
  });
});
