/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mapa estático ruta → módulo, usado por el tab "Codebase" del DEBUG-MODE
 * (ver DebugCodebasePanel.tsx). Es a mano, no generado desde graphify-out,
 * a propósito: leer el grafo completo en runtime desde el bundle del
 * cliente inflaría el chunk del panel por un dato que cambia poco (17
 * módulos, ver §1 de infraestructura/CLAUDE.md) y que ya está documentado
 * ahí. Si se agrega/renombra un módulo en routes.tsx + AuthenticatedRoutes,
 * actualizar la entrada correspondiente acá.
 */

import { ROUTES } from "@/routes.tsx";

export interface CodebaseRouteInfo {
  /** Componente de vista montado en esta ruta (nombre, no import — ver docblock). */
  component: string;
  /** Ruta del archivo relativa a src/, para abrir directo en el editor. */
  file: string;
  /** Hooks de dominio principales que orquesta este módulo. */
  hooks: string[];
  /** God Nodes (graphify-out/COMPASS.md) que este módulo toca — ver §8 CLAUDE.md frontend. */
  godNodes?: string[];
}

export const CODEBASE_ROUTE_MAP: Record<string, CodebaseRouteInfo> = {
  [ROUTES.HOME]: {
    component: "HomePanel",
    file: "views/HomePanel/index.tsx",
    hooks: ["useHomeAnnouncement"],
  },
  [ROUTES.PRESIDENCIA]: {
    component: "PresidenciaDashboard",
    file: "views/PresidenciaDashboard/index.tsx",
    hooks: ["useProjects"],
    godNodes: ["usePolledFetch"],
  },
  [ROUTES.MARKETING]: {
    component: "UnderConstruction",
    file: "components/UI/UnderConstruction.tsx",
    hooks: [],
  },
  [ROUTES.INFRAESTRUCTURA]: {
    component: "InfraestructuraMantenimientoPanel",
    file: "views/InfraestructuraMantenimientoPanel/index.tsx",
    hooks: ["useProjects", "useCatalog"],
    godNodes: ["apiFetch()", "downloadProjectDocument", "usePolledFetch"],
  },
  [ROUTES.AUDITORIA]: {
    component: "AuditoriaPanel",
    file: "views/AuditoriaPanel/index.tsx",
    hooks: ["useProjects"],
    godNodes: ["handleSave", "downloadProjectDocument"],
  },
  [ROUTES.PROCURA]: {
    component: "ProcuraPanel",
    file: "views/ProcuraPanel/index.tsx",
    hooks: ["useProjects"],
    godNodes: ["handleSave"],
  },
  [ROUTES.ANALISTAS]: {
    component: "AnalistasPanel",
    file: "views/AnalistasPanel/index.tsx",
    hooks: ["useProjects", "useContractors"],
    godNodes: ["handleSave"],
  },
  [ROUTES.FINANZAS]: {
    component: "FinanzasPanel",
    file: "views/FinanzasPanel/index.tsx",
    hooks: ["useProjects"],
    godNodes: ["handleSave"],
  },
  [ROUTES.CATALOGOS]: {
    component: "ProveedoresRegistrados",
    file: "views/ProveedoresRegistrados/index.tsx",
    hooks: ["useContractors"],
  },
  [ROUTES.CONFIG_APP]: {
    component: "ConfigAppPanel",
    file: "views/ConfigAppPanel/index.tsx",
    hooks: ["useAppSettings"],
  },
};

export function getCodebaseRouteInfo(pathname: string): CodebaseRouteInfo | null {
  const exactMatch = CODEBASE_ROUTE_MAP[pathname];
  if (exactMatch) return exactMatch;

  // Rutas con segmentos dinámicos (ej. inspección de proyecto sobre
  // /infraestructura/:id) — matchea por prefijo del path base más largo.
  const candidates = Object.keys(CODEBASE_ROUTE_MAP)
    .filter(route => pathname.startsWith(route) && route !== "/")
    .sort((a, b) => b.length - a.length);

  return candidates.length > 0 ? CODEBASE_ROUTE_MAP[candidates[0]] : null;
}
