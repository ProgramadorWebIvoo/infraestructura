/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Configuración declarativa del Home por rol: qué KPIs mostrar (derivados
 * de `projects`, ya cargado por App.tsx para toda la app — sin endpoint
 * nuevo) y a qué módulos dar acceso directo. Un rol nuevo, o un cambio de
 * qué status le importa a un rol existente, se resuelve editando este
 * archivo — el componente HomePanel es puro renderizado de esta config.
 *
 * Los mismos cortes de status que cada panel ya usa para sus propios KPIs
 * (CierreObraPanel, ProcuraPanel, FinanzasPanel, AnalistasPanel,
 * InfraestructuraMantenimientoPanel) — ver ese código para el criterio de
 * negocio detrás de cada corte, no reinventado aquí.
 */

import type { ReactNode } from "react";
import {
  Building2,
  CheckSquare,
  ClipboardList,
  DollarSign,
  FileSearch,
  Handshake,
  HardHat,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Wallet,
} from "lucide-react";
import { ROUTES } from "../../routes.tsx";
import { ProjectStatus } from "../../types";
import type { Project } from "../../types";
import type { SemanticColor } from "../../components/UI/colorTokens";

export interface HomeKpi {
  key: string;
  icon: ReactNode;
  label: string;
  compute: (projects: Project[]) => number;
  /** Filtra los proyectos que componen este KPI — permite listarlos, no solo contarlos. */
  filter: (projects: Project[]) => Project[];
  accent: SemanticColor;
  /** Ruta del módulo dueño de este corte — usada por "ver todos". */
  route: string;
}

export interface HomeModuleLink {
  route: string;
  label: string;
  description: string;
  icon: ReactNode;
  accent: SemanticColor;
}

export interface RoleHomeConfig {
  /** Frase corta bajo el saludo — qué hace este rol en el sistema. */
  tagline: string;
  kpis: HomeKpi[];
  modules: HomeModuleLink[];
}

// ---------------------------------------------------------------------------
// Módulos (reusados entre configs — mismo ícono/color que SidebarNav)
// ---------------------------------------------------------------------------

const MODULE_PRESIDENCIA: HomeModuleLink = {
  route: ROUTES.PRESIDENCIA,
  label: "Presidencia",
  description: "Panorama ejecutivo de inversión y avance de obra",
  icon: <TrendingUp className="h-5 w-5" strokeWidth={2.25} />,
  accent: "brand",
};

const MODULE_INFRAESTRUCTURA: HomeModuleLink = {
  route: ROUTES.INFRAESTRUCTURA,
  label: "Infra / Mant",
  description: "Crear y dar seguimiento a peticiones de obra",
  icon: <Building2 className="h-5 w-5" strokeWidth={2.25} />,
  accent: "info",
};

const MODULE_CIERRE_OBRA: HomeModuleLink = {
  route: ROUTES.CIERRE_OBRA,
  label: "Cierre de Obra",
  description: "Revisión técnica y auditoría de finalización",
  icon: <CheckSquare className="h-5 w-5" strokeWidth={2.25} />,
  accent: "brand",
};

const MODULE_PROCURA: HomeModuleLink = {
  route: ROUTES.PROCURA,
  label: "Procura",
  description: "Autorización de inversión y cuadros comparativos",
  icon: <FileSearch className="h-5 w-5" strokeWidth={2.25} />,
  accent: "info",
};

const MODULE_ANALISTAS: HomeModuleLink = {
  route: ROUTES.ANALISTAS,
  label: "Analistas",
  description: "Licitación y carga de propuestas de proveedores",
  icon: <ClipboardList className="h-5 w-5" strokeWidth={2.25} />,
  accent: "success",
};

const MODULE_FINANZAS: HomeModuleLink = {
  route: ROUTES.FINANZAS,
  label: "Finanzas",
  description: "Anticipos, liquidaciones y diario de egresos",
  icon: <DollarSign className="h-5 w-5" strokeWidth={2.25} />,
  accent: "danger",
};

const MODULE_CATALOGOS: HomeModuleLink = {
  route: ROUTES.CATALOGOS,
  label: "Proveedores",
  description: "Directorio y calificación de proveedores registrados",
  icon: <UserCog className="h-5 w-5" strokeWidth={2.25} />,
  accent: "neutral",
};

// ---------------------------------------------------------------------------
// KPIs (derivados de projects — mismos cortes que cada panel dueño)
// ---------------------------------------------------------------------------

/** Azúcar: deriva `compute` de `filter` para no repetir el mismo predicado dos veces. */
function kpi(def: Omit<HomeKpi, "compute">): HomeKpi {
  return { ...def, compute: (p) => def.filter(p).length };
}

const kpiInfraestructura: HomeKpi[] = [
  kpi({
    key: "pending-review",
    icon: <HardHat className="h-4 w-4" strokeWidth={2.25} />,
    label: "En revisión",
    filter: (p) => p.filter((x) => x.status === ProjectStatus.CREADO),
    accent: "info",
    route: ROUTES.INFRAESTRUCTURA,
  }),
  kpi({
    key: "in-execution",
    icon: <Building2 className="h-4 w-4" strokeWidth={2.25} />,
    label: "En ejecución",
    filter: (p) => p.filter((x) => x.status === ProjectStatus.EN_EJECUCION),
    accent: "brand",
    route: ROUTES.INFRAESTRUCTURA,
  }),
];

const kpiCierreObra: HomeKpi[] = [
  kpi({
    key: "pending-review",
    icon: <ClipboardList className="h-4 w-4" strokeWidth={2.25} />,
    label: "Por revisar",
    filter: (p) => p.filter((x) => x.status === ProjectStatus.CREADO),
    accent: "info",
    route: ROUTES.CIERRE_OBRA,
  }),
  kpi({
    key: "under-audit",
    icon: <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />,
    label: "En auditoría de cierre",
    filter: (p) => p.filter((x) => x.status === ProjectStatus.VERIFICANDO_FINALIZACION),
    accent: "success",
    route: ROUTES.CIERRE_OBRA,
  }),
];

const kpiProcura: HomeKpi[] = [
  kpi({
    key: "pending-approval",
    icon: <ClipboardList className="h-4 w-4" strokeWidth={2.25} />,
    label: "Por autorizar",
    filter: (p) => p.filter((x) => x.status === ProjectStatus.REVISADO_CIERRE),
    accent: "info",
    route: ROUTES.PROCURA,
  }),
  kpi({
    key: "comparative",
    icon: <Handshake className="h-4 w-4" strokeWidth={2.25} />,
    label: "Comparativas por evaluar",
    filter: (p) => p.filter((x) => x.status === ProjectStatus.COMPARATIVA_ENVIADA),
    accent: "brand",
    route: ROUTES.PROCURA,
  }),
];

const kpiAnalistas: HomeKpi[] = [
  kpi({
    key: "in-bidding",
    icon: <ClipboardList className="h-4 w-4" strokeWidth={2.25} />,
    label: "En licitación",
    filter: (p) => p.filter((x) => x.status === ProjectStatus.CONFIRMADO_PROCURA),
    accent: "success",
    route: ROUTES.ANALISTAS,
  }),
];

const kpiFinanzas: HomeKpi[] = [
  kpi({
    key: "pending-advances",
    icon: <Wallet className="h-4 w-4" strokeWidth={2.25} />,
    label: "Anticipos pendientes",
    filter: (p) => p.filter((x) => x.status === ProjectStatus.CONTRATADO),
    accent: "danger",
    route: ROUTES.FINANZAS,
  }),
  kpi({
    key: "pending-final",
    icon: <DollarSign className="h-4 w-4" strokeWidth={2.25} />,
    label: "Liquidaciones finales pendientes",
    filter: (p) => p.filter((x) => x.status === ProjectStatus.LISTO_PAGO_FINAL),
    accent: "warning",
    route: ROUTES.FINANZAS,
  }),
];

const kpiGlobal: HomeKpi[] = [
  kpi({
    key: "active",
    icon: <Building2 className="h-4 w-4" strokeWidth={2.25} />,
    label: "Obras activas",
    filter: (p) => p.filter((x) => x.status !== ProjectStatus.COMPLETADO_PAGADO),
    accent: "brand",
    route: ROUTES.PRESIDENCIA,
  }),
  kpi({
    key: "completed",
    icon: <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />,
    label: "Completadas",
    filter: (p) => p.filter((x) => x.status === ProjectStatus.COMPLETADO_PAGADO),
    accent: "success",
    route: ROUTES.PRESIDENCIA,
  }),
];

// ---------------------------------------------------------------------------
// Config por rol
// ---------------------------------------------------------------------------

const ROLE_HOME_CONFIG: Record<string, RoleHomeConfig> = {
  SUPERADMIN: {
    tagline: "Acceso completo a todos los módulos del sistema.",
    kpis: kpiGlobal,
    modules: [MODULE_PRESIDENCIA, MODULE_INFRAESTRUCTURA, MODULE_CIERRE_OBRA, MODULE_PROCURA, MODULE_ANALISTAS, MODULE_FINANZAS, MODULE_CATALOGOS],
  },
  ADMIN: {
    tagline: "Acceso administrativo a los módulos operativos.",
    kpis: kpiGlobal,
    modules: [MODULE_INFRAESTRUCTURA, MODULE_CIERRE_OBRA, MODULE_PROCURA, MODULE_ANALISTAS, MODULE_FINANZAS, MODULE_CATALOGOS],
  },
  PRESIDENCIA: {
    tagline: "Panorama ejecutivo de inversión y avance de obra.",
    kpis: kpiGlobal,
    modules: [MODULE_PRESIDENCIA, MODULE_CATALOGOS],
  },
  INFRAESTRUCTURA: {
    tagline: "Creación y seguimiento de peticiones de obra.",
    kpis: kpiInfraestructura,
    modules: [MODULE_INFRAESTRUCTURA],
  },
  CIERRE_DE_OBRA: {
    tagline: "Revisión técnica y auditoría de finalización de obra.",
    kpis: kpiCierreObra,
    modules: [MODULE_CIERRE_OBRA],
  },
  PROCURA: {
    tagline: "Autorización de inversión y evaluación de comparativas.",
    kpis: kpiProcura,
    modules: [MODULE_PROCURA, MODULE_CATALOGOS],
  },
  MARKETING: {
    tagline: "Gestión de propuestas de procura y proveedores registrados.",
    kpis: kpiProcura,
    modules: [MODULE_PROCURA, MODULE_CATALOGOS],
  },
  ANALISTA: {
    tagline: "Licitación y carga de propuestas de proveedores.",
    kpis: kpiAnalistas,
    modules: [MODULE_ANALISTAS],
  },
  FINANZAS: {
    tagline: "Anticipos, liquidaciones finales y diario de egresos.",
    kpis: kpiFinanzas,
    modules: [MODULE_FINANZAS],
  },
  CATALOGOS: {
    tagline: "Directorio y calificación de proveedores registrados.",
    kpis: kpiGlobal,
    modules: [MODULE_CATALOGOS],
  },
};

const DEFAULT_CONFIG: RoleHomeConfig = {
  tagline: "Bienvenido al sistema de gestión.",
  kpis: kpiGlobal,
  modules: [],
};

export function getRoleHomeConfig(role: string | undefined): RoleHomeConfig {
  if (!role) return DEFAULT_CONFIG;
  return ROLE_HOME_CONFIG[role] ?? DEFAULT_CONFIG;
}
