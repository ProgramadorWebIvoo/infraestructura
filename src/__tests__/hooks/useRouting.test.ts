import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRoleAccess, roleAccess } from "@/hooks/useRouting";

describe("useRoleAccess", () => {
  // -----------------------------------------------------------------------
  // canAccess
  // -----------------------------------------------------------------------

  describe("canAccess", () => {
    it("SUPERADMIN accede a todas las rutas", () => {
      const { result } = renderHook(() => useRoleAccess("SUPERADMIN"));

      expect(result.current.canAccess("/presidencia")).toBe(true);
      expect(result.current.canAccess("/infraestructura")).toBe(true);
      expect(result.current.canAccess("/cierre-obra")).toBe(true);
      expect(result.current.canAccess("/procura")).toBe(true);
      expect(result.current.canAccess("/analistas")).toBe(true);
      expect(result.current.canAccess("/finanzas")).toBe(true);
      expect(result.current.canAccess("/catalogos")).toBe(true);
      expect(result.current.canAccess("/usuarios")).toBe(true);
      expect(result.current.canAccess("/config-proveedores")).toBe(true);
      expect(result.current.canAccess("/config-materiales")).toBe(true);
      expect(result.current.canAccess("/config-ia")).toBe(true);
    });

    it("SUPERADMIN NO accede a rutas no listadas", () => {
      const { result } = renderHook(() => useRoleAccess("SUPERADMIN"));

      expect(result.current.canAccess("/no-existe")).toBe(false);
      expect(result.current.canAccess("/login")).toBe(false);
    });

    it("PRESIDENCIA solo accede a presidencia y catalogos", () => {
      const { result } = renderHook(() => useRoleAccess("PRESIDENCIA"));

      expect(result.current.canAccess("/presidencia")).toBe(true);
      expect(result.current.canAccess("/catalogos")).toBe(true);
      expect(result.current.canAccess("/infraestructura")).toBe(false);
      expect(result.current.canAccess("/finanzas")).toBe(false);
    });

    it("returna false si role es undefined", () => {
      const { result } = renderHook(() => useRoleAccess(undefined));

      expect(result.current.canAccess("/presidencia")).toBe(false);
    });

    it("deniega todo acceso si el rol no existe en roleAccess (deny-by-default)", () => {
      // rol no reconocido → sin acceso a ninguna ruta, no hereda de otro rol
      const { result } = renderHook(() => useRoleAccess("ROL_INEXISTENTE"));

      expect(result.current.canAccess("/presidencia")).toBe(false);
      expect(result.current.canAccess("/infraestructura")).toBe(false);
      expect(result.current.canAccess("/finanzas")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // firstAllowedRoute
  // -----------------------------------------------------------------------

  describe("firstAllowedRoute", () => {
    it("retorna la primera ruta del rol", () => {
      const { result } = renderHook(() => useRoleAccess("SUPERADMIN"));

      expect(result.current.firstAllowedRoute("SUPERADMIN")).toBe("/presidencia");
    });

    it("retorna null si el argumento es undefined", () => {
      const { result } = renderHook(() => useRoleAccess("SUPERADMIN"));

      expect(result.current.firstAllowedRoute(undefined)).toBeNull();
    });

    it("retorna null si el rol no existe", () => {
      const { result } = renderHook(() => useRoleAccess("SUPERADMIN"));

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

// ---------------------------------------------------------------------------
// roleAccess (objeto plano, verificación estática)
// ---------------------------------------------------------------------------

describe("roleAccess", () => {
  it("todos los roles tienen al menos una ruta", () => {
    const roles = Object.keys(roleAccess);
    expect(roles.length).toBeGreaterThan(0);

    for (const role of roles) {
      expect(roleAccess[role].length).toBeGreaterThan(0);
    }
  });

  it("SUPERADMIN incluye todas las rutas de ADMIN (y además Presidencia)", () => {
    for (const route of roleAccess["ADMIN"]) {
      expect(roleAccess["SUPERADMIN"]).toContain(route);
    }
    expect(roleAccess["SUPERADMIN"]).toContain("/presidencia");
    expect(roleAccess["ADMIN"]).not.toContain("/presidencia");
  });

  it("todas las rutas empiezan con /", () => {
    for (const routes of Object.values(roleAccess)) {
      for (const route of routes) {
        expect(route.startsWith("/")).toBe(true);
      }
    }
  });
});
