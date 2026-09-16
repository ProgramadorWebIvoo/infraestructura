import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { useMarketingProjects } from "@/hooks/useMarketingProjects";

describe("useMarketingProjects", () => {
  const showToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches /marketing-projects when enabled=true (default, acceso a Marketing)", async () => {
    const { result } = renderHook(() => useMarketingProjects("token", showToast));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiFetch).toHaveBeenCalledWith("/marketing-projects", { token: "token" });
  });

  it("does not fetch and resolves isLoading=false when enabled=false (sin acceso a Marketing)", async () => {
    const { result } = renderHook(() => useMarketingProjects("token", showToast, false));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(result.current.projects).toEqual([]);
  });
});
