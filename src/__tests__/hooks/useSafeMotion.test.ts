import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("motion/react", () => ({
  useReducedMotion: vi.fn(),
}));

import { useReducedMotion } from "motion/react";
import { useSafeMotion } from "../../hooks/useSafeMotion";

describe("useSafeMotion", () => {
  it("returns full animations when prefersReducedMotion is false", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);

    const { result } = renderHook(() => useSafeMotion());

    expect(result.current.prefersReduced).toBe(false);
    expect(result.current.motionProps).toEqual({
      initial: { opacity: 0, y: 10 },
      enter: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 },
      transition: { duration: 0.22, ease: "easeOut" },
    });
    expect(result.current.containerVariants).not.toEqual({
      hidden: { opacity: 1 },
      visible: { opacity: 1 },
    });
    expect(result.current.itemVariants).not.toEqual({
      hidden: { opacity: 1 },
      visible: { opacity: 1 },
    });
  });

  it("returns reduced animations when prefersReducedMotion is true", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);

    const { result } = renderHook(() => useSafeMotion());

    expect(result.current.prefersReduced).toBe(true);
    expect(result.current.motionProps).toEqual({
      initial: { opacity: 1 },
      enter: { opacity: 1 },
      exit: { opacity: 1 },
      transition: { duration: 0 },
    });
    expect(result.current.containerVariants).toEqual({
      hidden: { opacity: 1 },
      visible: { opacity: 1 },
    });
    expect(result.current.itemVariants).toEqual({
      hidden: { opacity: 1 },
      visible: { opacity: 1 },
    });
  });

  it("uses custom options when provided (full motion)", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);

    const { result } = renderHook(() =>
      useSafeMotion({
        initial: { opacity: 0, scale: 0.9 },
        enter: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.9 },
        transition: { duration: 0.3 },
      }),
    );

    expect(result.current.motionProps).toEqual({
      initial: { opacity: 0, scale: 0.9 },
      enter: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
      transition: { duration: 0.3 },
    });
  });

  it("ignores custom options when prefersReducedMotion is true", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);

    const { result } = renderHook(() =>
      useSafeMotion({
        initial: { opacity: 0, y: 20 },
        enter: { opacity: 1, y: 0 },
      }),
    );

    expect(result.current.motionProps).toEqual({
      initial: { opacity: 1 },
      enter: { opacity: 1 },
      exit: { opacity: 1 },
      transition: { duration: 0 },
    });
  });

  it("exposes prefersReduced as a boolean", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    const { result: r1 } = renderHook(() => useSafeMotion());
    expect(r1.current.prefersReduced).toBe(true);

    vi.mocked(useReducedMotion).mockReturnValue(false);
    const { result: r2 } = renderHook(() => useSafeMotion());
    expect(r2.current.prefersReduced).toBe(false);
  });

  it("containerVariants has staggerChildren when full motion", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);

    const { result } = renderHook(() => useSafeMotion());;
    const variants = result.current.containerVariants;
    expect(variants.visible).toHaveProperty("transition");
    expect((variants.visible as { transition: Record<string, unknown> }).transition.when).toBe("beforeChildren");
    expect((variants.visible as { transition: Record<string, unknown> }).transition.staggerChildren).toBe(0.04);
  });
});
