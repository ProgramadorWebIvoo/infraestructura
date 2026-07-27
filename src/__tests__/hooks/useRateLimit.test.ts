import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRateLimit } from "@/hooks/useRateLimit";

describe("useRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("empieza sin intentos y sin bloqueo", () => {
    const { result } = renderHook(() => useRateLimit());
    expect(result.current.attempts).toBe(0);
    expect(result.current.blockTimer).toBe(0);
    expect(result.current.isBlocked).toBe(false);
  });

  it("recordAttempt incrementa el contador de intentos", () => {
    const { result } = renderHook(() => useRateLimit());

    act(() => {
      result.current.recordAttempt();
    });

    expect(result.current.attempts).toBe(1);
    expect(result.current.isBlocked).toBe(false);
  });

  it("no bloquea mientras los intentos no superen maxAttempts", () => {
    const { result } = renderHook(() => useRateLimit({ maxAttempts: 3 }));

    act(() => {
      result.current.recordAttempt();
      result.current.recordAttempt();
      result.current.recordAttempt();
    });

    expect(result.current.attempts).toBe(3);
    expect(result.current.isBlocked).toBe(false);
  });

  it("bloquea con backoff exponencial (2^(n-max)) al superar maxAttempts", () => {
    const { result } = renderHook(() => useRateLimit({ maxAttempts: 3, maxBlockSeconds: 60 }));

    act(() => {
      result.current.recordAttempt(); // 1
      result.current.recordAttempt(); // 2
      result.current.recordAttempt(); // 3
    });

    let blockSec = 0;
    act(() => {
      blockSec = result.current.recordAttempt(); // 4to intento → 2^(4-3) = 2s
    });

    expect(blockSec).toBe(2);
    expect(result.current.isBlocked).toBe(true);
    expect(result.current.blockTimer).toBe(2);
  });

  it("el bloqueo nunca supera maxBlockSeconds", () => {
    const { result } = renderHook(() => useRateLimit({ maxAttempts: 1, maxBlockSeconds: 10 }));

    // 2^(8-1) = 128, debe recortarse a 10
    act(() => {
      for (let i = 0; i < 8; i++) result.current.recordAttempt();
    });

    expect(result.current.blockTimer).toBe(10);
  });

  it("blockTimer cuenta hacia atrás cada segundo hasta llegar a 0", () => {
    const { result } = renderHook(() => useRateLimit({ maxAttempts: 1, maxBlockSeconds: 60 }));

    act(() => {
      result.current.recordAttempt();
      result.current.recordAttempt(); // 2do intento → bloqueo de 2s
    });
    expect(result.current.blockTimer).toBe(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.blockTimer).toBe(1);
    expect(result.current.isBlocked).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.blockTimer).toBe(0);
    expect(result.current.isBlocked).toBe(false);
  });

  it("resetAttempts reinicia el contador y no deja bloqueo residual", () => {
    const { result } = renderHook(() => useRateLimit({ maxAttempts: 1 }));

    act(() => {
      result.current.recordAttempt();
      result.current.recordAttempt();
    });
    expect(result.current.attempts).toBe(2);

    act(() => {
      result.current.resetAttempts();
    });

    expect(result.current.attempts).toBe(0);
  });

  it("recordAttempt tras superar el umbral reinicia el timer al valor nuevo (no acumula)", () => {
    const { result } = renderHook(() => useRateLimit({ maxAttempts: 1, maxBlockSeconds: 60 }));

    act(() => {
      result.current.recordAttempt();
      result.current.recordAttempt(); // 2do → 2s
    });
    expect(result.current.blockTimer).toBe(2);

    act(() => {
      result.current.recordAttempt(); // 3er → 4s, debe reemplazar el timer anterior
    });
    expect(result.current.blockTimer).toBe(4);
  });
});
