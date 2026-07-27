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

// Espejo de config/permissions.php (backend) — fixture de test, no fuente de verdad.
const MOCK_PERMISSIONS: Record<string, string[]> = {
  SUPERADMIN: ["/presidencia", "/infraestructura", "/cierre-obra", "/procura", "/analistas", "/finanzas", "/catalogos", "/usuarios", "/config-proveedores", "/config-materiales", "/config-ia"],
  ADMIN: ["/infraestructura", "/cierre-obra", "/procura", "/analistas", "/finanzas", "/catalogos", "/usuarios", "/config-proveedores", "/config-materiales", "/config-ia"],
  PRESIDENCIA: ["/presidencia", "/catalogos"],
  INFRAESTRUCTURA: ["/infraestructura"],
  CIERRE_DE_OBRA: ["/cierre-obra"],
  PROCURA: ["/procura", "/catalogos"],
  ANALISTA: ["/analistas"],
  FINANZAS: ["/finanzas"],
  CATALOGOS: ["/catalogos"],
};

async function renderLoaded(role: string | undefined) {
  const hook = renderHook(() => useRoleAccess(role));
  await waitFor(() => expect(hook.result.current.isLoadingPermissions).toBe(false));
  return hook;
}

describe("useRoleAccess", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue(MOCK_PERMISSIONS);
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
    it("SUPERADMIN accede a todas las rutas de su matriz", async () => {
      const { result } = await renderLoaded("SUPERADMIN");

      for (const path of MOCK_PERMISSIONS.SUPERADMIN) {
        expect(result.current.canAccess(path)).toBe(true);
      }
    });

    it("SUPERADMIN NO accede a rutas no listadas", async () => {
      const { result } = await renderLoaded("SUPERADMIN");

      expect(result.current.canAccess("/no-existe")).toBe(false);
      expect(result.current.canAccess("/login")).toBe(false);
    });

    it("PRESIDENCIA solo accede a presidencia y catalogos", async () => {
      const { result } = await renderLoaded("PRESIDENCIA");

      expect(result.current.canAccess("/presidencia")).toBe(true);
      expect(result.current.canAccess("/catalogos")).toBe(true);
      expect(result.current.canAccess("/infraestructura")).toBe(false);
      expect(result.current.canAccess("/finanzas")).toBe(false);
    });

    it("ADMIN no accede a /presidencia (solo SUPERADMIN y PRESIDENCIA)", async () => {
      const { result } = await renderLoaded("ADMIN");
      expect(result.current.canAccess("/presidencia")).toBe(false);
    });

    it("returna false si role es undefined", () => {
      const { result } = renderHook(() => useRoleAccess(undefined));
      expect(result.current.canAccess("/presidencia")).toBe(false);
    });

    it("deniega todo acceso si el rol no existe en la matriz (deny-by-default)", async () => {
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
    it("retorna la primera ruta del rol", async () => {
      const { result } = await renderLoaded("SUPERADMIN");
      expect(result.current.firstAllowedRoute("SUPERADMIN")).toBe("/presidencia");
    });

    it("retorna null si el argumento es undefined", async () => {
      const { result } = await renderLoaded("SUPERADMIN");
      expect(result.current.firstAllowedRoute(undefined)).toBeNull();
    });

    it("retorna null si el rol no existe", async () => {
      const { result } = await renderLoaded("SUPERADMIN");
      expect(result.current.firstAllowedRoute("NO_EXISTE")).toBeNull();
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
