import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuthedImageCache } from "@/hooks/useAuthedImageCache";
import { apiDownload } from "@/services/api";

vi.mock("@/services/api", () => ({ apiDownload: vi.fn() }));

describe("useAuthedImageCache", () => {
  beforeEach(() => {
    vi.mocked(apiDownload).mockReset();
    vi.mocked(apiDownload).mockResolvedValue(new Blob(["x"]));
    URL.createObjectURL = vi.fn(() => `blob:${Math.random()}`);
    URL.revokeObjectURL = vi.fn();
  });

  it("descarga una vez y reutiliza el caché en pedidos posteriores", async () => {
    const { result } = renderHook(() => useAuthedImageCache("tok"));
    const first = await result.current("supplier-proposal-images/a.png");
    const second = await result.current("supplier-proposal-images/a.png");
    expect(second).toBe(first);
    expect(apiDownload).toHaveBeenCalledTimes(1);
    expect(apiDownload).toHaveBeenCalledWith("/supplier-proposal-images/a.png", { token: "tok" });
  });

  it("comparte la descarga en curso entre pedidos simultáneos", async () => {
    const { result } = renderHook(() => useAuthedImageCache("tok"));
    const [a, b] = await Promise.all([result.current("a.png"), result.current("a.png")]);
    expect(a).toBe(b);
    expect(apiDownload).toHaveBeenCalledTimes(1);
  });

  it("limita las descargas simultáneas", async () => {
    let active = 0;
    let peak = 0;
    vi.mocked(apiDownload).mockImplementation(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return new Blob(["x"]);
    });
    const { result } = renderHook(() => useAuthedImageCache("tok", 3));
    await Promise.all(Array.from({ length: 10 }, (_, i) => result.current(`img-${i}.png`)));
    expect(peak).toBe(3);
  });

  it("no descarga si la fila ya fue cancelada antes de iniciar", async () => {
    const { result } = renderHook(() => useAuthedImageCache("tok", 1));
    const blocker = result.current("first.png");
    await expect(result.current("second.png", () => true)).rejects.toThrow("cancelled");
    await blocker;
    expect(apiDownload).toHaveBeenCalledTimes(1);
  });

  it("libera los object URLs al desmontar", async () => {
    const { result, unmount } = renderHook(() => useAuthedImageCache("tok"));
    const url = await result.current("a.png");
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
  });
});
