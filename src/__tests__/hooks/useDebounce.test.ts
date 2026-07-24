import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "../../hooks/useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("does not update before the delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "hello" } },
    );
    rerender({ value: "world" });
    // Still the old value
    expect(result.current).toBe("hello");
  });

  it("updates after the delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "hello" } },
    );
    rerender({ value: "world" });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("world");
  });

  it("cancels previous timer on rapid changes", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } },
    );

    // Rapid changes: each new value resets the timer
    rerender({ value: "b" });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: "c" });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: "d" });
    // Advance by the full delay to fire the timer for "d"
    act(() => { vi.advanceTimersByTime(300); });

    // Should be "d", not "b" or "c"
    expect(result.current).toBe("d");
  });

  it("uses default delay of 300ms when not specified", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: "first" } },
    );
    rerender({ value: "second" });

    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe("first");

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe("second");
  });

  it("works with numeric values", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: 0 } },
    );
    rerender({ value: 42 });

    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe(42);
  });

  it("works with object values (by reference)", () => {
    const obj1 = { x: 1 };
    const obj2 = { x: 2 };
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: obj1 } },
    );
    rerender({ value: obj2 });

    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe(obj2);
  });
});
