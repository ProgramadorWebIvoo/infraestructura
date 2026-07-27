/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para useAuth — verifica sanitización, validación
 * client-side, y el flujo de sesión por cookie httpOnly (Sanctum SPA):
 * no hay token que leer/escribir en localStorage, solo un sentinel en
 * memoria derivado de si GET /user resuelve o falla.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";

// ---------------------------------------------------------------------------
// Mock apiFetch
// ---------------------------------------------------------------------------

const mockApiFetch = vi.fn();

vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_USER = "ivoo_auth_user";

async function renderAuthenticated() {
  mockApiFetch.mockResolvedValueOnce({
    user: { name: "Test", email: "test@ivoo.local", role: "ADMIN" },
  });
  const hook = renderHook(() => useAuth());
  await waitFor(() => expect(hook.result.current.isValidatingSession).toBe(false));
  return hook;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    mockApiFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Validación de sesión al montar (GET /user vía cookie httpOnly)
  // -----------------------------------------------------------------------

  describe("validación de sesión al montar", () => {
    it("empieza validando sesión y llama a GET /user sin token", () => {
      mockApiFetch.mockResolvedValueOnce({ user: { name: "T", email: "t@ivoo.local" } });
      const { result } = renderHook(() => useAuth());

      expect(result.current.isValidatingSession).toBe(true);
      expect(mockApiFetch).toHaveBeenCalledWith("/user", { method: "GET" });
    });

    it("si /user resuelve, queda autenticado con sentinel y usuario del backend", async () => {
      const { result } = await renderAuthenticated();

      expect(result.current.authToken).toBe("authenticated");
      expect(result.current.authUser).toEqual({
        name: "Test",
        email: "test@ivoo.local",
        role: "ADMIN",
      });
      expect(JSON.parse(localStorage.getItem(STORAGE_USER)!)).toEqual(result.current.authUser);
    });

    it("si /user falla (sin cookie de sesión válida), queda sin autenticar", async () => {
      mockApiFetch.mockRejectedValueOnce(new Error("401"));
      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.isValidatingSession).toBe(false));
      expect(result.current.authToken).toBe("");
      expect(result.current.authUser).toBeNull();
    });

    it("tolera JSON corrupto cacheado en localStorage sin explotar", () => {
      localStorage.setItem(STORAGE_USER, "{broken json}");
      mockApiFetch.mockResolvedValueOnce({ user: { name: "T", email: "t@ivoo.local" } });

      const { result } = renderHook(() => useAuth());
      expect(result.current.authUser).toBeNull();
      expect(localStorage.getItem(STORAGE_USER)).toBeNull(); // limpiado
    });
  });

  // -----------------------------------------------------------------------
  // handleLogin — sanitización y validación
  // -----------------------------------------------------------------------

  describe("handleLogin — sanitización", () => {
    it("sanitiza email: trim + lowercase antes de enviar, sin device_name", async () => {
      const { result } = await renderAuthenticated();

      mockApiFetch.mockResolvedValueOnce({
        user: { name: "U", email: "u@ivoo.local", role: "ANALISTA" },
      });
      await act(() => result.current.handleLogin("  Admin@Ivoo.Local  ", "pass"));

      expect(mockApiFetch).toHaveBeenCalledWith("/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@ivoo.local",
          password: "pass",
        }),
      });
    });

    it("guarda usuario sanitizado (String/undefined)", async () => {
      const { result } = await renderAuthenticated();

      mockApiFetch.mockResolvedValueOnce({ user: { name: 123, email: null, role: "" } });
      await act(() => result.current.handleLogin("x@y.z", "p"));

      expect(result.current.authUser).toEqual({
        name: "123",
        email: "",
        role: undefined,
      });
    });

    it("setea el sentinel authenticated en estado, sin token en localStorage", async () => {
      const { result } = await renderAuthenticated();

      mockApiFetch.mockResolvedValueOnce({ user: { name: "A", email: "a@b.c" } });
      await act(() => result.current.handleLogin("a@b.c", "p"));

      expect(result.current.authToken).toBe("authenticated");
      expect(localStorage.getItem("ivoo_auth_token")).toBeNull();
    });
  });

  describe("handleLogin — validación client-side", () => {
    it("lanza error si el email está vacío", async () => {
      const { result } = await renderAuthenticated();
      mockApiFetch.mockClear();

      await expect(
        act(() => result.current.handleLogin("  ", "pass")),
      ).rejects.toThrow("Ingrese su correo electrónico");
      expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("lanza error si el email tiene formato inválido", async () => {
      const { result } = await renderAuthenticated();
      mockApiFetch.mockClear();

      await expect(
        act(() => result.current.handleLogin("invalido", "pass")),
      ).rejects.toThrow("El formato del correo no es válido");
      expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("lanza error si la contraseña está vacía", async () => {
      const { result } = await renderAuthenticated();
      mockApiFetch.mockClear();

      await expect(
        act(() => result.current.handleLogin("a@b.c", "")),
      ).rejects.toThrow("Ingrese su clave");
      expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("la contraseña con solo espacios se envía tal cual al backend", async () => {
      const { result } = await renderAuthenticated();

      mockApiFetch.mockResolvedValueOnce({ user: { name: "U", email: "u@ivoo.local" } });
      await act(() => result.current.handleLogin("a@b.c", "   "));

      expect(mockApiFetch).toHaveBeenCalledWith("/login", expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"password":"   "'),
      }));
    });
  });

  describe("handleLogin — errores del backend", () => {
    it("propaga error del servidor y no deja estado autenticado", async () => {
      mockApiFetch.mockRejectedValueOnce(new Error("401"));
      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.isValidatingSession).toBe(false));

      mockApiFetch.mockRejectedValueOnce(new Error("Credenciales inválidas"));
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
    it("llama a /logout sin token (la cookie viaja sola)", async () => {
      const { result } = await renderAuthenticated();

      mockApiFetch.mockResolvedValueOnce(undefined);
      await act(() => result.current.handleLogout());

      expect(mockApiFetch).toHaveBeenCalledWith("/logout", { method: "POST" });
    });

    it("no llama a /logout si no hay sesión autenticada", async () => {
      mockApiFetch.mockRejectedValueOnce(new Error("401"));
      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.isValidatingSession).toBe(false));

      mockApiFetch.mockClear();
      await act(() => result.current.handleLogout());
      expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("limpia estado y localStorage aunque /logout falle", async () => {
      const { result } = await renderAuthenticated();

      mockApiFetch.mockRejectedValueOnce(new Error("Network"));
      await act(() => result.current.handleLogout());

      expect(result.current.authToken).toBe("");
      expect(result.current.authUser).toBeNull();
      expect(localStorage.getItem(STORAGE_USER)).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Inactividad por tiempo real (PC suspendida/apagada) — bug: el timeout
  // solo limpiaba estado local y recargaba, sin avisarle al backend. Como
  // la sesión vive en una cookie httpOnly con lifetime propio (Sanctum), el
  // reload sin /logout dejaba la cookie viva y GET /user volvía a
  // autenticar sola en el remount, dejando el "fix" sin efecto observable.
  // -----------------------------------------------------------------------

  describe("timeout de inactividad", () => {
    const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
    const INACTIVITY_CHECK_MS = 15_000;
    let reloadSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      reloadSpy = vi.fn();
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...window.location, reload: reloadSpy },
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("al superar 30 min de inactividad, llama a /logout ANTES de limpiar y recargar", async () => {
      const { result } = await renderAuthenticated();
      mockApiFetch.mockClear();
      mockApiFetch.mockResolvedValueOnce(undefined); // POST /logout

      await act(async () => {
        vi.advanceTimersByTime(SESSION_TIMEOUT_MS + INACTIVITY_CHECK_MS);
        await vi.runOnlyPendingTimersAsync();
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/logout", { method: "POST" });
      expect(result.current.authToken).toBe("");
      expect(result.current.authUser).toBeNull();
      expect(localStorage.getItem(STORAGE_USER)).toBeNull();
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it("igual limpia sesión y recarga si /logout falla en el backend", async () => {
      const { result } = await renderAuthenticated();
      mockApiFetch.mockClear();
      mockApiFetch.mockRejectedValueOnce(new Error("Network"));

      await act(async () => {
        vi.advanceTimersByTime(SESSION_TIMEOUT_MS + INACTIVITY_CHECK_MS);
        await vi.runOnlyPendingTimersAsync();
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/logout", { method: "POST" });
      expect(result.current.authToken).toBe("");
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it("no dispara timeout antes de los 30 minutos", async () => {
      await renderAuthenticated();
      mockApiFetch.mockClear();

      await act(async () => {
        vi.advanceTimersByTime(SESSION_TIMEOUT_MS - 60_000);
        await vi.runOnlyPendingTimersAsync();
      });

      expect(mockApiFetch).not.toHaveBeenCalledWith("/logout", expect.anything());
      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it("visibilitychange al volver del tab dispara el chequeo inmediato (PC suspendida)", async () => {
      await renderAuthenticated();
      mockApiFetch.mockClear();
      mockApiFetch.mockResolvedValueOnce(undefined);

      // Simula que el PC durmió: el reloj avanza más del timeout, pero
      // ningún setInterval llega a correr (proceso congelado) hasta que
      // el tab vuelve a ser visible.
      vi.setSystemTime(Date.now() + SESSION_TIMEOUT_MS + 60_000);
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "visible",
      });

      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
        await vi.runOnlyPendingTimersAsync();
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/logout", { method: "POST" });
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it("no dispara dos veces el logout si el interval vuelve a correr mientras la llamada está en curso", async () => {
      const { result } = await renderAuthenticated();
      mockApiFetch.mockClear();
      let resolveLogout: () => void = () => {};
      mockApiFetch.mockImplementationOnce(
        () => new Promise<void>((resolve) => { resolveLogout = resolve; }),
      );

      await act(async () => {
        vi.advanceTimersByTime(SESSION_TIMEOUT_MS + INACTIVITY_CHECK_MS);
        await vi.advanceTimersByTimeAsync(INACTIVITY_CHECK_MS * 3);
      });

      expect(mockApiFetch).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveLogout();
        await vi.runOnlyPendingTimersAsync();
      });

      expect(reloadSpy).toHaveBeenCalledTimes(1);
      expect(result.current.authToken).toBe("");
    });
  });
});
