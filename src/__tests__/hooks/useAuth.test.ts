/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para useAuth — verifica sanitización,
 * validación client-side, y manejo de localStorage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";

// ---------------------------------------------------------------------------
// Mock apiFetch
// ---------------------------------------------------------------------------

const mockApiFetch = vi.fn();
const mockSetTokenRefreshHandler = vi.fn();

vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  setTokenRefreshHandler: (...args: unknown[]) => mockSetTokenRefreshHandler(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_TOKEN = "ivoo_auth_token";
const STORAGE_USER = "ivoo_auth_user";

function setLocalStorage(token?: string, user?: unknown) {
  if (token) localStorage.setItem(STORAGE_TOKEN, token);
  if (user) localStorage.setItem(STORAGE_USER, JSON.stringify(user));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    mockApiFetch.mockReset();
    // Default: session validation on mount succeeds (returns user)
    mockApiFetch.mockResolvedValue({ user: { name: "Test", email: "test@ivoo.local", role: "ADMIN" } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Initial state from localStorage
  // -----------------------------------------------------------------------

  describe("initial state", () => {
    it("inicia con token vacío y usuario null si no hay nada en localStorage", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.authToken).toBe("");
      expect(result.current.authUser).toBeNull();
    });

    it("restaura token y usuario desde localStorage", () => {
      setLocalStorage("tok123", {
        name: "Admin",
        email: "admin@ivoo.local",
        role: "PRESIDENCIA",
      });
      const { result } = renderHook(() => useAuth());
      expect(result.current.authToken).toBe("tok123");
      expect(result.current.authUser).toEqual({
        name: "Admin",
        email: "admin@ivoo.local",
        role: "PRESIDENCIA",
      });
    });

    it("tolera JSON corrupto en localStorage sin explotar", () => {
      localStorage.setItem(STORAGE_USER, "{broken json}");
      const { result } = renderHook(() => useAuth());
      expect(result.current.authUser).toBeNull();
      expect(localStorage.getItem(STORAGE_USER)).toBeNull(); // limpiado
    });
  });

  // -----------------------------------------------------------------------
  // handleLogin — sanitización y validación
  // -----------------------------------------------------------------------

  describe("handleLogin — sanitización", () => {
    it("sanitiza email: trim + lowercase antes de enviar", async () => {
      mockApiFetch.mockResolvedValueOnce({
        token: "t1",
        user: { name: "U", email: "u@ivoo.local", role: "ANALISTA" },
      });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.handleLogin("  Admin@Ivoo.Local  ", "pass"));

      expect(mockApiFetch).toHaveBeenCalledWith("/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@ivoo.local",
          password: "pass",
          device_name: "web",
        }),
      });
    });

    it("guarda usuario sanitizado (String/undefined)", async () => {
      mockApiFetch.mockResolvedValueOnce({
        token: "t2",
        user: { name: 123, email: null, role: "" },
      });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.handleLogin("x@y.z", "p"));

      expect(result.current.authUser).toEqual({
        name: "123",
        email: "",
        role: undefined,
      });
    });

    it("setea authToken en estado y localStorage", async () => {
      mockApiFetch.mockResolvedValueOnce({
        token: "tok-final",
        user: { name: "A", email: "a@b.c" },
      });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.handleLogin("a@b.c", "p"));

      expect(result.current.authToken).toBe("tok-final");
      expect(localStorage.getItem(STORAGE_TOKEN)).toBe("tok-final");
    });
  });

  describe("handleLogin — validación client-side", () => {
    it("lanza error si el email está vacío", async () => {
      const { result } = renderHook(() => useAuth());
      await expect(
        act(() => result.current.handleLogin("  ", "pass")),
      ).rejects.toThrow("Ingrese su correo electrónico");
      expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("lanza error si el email tiene formato inválido", async () => {
      const { result } = renderHook(() => useAuth());
      await expect(
        act(() => result.current.handleLogin("invalido", "pass")),
      ).rejects.toThrow("El formato del correo no es válido");
      expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("lanza error si la contraseña está vacía", async () => {
      const { result } = renderHook(() => useAuth());
      await expect(
        act(() => result.current.handleLogin("a@b.c", "")),
      ).rejects.toThrow("Ingrese su clave");
      expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("lanza error si la contraseña está vacía (solo espacios se envían al backend)", async () => {
      mockApiFetch.mockResolvedValueOnce({
        token: "t3",
        user: { name: "U", email: "u@ivoo.local" },
      });
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.handleLogin("a@b.c", "   "));
      // espacios no se trimean — se envían tal cual al backend
      expect(mockApiFetch).toHaveBeenCalledWith("/login", expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"password":"   "'),
      }));
    });
  });

  describe("handleLogin — errores del backend", () => {
    it("propaga error del servidor (no validation, no rate-limit)", async () => {
      mockApiFetch.mockRejectedValueOnce(new Error("Credenciales inválidas"));

      const { result } = renderHook(() => useAuth());
      await expect(
        act(() => result.current.handleLogin("a@b.c", "wrong")),
      ).rejects.toThrow("Credenciales inválidas");

      expect(result.current.authToken).toBe("");
      expect(result.current.authUser).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // handleLogout
  // -----------------------------------------------------------------------

  describe("handleLogout", () => {
    it("llama a /logout si hay token", async () => {
      mockApiFetch.mockResolvedValueOnce({ token: "t1", user: { name: "U", email: "u@ivoo.local" } });
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.handleLogin("u@ivoo.local", "p"));

      mockApiFetch.mockReset();
      mockApiFetch.mockResolvedValueOnce(undefined);

      await act(() => result.current.handleLogout());
      expect(mockApiFetch).toHaveBeenCalledWith("/logout", { method: "POST", token: "t1" });
    });

    it("no falla si no hay token", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.handleLogout());
      expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("limpia estado y localStorage aunque /logout falle", async () => {
      mockApiFetch.mockResolvedValueOnce({ token: "t1", user: { name: "U", email: "u@ivoo.local" } });
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.handleLogin("u@ivoo.local", "p"));

      mockApiFetch.mockReset();
      mockApiFetch.mockRejectedValueOnce(new Error("Network"));

      await act(() => result.current.handleLogout());
      expect(result.current.authToken).toBe("");
      expect(result.current.authUser).toBeNull();
      expect(localStorage.getItem(STORAGE_TOKEN)).toBeNull();
      expect(localStorage.getItem(STORAGE_USER)).toBeNull();
    });
  });
});
