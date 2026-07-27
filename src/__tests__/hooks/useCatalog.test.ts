import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { CatalogItem } from "../../hooks/useCatalog";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockUsePolledFetch = vi.fn();
vi.mock("@/hooks/usePolledFetch", () => ({
  usePolledFetch: (...args: unknown[]) => mockUsePolledFetch(...args),
}));

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { useCatalog } from "../../hooks/useCatalog";

// ── Helpers ──────────────────────────────────────────────────────────────────
function createMockItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    name: "Cemento",
    unit: "Saco",
    estimatedUnitPrice: 12.5,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("useCatalog", () => {
  const showToast = vi.fn();
  const mockSetData = vi.fn();
  const mockRefresh = vi.fn();

  const defaultReturn = {
    data: [],
    setData: mockSetData,
    isLoading: true,
    refresh: mockRefresh,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePolledFetch.mockReturnValue(defaultReturn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes correct options to usePolledFetch", () => {
    renderHook(() => useCatalog("token", showToast));

    expect(mockUsePolledFetch).toHaveBeenCalledWith({
      authToken: "token",
      showToast,
      fetcher: expect.any(Function),
      getSignature: expect.any(Function),
      errorMessage: expect.any(String),
    });
  });

  it("returns catalog, loading, and handlers", () => {
    const { result } = renderHook(() => useCatalog("token", showToast));

    expect(result.current.materialsCatalog).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(typeof result.current.loadMaterials).toBe("function");
    expect(typeof result.current.handleAddCatalogItem).toBe("function");
    expect(typeof result.current.resetCatalog).toBe("function");
  });

  describe("handleAddCatalogItem", () => {
    it("appends new item to the catalog", () => {
      const existing = [createMockItem({ name: "Arena" })];
      mockUsePolledFetch.mockReturnValue({ ...defaultReturn, data: existing, setData: mockSetData });

      const { result } = renderHook(() => useCatalog("token", showToast));

      const newItem = createMockItem({ name: "Cemento" });
      act(() => {
        result.current.handleAddCatalogItem(newItem);
      });

      const updater = mockSetData.mock.calls[0][0];
      const next = updater(existing);
      expect(next).toEqual([...existing, newItem]);
    });
  });

  describe("resetCatalog", () => {
    it("clears catalog to empty array", () => {
      mockUsePolledFetch.mockReturnValue({ ...defaultReturn, data: [createMockItem()], setData: mockSetData });

      const { result } = renderHook(() => useCatalog("token", showToast));

      act(() => {
        result.current.resetCatalog();
      });

      expect(mockSetData).toHaveBeenCalledWith([]);
    });
  });

  describe("fetcher", () => {
    it("calls apiFetch with /materials endpoint", () => {
      mockUsePolledFetch.mockImplementation(({ fetcher }) => {
        fetcher();
        return defaultReturn;
      });

      renderHook(() => useCatalog("token", showToast));
      expect(mockApiFetch).toHaveBeenCalledWith("/materials", { token: "token" });
    });
  });

  describe("getSignature", () => {
    it("produces unique signatures", () => {
      mockUsePolledFetch.mockImplementation(({ getSignature }) => {
        const items = [
          createMockItem({ name: "A", unit: "u", estimatedUnitPrice: 10 }),
          createMockItem({ name: "B", unit: "kg", estimatedUnitPrice: 20 }),
        ];
        const sig1 = getSignature(items);
        const sig2 = getSignature(items);
        expect(sig1).toBe(sig2);

        const changed = [createMockItem({ name: "A", unit: "u", estimatedUnitPrice: 15 }), ...items.slice(1)];
        const sig3 = getSignature(changed);
        expect(sig1).not.toBe(sig3);

        return defaultReturn;
      });

      renderHook(() => useCatalog("token", showToast));
    });
  });
});
