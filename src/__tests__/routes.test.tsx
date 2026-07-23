import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { isPublicRoute, ProtectedRoute, ROUTES } from "@/routes";

// ---------------------------------------------------------------------------
// isPublicRoute
// ---------------------------------------------------------------------------

describe("isPublicRoute", () => {
  it("retorna true para REGISTRO_PROVEEDORES", () => {
    expect(isPublicRoute(ROUTES.REGISTRO_PROVEEDORES)).toBe(true);
  });

  it("retorna true para /propuesta-materiales/:token", () => {
    expect(isPublicRoute("/propuesta-materiales/abc-123")).toBe(true);
    expect(isPublicRoute("/propuesta-materiales/any-token-value")).toBe(true);
  });

  it("retorna false para rutas autenticadas", () => {
    expect(isPublicRoute(ROUTES.PRESIDENCIA)).toBe(false);
    expect(isPublicRoute(ROUTES.FINANZAS)).toBe(false);
    expect(isPublicRoute(ROUTES.USUARIOS)).toBe(false);
    expect(isPublicRoute("/")).toBe(false);
  });

  it("retorna false para string vacío", () => {
    expect(isPublicRoute("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ProtectedRoute
// ---------------------------------------------------------------------------

describe("ProtectedRoute", () => {
  it("renderiza children cuando canAccess=true", () => {
    render(
      <MemoryRouter>
        <ProtectedRoute canAccess={true} redirectTo="/login">
          <div data-testid="protected-content">Contenido protegido</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
  });

  it("redirige con Navigate cuando canAccess=false (no renderiza children)", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <ProtectedRoute canAccess={false} redirectTo="/login">
          <div data-testid="protected-content">Contenido protegido</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });
});
