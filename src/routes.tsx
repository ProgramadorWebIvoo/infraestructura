/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ═══════════════════════════════════════════════════════════════════
 *  Cómo usar:
 *
 *  1. Importar ROUTES para paths con nombre (nunca strings hardcodeadas)
 *  2. Envolver el elemento de cada ruta auth con <ProtectedRoute>
 *  3. Usar isPublicRoute() en vez de comparar strings a mano
 * ═══════════════════════════════════════════════════════════════════
 */

import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

// ---------------------------------------------------------------------------
// Route path constants
// ---------------------------------------------------------------------------

export const ROUTES = {
  HOME: "/",
  PRESIDENCIA: "/presidencia",
  INFRAESTRUCTURA: "/infraestructura",
  CIERRE_OBRA: "/cierre-obra",
  PROCURA: "/procura",
  ANALISTAS: "/analistas",
  FINANZAS: "/finanzas",
  CATALOGOS: "/catalogos",
  USUARIOS: "/usuarios",
  CONFIG_PROVEEDORES: "/config-proveedores",
  CONFIG_MATERIALES: "/config-materiales",
  CONFIG_IA: "/config-ia",
  REGISTRO_PROVEEDORES: "/registro-proveedores",
  PROPUESTA_MATERIALES: "/propuesta-materiales/:token",
  RESET_PASSWORD: "/reset-password/:token",
} as const;

// ---------------------------------------------------------------------------
// Public route detection
// ---------------------------------------------------------------------------

const PUBLIC_ROUTES = new Set<string>([ROUTES.REGISTRO_PROVEEDORES]);

/**
 * Devuelve true si `path` corresponde a una ruta pública (sin autenticación).
 * Las siguientes condiciones cubren rutas con token dinámico en el path
 * (no podemos listarlas en PUBLIC_ROUTES, que solo admite paths estáticos).
 */
export function isPublicRoute(path: string): boolean {
  return (
    PUBLIC_ROUTES.has(path) ||
    path.startsWith("/propuesta-materiales/") ||
    path.startsWith("/reset-password/")
  );
}

// ---------------------------------------------------------------------------
// Protected route guard
// ---------------------------------------------------------------------------

interface ProtectedRouteProps {
  canAccess: boolean;
  redirectTo: string;
  children: ReactNode;
}

/**
 * Envuelve el elemento de una ruta autenticada.
 * Si `canAccess` es false redirige a `redirectTo` (vía Navigate replace),
 * de lo contrario renderiza children.
 *
 * Uso típico:
 *   <ProtectedRoute canAccess={canAccess(ROUTES.PRESIDENCIA)} redirectTo={fallbackRoute}>
 *     <PresidenciaDashboard ... />
 *   </ProtectedRoute>
 */
export function ProtectedRoute({ canAccess, redirectTo, children }: ProtectedRouteProps) {
  if (!canAccess) {
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
}
