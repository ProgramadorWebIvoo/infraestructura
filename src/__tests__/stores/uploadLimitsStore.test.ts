import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const apiFetch = vi.fn();
vi.mock("@/services/api", () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));
vi.mock("@/services/logger", () => ({ logError: vi.fn() }));

import { useUploadLimitsStore } from "@/stores/uploadLimitsStore";

const LIMITS = { postMaxBytes: 40 * 1024 * 1024, uploadMaxBytes: 40 * 1024 * 1024, maxFileUploads: 20, maxFileBytes: 25 * 1024 * 1024, maxFileCount: 10 };

describe("uploadLimitsStore", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    useUploadLimitsStore.setState({ limits: null, isLoading: false, retryAt: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("pide los límites una sola vez por sesión", async () => {
    apiFetch.mockResolvedValue(LIMITS);

    await useUploadLimitsStore.getState().load();
    await useUploadLimitsStore.getState().load();

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith("/public/upload-limits");
    expect(useUploadLimitsStore.getState().limits).toEqual(LIMITS);
  });

  it("no lanza peticiones paralelas mientras una está en curso", async () => {
    let resolve!: (value: unknown) => void;
    apiFetch.mockReturnValue(new Promise(r => { resolve = r; }));

    const first = useUploadLimitsStore.getState().load();
    await useUploadLimitsStore.getState().load();
    resolve(LIMITS);
    await first;

    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it("si falla, espera un minuto antes de reintentar (cupo público de 10/min)", async () => {
    vi.useFakeTimers();
    apiFetch.mockRejectedValueOnce(new Error("429")).mockResolvedValueOnce(LIMITS);

    await useUploadLimitsStore.getState().load();
    expect(useUploadLimitsStore.getState().limits).toBeNull();

    await useUploadLimitsStore.getState().load();
    expect(apiFetch).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(61_000);
    await useUploadLimitsStore.getState().load();

    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(useUploadLimitsStore.getState().limits).toEqual(LIMITS);
  });
});
