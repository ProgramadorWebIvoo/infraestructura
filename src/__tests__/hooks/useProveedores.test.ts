import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { SupplierMaterialProposal } from "../../types";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockUsePolledFetch = vi.fn();
vi.mock("@/hooks/usePolledFetch", () => ({
  usePolledFetch: (...args: unknown[]) => mockUsePolledFetch(...args),
}));

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const mockGetErrorMessage = vi.fn();
vi.mock("@/services/logger", () => ({
  getErrorMessage: (...args: unknown[]) => mockGetErrorMessage(...args),
}));

import { useProveedores } from "../../hooks/useProveedores";

// ── Tests ────────────────────────────────────────────────────────────────────
describe("useProveedores", () => {
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
    mockGetErrorMessage.mockImplementation((_err: unknown, fallback: string) => fallback);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes correct options to usePolledFetch", () => {
    renderHook(() => useProveedores("token", showToast));

    expect(mockUsePolledFetch).toHaveBeenCalledWith({
      authToken: "token",
      showToast,
      fetcher: expect.any(Function),
      getSignature: expect.any(Function),
      errorMessage: expect.any(String),
    });
  });

  it("returns proposals, loading state, and handlers", () => {
    const { result } = renderHook(() => useProveedores("token", showToast));

    expect(result.current.proposals).toEqual([]);
    expect(result.current.isLoadingProposals).toBe(true);
    expect(typeof result.current.loadProposals).toBe("function");
    expect(typeof result.current.handleInviteSupplier).toBe("function");
  });

  describe("fetcher", () => {
    it("calls apiFetch with /supplier-material-proposals endpoint", () => {
      mockUsePolledFetch.mockImplementation(({ fetcher }) => {
        fetcher();
        return defaultReturn;
      });

      renderHook(() => useProveedores("token", showToast));
      expect(mockApiFetch).toHaveBeenCalledWith("/supplier-material-proposals", { token: "token" });
    });
  });

  describe("getSignature", () => {
    it("uses id field for signature", () => {
      mockUsePolledFetch.mockImplementation(({ getSignature }) => {
        const items = [
          { id: "P-001" } as SupplierMaterialProposal,
          { id: "P-002" } as SupplierMaterialProposal,
        ];
        expect(getSignature(items)).toBe("P-001|P-002");
        return defaultReturn;
      });

      renderHook(() => useProveedores("token", showToast));
    });
  });

  describe("handleInviteSupplier", () => {
    it("POSTs to /supplier-invitations and shows success toast", async () => {
      mockApiFetch.mockResolvedValue({ token: "invite-token", projectTitle: "Test Project" });

      const { result } = renderHook(() => useProveedores("token", showToast));

      const res = await act(async () =>
        result.current.handleInviteSupplier({
          project_id: "PRJ-001",
          supplierName: "Proveedor X",
          supplierCompany: "Company X",
          supplierContact: "proveedor@x.com",
        }),
      );

      expect(mockApiFetch).toHaveBeenCalledWith("/supplier-invitations", {
        method: "POST",
        token: "token",
        body: JSON.stringify({
          project_id: "PRJ-001",
          supplierName: "Proveedor X",
          supplierCompany: "Company X",
          supplierContact: "proveedor@x.com",
        }),
      });
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("Invitación enviada"),
        "success",
      );
      expect(res).toEqual({ token: "invite-token", projectTitle: "Test Project" });
    });

    it("sanitiza HTML/scripts de supplierName y supplierCompany antes de enviar", async () => {
      mockApiFetch.mockResolvedValue({ token: "invite-token", projectTitle: "Test Project" });

      const { result } = renderHook(() => useProveedores("token", showToast));

      await act(async () =>
        result.current.handleInviteSupplier({
          project_id: "PRJ-001",
          supplierName: '<script>alert(1)</script>Proveedor X',
          supplierCompany: '<img src=x onerror=alert(1)>Company X',
          supplierContact: "proveedor@x.com",
        }),
      );

      expect(mockApiFetch).toHaveBeenCalledWith("/supplier-invitations", {
        method: "POST",
        token: "token",
        body: JSON.stringify({
          project_id: "PRJ-001",
          supplierName: "Proveedor X",
          supplierCompany: "Company X",
          supplierContact: "proveedor@x.com",
        }),
      });
    });

    it("shows error toast and re-throws on failure", async () => {
      const error = new Error("API error");
      mockApiFetch.mockRejectedValue(error);
      mockGetErrorMessage.mockReturnValue("Error al enviar la invitación.");

      const { result } = renderHook(() => useProveedores("token", showToast));

      await expect(
        act(async () =>
          result.current.handleInviteSupplier({
            project_id: "PRJ-001",
            supplierName: "Proveedor X",
            supplierCompany: null,
            supplierContact: "proveedor@x.com",
          }),
        ),
      ).rejects.toThrow("API error");

      expect(showToast).toHaveBeenCalledWith("Error al enviar la invitación.", "error");
    });
  });
});
