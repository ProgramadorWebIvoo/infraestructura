import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useRoleAccess } from "@/hooks/useRouting";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("@/services/logger", () => ({
  logError: vi.fn(),
}));

// GET /auth/permissions ya devuelve la lista resuelta para el usuario
// autenticado (rol + overrides individuales, ver AccessResolver en el
// backend) — no una matriz por rol.
const SUPERADMIN_VIEWS = ["/presidencia", "/infraestructura", "/cierre-obra", "/procura", "/analistas", "/finanzas", "/catalogos", "/usuarios", "/config-proveedores", "/config-materiales", "/config-ia"];
const PRESIDENCIA_VIEWS = ["/presidencia", "/catalogos"];

async function renderLoaded(role: string | undefined) {
  const hook = renderHook(() => useRoleAccess(role));
  await waitFor(() => expect(hook.result.current.isLoadingPermissions).toBe(false));
  return hook;
}

describe("useRoleAccess", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue(SUPERADMIN_VIEWS);
  });

  // -----------------------------------------------------------------------
  // Carga de permisos (GET /auth/permissions)
  // -----------------------------------------------------------------------

  describe("carga de permisos", () => {
    it("empieza en isLoadingPermissions=true cuando hay rol", () => {
      const { result } = renderHook(() => useRoleAccess("SUPERADMIN"));
      expect(result.current.isLoadingPermissions).toBe(true);
      expect(mockApiFetch).toHaveBeenCalledWith("/auth/permissions", { method: "GET" });
    });

    it("no dispara fetch ni queda cargando si no hay rol", () => {
      const { result } = renderHook(() => useRoleAccess(undefined));
      expect(result.current.isLoadingPermissions).toBe(false);
      expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("mientras carga, canAccess deniega todo (fail-closed)", () => {
      const { result } = renderHook(() => useRoleAccess("SUPERADMIN"));
      expect(result.current.isLoadingPermissions).toBe(true);
      expect(result.current.canAccess("/presidencia")).toBe(false);
    });

    it("si el fetch falla, termina de cargar sin permisos (deny-by-default)", async () => {
      mockApiFetch.mockRejectedValue(new Error("network"));
      const { result } = await renderLoaded("SUPERADMIN");
      expect(result.current.canAccess("/presidencia")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // canAccess
  // -----------------------------------------------------------------------

  describe("canAccess", () => {
    it("accede a todas las vistas resueltas por el backend", async () => {
      const { result } = await renderLoaded("SUPERADMIN");

      for (const path of SUPERADMIN_VIEWS) {
        expect(result.current.canAccess(path)).toBe(true);
      }
    });

    it("NO accede a rutas no listadas", async () => {
      const { result } = await renderLoaded("SUPERADMIN");

      expect(result.current.canAccess("/no-existe")).toBe(false);
      expect(result.current.canAccess("/login")).toBe(false);
    });

    it("respeta la lista resuelta (rol + overrides) tal como llega del backend", async () => {
      mockApiFetch.mockResolvedValue(PRESIDENCIA_VIEWS);
      const { result } = await renderLoaded("PRESIDENCIA");

      expect(result.current.canAccess("/presidencia")).toBe(true);
      expect(result.current.canAccess("/catalogos")).toBe(true);
      expect(result.current.canAccess("/infraestructura")).toBe(false);
      expect(result.current.canAccess("/finanzas")).toBe(false);
    });

    it("returna false si role es undefined", () => {
      const { result } = renderHook(() => useRoleAccess(undefined));
      expect(result.current.canAccess("/presidencia")).toBe(false);
    });

    it("deniega todo si el backend no devuelve vistas (deny-by-default)", async () => {
      mockApiFetch.mockResolvedValue([]);
      const { result } = await renderLoaded("ROL_INEXISTENTE");

      expect(result.current.canAccess("/presidencia")).toBe(false);
      expect(result.current.canAccess("/infraestructura")).toBe(false);
      expect(result.current.canAccess("/finanzas")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // firstAllowedRoute
  // -----------------------------------------------------------------------

  describe("firstAllowedRoute", () => {
    it("retorna la primera vista resuelta", async () => {
      const { result } = await renderLoaded("SUPERADMIN");
      expect(result.current.firstAllowedRoute()).toBe("/presidencia");
    });

    it("retorna null si no hay vistas resueltas", async () => {
      mockApiFetch.mockResolvedValue([]);
      const { result } = await renderLoaded("SUPERADMIN");
      expect(result.current.firstAllowedRoute()).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // activeRole
  // -----------------------------------------------------------------------

  describe("activeRole", () => {
    it("refleja el rol pasado", () => {
      const { result } = renderHook(() => useRoleAccess("ANALISTA"));
      expect(result.current.activeRole).toBe("ANALISTA");
    });

    it("es undefined si no se pasa rol", () => {
      const { result } = renderHook(() => useRoleAccess(undefined));
      expect(result.current.activeRole).toBeUndefined();
    });
  });
});
