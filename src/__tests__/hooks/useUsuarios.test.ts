import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

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
const mockLogError = vi.fn();
vi.mock("@/services/logger", () => ({
  getErrorMessage: (...args: unknown[]) => mockGetErrorMessage(...args),
  logError: (...args: unknown[]) => mockLogError(...args),
}));

import { useUsuarios, type UserRecord, __resetRolesCacheForTests } from "../../hooks/useUsuarios";

// ── Helpers ──────────────────────────────────────────────────────────────────
function createMockUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 1,
    name: "Test User",
    email: "test@ivoo.com",
    role: "ANALISTA",
    status: "Active",
    created_at: "2026-07-01",
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("useUsuarios", () => {
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
    __resetRolesCacheForTests();
    mockUsePolledFetch.mockReturnValue(defaultReturn);
    mockGetErrorMessage.mockImplementation((_err: unknown, fallback: string) => fallback);
    // Default para el fetch de /roles disparado al montar (con authToken);
    // los tests que ejercitan otros endpoints sobreescriben con mockResolvedValueOnce.
    mockApiFetch.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes correct options to usePolledFetch", () => {
    renderHook(() => useUsuarios("token", showToast));

    expect(mockUsePolledFetch).toHaveBeenCalledWith({
      authToken: "token",
      showToast,
      fetcher: expect.any(Function),
      getSignature: expect.any(Function),
      errorMessage: expect.any(String),
    });
  });

  it("returns users, loading, and handlers", () => {
    const { result } = renderHook(() => useUsuarios("token", showToast));

    expect(result.current.users).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(typeof result.current.loadUsers).toBe("function");
    expect(typeof result.current.handleCreateUser).toBe("function");
    expect(typeof result.current.handleUpdateUser).toBe("function");
    expect(typeof result.current.handleToggleUserStatus).toBe("function");
    expect(typeof result.current.handleSendPasswordReset).toBe("function");
  });

  describe("fetcher", () => {
    it("calls apiFetch with /users endpoint", () => {
      mockUsePolledFetch.mockImplementation(({ fetcher }) => {
        fetcher();
        return defaultReturn;
      });

      renderHook(() => useUsuarios("token", showToast));
      expect(mockApiFetch).toHaveBeenCalledWith("/users");
    });
  });

  describe("roles", () => {
    it("carga /roles al montar con token y lo expone en el hook", async () => {
      mockApiFetch.mockResolvedValue(["SUPERADMIN", "ADMIN", "ANALISTA"]);

      const { result } = renderHook(() => useUsuarios("token", showToast));

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/roles");
      expect(result.current.roles).toEqual(["SUPERADMIN", "ADMIN", "ANALISTA"]);
    });

    it("no llama a /roles sin authToken", () => {
      renderHook(() => useUsuarios("", showToast));
      expect(mockApiFetch).not.toHaveBeenCalledWith("/roles", expect.anything());
    });

    it("cachea /roles entre remontajes — un segundo montaje no vuelve a pedir el endpoint", async () => {
      mockApiFetch.mockResolvedValue(["SUPERADMIN", "ADMIN"]);

      const first = renderHook(() => useUsuarios("token", showToast));
      await act(async () => {
        await Promise.resolve();
      });
      const rolesCallsAfterFirst = mockApiFetch.mock.calls.filter(c => c[0] === "/roles").length;
      expect(rolesCallsAfterFirst).toBe(1);
      first.unmount();

      const second = renderHook(() => useUsuarios("token", showToast));
      expect(second.result.current.roles).toEqual(["SUPERADMIN", "ADMIN"]);
      await act(async () => {
        await Promise.resolve();
      });

      const rolesCallsAfterSecond = mockApiFetch.mock.calls.filter(c => c[0] === "/roles").length;
      expect(rolesCallsAfterSecond).toBe(1);
    });
  });

  describe("handleCreateUser", () => {
    it("POSTs to /users and prepends to list", async () => {
      const newUser = createMockUser({ id: 2, name: "New User" });
      mockApiFetch.mockResolvedValue(newUser);

      const { result } = renderHook(() => useUsuarios("token", showToast));

      let created: UserRecord | undefined;
      await act(async () => {
        created = await result.current.handleCreateUser({
          name: "New User",
          email: "new@ivoo.com",
          password: "pass1234",
          password_confirmation: "pass1234",
          role: "ANALISTA",
        });
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/users", {
        method: "POST",
        body: expect.stringContaining("New User"),
      });
      expect(created).toEqual(newUser);

      const updater = mockSetData.mock.calls[0][0];
      const next = updater([createMockUser({ id: 1 })]);
      expect(next[0]).toEqual(newUser); // prepended
    });

    it("shows error toast and re-throws on failure", async () => {
      const error = new Error("Validation error");
      mockApiFetch.mockRejectedValue(error);
      mockGetErrorMessage.mockReturnValue("Error al registrar el usuario.");

      const { result } = renderHook(() => useUsuarios("token", showToast));

      await expect(
        act(async () =>
          result.current.handleCreateUser({
            name: "Fail",
            email: "fail@ivoo.com",
            password: "pass1234",
            password_confirmation: "pass1234",
            role: "ANALISTA",
          }),
        ),
      ).rejects.toThrow("Validation error");

      expect(showToast).toHaveBeenCalledWith("Error al registrar el usuario.", "error");
    });
  });

  describe("handleUpdateUser", () => {
    it("PATCHes to /users/{id} and updates local state", async () => {
      const updated = createMockUser({ id: 1, name: "Updated Name", role: "ADMIN" });
      mockApiFetch.mockResolvedValue(updated);

      const existing = [createMockUser({ id: 1, name: "Old Name" })];
      mockUsePolledFetch.mockReturnValue({ ...defaultReturn, data: existing, setData: mockSetData });

      const { result } = renderHook(() => useUsuarios("token", showToast));

      let returned: UserRecord | undefined;
      await act(async () => {
        returned = await result.current.handleUpdateUser(1, { name: "Updated Name", role: "ADMIN" });
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/users/1", {
        method: "PATCH",
        body: expect.stringContaining("Updated Name"),
      });
      expect(returned).toEqual(updated);

      const updater = mockSetData.mock.calls[0][0];
      const next = updater(existing);
      expect(next[0].name).toBe("Updated Name");
      expect(showToast).toHaveBeenCalledWith("Usuario actualizado correctamente.", "success");
    });
  });

  describe("handleToggleUserStatus", () => {
    it("POSTs to /users/{id}/toggle-status and updates local state", async () => {
      mockApiFetch.mockResolvedValue({ id: 1, status: "Inactive" });

      const existing = [createMockUser({ id: 1, status: "Active" })];
      mockUsePolledFetch.mockReturnValue({ ...defaultReturn, data: existing, setData: mockSetData });

      const { result } = renderHook(() => useUsuarios("token", showToast));

      let newStatus: "Active" | "Inactive" | undefined;
      await act(async () => {
        const result_ = await result.current.handleToggleUserStatus(1);
        newStatus = result_.status;
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/users/1/toggle-status", {
        method: "POST",
      });
      expect(newStatus).toBe("Inactive");

      const updater = mockSetData.mock.calls[0][0];
      const next = updater(existing);
      expect(next[0].status).toBe("Inactive");
      expect(showToast).toHaveBeenCalledWith("Usuario desactivado correctamente.", "success");
    });
  });

  describe("handleSendPasswordReset", () => {
    it("POSTs to /users/{id}/send-reset-link and shows success toast", async () => {
      mockApiFetch.mockResolvedValue({ message: "Link sent" });

      const { result } = renderHook(() => useUsuarios("token", showToast));

      await act(async () => {
        await result.current.handleSendPasswordReset(1);
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/users/1/send-reset-link", {
        method: "POST",
      });
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("Link de restablecimiento enviado"),
        "success",
      );
    });

    it("shows error toast on failure", async () => {
      mockApiFetch.mockRejectedValue(new Error("fail"));
      mockGetErrorMessage.mockReturnValue("Error al enviar el link.");

      const { result } = renderHook(() => useUsuarios("token", showToast));

      await act(async () => {
        await result.current.handleSendPasswordReset(1).catch(() => {});
      });

      expect(showToast).toHaveBeenCalledWith("Error al enviar el link.", "error");
    });
  });
});
