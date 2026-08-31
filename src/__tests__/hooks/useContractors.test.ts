import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Contractor } from "../../types";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockUsePolledFetch = vi.fn();
vi.mock("@/hooks/usePolledFetch", () => ({
  usePolledFetch: (...args: unknown[]) => mockUsePolledFetch(...args),
}));

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { useContractors } from "../../hooks/useContractors";

// ── Helpers ──────────────────────────────────────────────────────────────────
function createMockContractor(overrides: Partial<Contractor> = {}): Contractor {
  return {
    code: "CON-001",
    name: "Test Contractor",
    rif: "J-00100001-1",
    specialty: "General",
    rating: 4.0,
    email: "test@test.com",
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("useContractors", () => {
  const showToast = vi.fn();
  const mockSetData = vi.fn();
  const mockRefresh = vi.fn();

  const defaultPolledFetchReturn = {
    data: [],
    setData: mockSetData,
    isLoading: true,
    refresh: mockRefresh,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePolledFetch.mockReturnValue(defaultPolledFetchReturn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes correct options to usePolledFetch", () => {
    renderHook(() => useContractors("token", showToast));

    expect(mockUsePolledFetch).toHaveBeenCalledWith({
      authToken: "token",
      showToast,
      fetcher: expect.any(Function),
      getSignature: expect.any(Function),
      errorMessage: expect.any(String),
    });
  });

  it("returns data, loading state, and handlers", () => {
    const { result } = renderHook(() => useContractors("token", showToast));

    expect(result.current.contractors).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(typeof result.current.loadContractors).toBe("function");
    expect(typeof result.current.handleAddContractor).toBe("function");
    expect(typeof result.current.handleUpdateContractorRating).toBe("function");
    expect(typeof result.current.resetContractors).toBe("function");
  });

  describe("handleAddContractor", () => {
    it("adds new contractor and replaces if same code exists", () => {
      const existing = [createMockContractor({ code: "CON-001", name: "Old" })];
      mockUsePolledFetch.mockReturnValue({
        ...defaultPolledFetchReturn,
        data: existing,
        setData: mockSetData,
      });

      const { result } = renderHook(() => useContractors("token", showToast));

      const newContractor = createMockContractor({ code: "CON-001", name: "Updated" });
      act(() => {
        result.current.handleAddContractor(newContractor);
      });

      expect(mockSetData).toHaveBeenCalledWith(expect.any(Function));
      // Call the updater function to verify it replaces correctly
      const updater = mockSetData.mock.calls[0][0];
      const next = updater(existing);
      expect(next).toEqual([newContractor]);
    });

    it("appends new contractor if code is different", () => {
      const existing = [createMockContractor({ code: "CON-001" })];
      mockUsePolledFetch.mockReturnValue({
        ...defaultPolledFetchReturn,
        data: existing,
        setData: mockSetData,
      });

      const { result } = renderHook(() => useContractors("token", showToast));

      const newContractor = createMockContractor({ code: "CON-002" });
      act(() => {
        result.current.handleAddContractor(newContractor);
      });

      const updater = mockSetData.mock.calls[0][0];
      const next = updater(existing);
      expect(next).toEqual([...existing, newContractor]);
    });
  });

  describe("handleUpdateContractorRating", () => {
    it("POSTs to /contractors/{code}/rating and updates local state", async () => {
      const existing = [createMockContractor({ code: "CON-001", rating: 4.0 })];
      mockUsePolledFetch.mockReturnValue({
        ...defaultPolledFetchReturn,
        data: existing,
        setData: mockSetData,
      });
      mockApiFetch.mockResolvedValue(undefined);

      const { result } = renderHook(() => useContractors("token", showToast));

      await act(async () => {
        await result.current.handleUpdateContractorRating("CON-001", 4.5);
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/contractors/CON-001/rating", {
        method: "POST",
        body: JSON.stringify({ rating: 4.5 }),
      });

      const updater = mockSetData.mock.calls[0][0];
      const next = updater(existing);
      expect(next[0].rating).toBe(4.5);
    });
  });

  describe("resetContractors", () => {
    it("sets contractors to empty array", () => {
      mockUsePolledFetch.mockReturnValue({
        ...defaultPolledFetchReturn,
        data: [createMockContractor()],
        setData: mockSetData,
      });

      const { result } = renderHook(() => useContractors("token", showToast));

      act(() => {
        result.current.resetContractors();
      });

      expect(mockSetData).toHaveBeenCalledWith([]);
    });
  });

  describe("fetcher", () => {
    it("calls apiFetch with correct URL", async () => {
      mockUsePolledFetch.mockImplementation(({ fetcher }) => {
        // Call the fetcher to verify it hits the right endpoint
        fetcher();
        return defaultPolledFetchReturn;
      });

      renderHook(() => useContractors("token", showToast));

      expect(mockApiFetch).toHaveBeenCalledWith("/contractors");
    });
  });

  describe("getSignature", () => {
    it("produces unique signature from contractor data", () => {
      mockUsePolledFetch.mockImplementation(({ getSignature }) => {
        const sig1 = getSignature([
          createMockContractor({ code: "CON-001", name: "A", rating: 4.0 }),
          createMockContractor({ code: "CON-002", name: "B", rating: 3.5 }),
        ]);
        const sig2 = getSignature([
          createMockContractor({ code: "CON-001", name: "A", rating: 4.0 }),
          createMockContractor({ code: "CON-002", name: "B", rating: 3.5 }),
        ]);
        // Same data -> same signature
        expect(sig1).toBe(sig2);

        const sig3 = getSignature([
          createMockContractor({ code: "CON-001", name: "A", rating: 4.5 }), // changed rating
          createMockContractor({ code: "CON-002", name: "B", rating: 3.5 }),
        ]);
        // Different data -> different signature
        expect(sig1).not.toBe(sig3);

        return defaultPolledFetchReturn;
      });

      renderHook(() => useContractors("token", showToast));
    });
  });
});
