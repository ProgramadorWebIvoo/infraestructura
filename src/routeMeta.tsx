/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Metadata por ruta autenticada: nombre visible e ícono. Fuente única usada
 * por el hook de título/favicon dinámico (useDocumentHead) y disponible para
 * mantener el sidebar en sync si se requiere en el futuro.
 */

import type { LucideIcon } from "lucide-react";
import {
  TrendingUp,
  Building2,
  CheckSquare,
  FileSearch,
  Users,
  DollarSign,
  UserCog,
  SlidersHorizontal,
  BanknoteArrowDown
} from "lucide-react";
import { ROUTES } from "./routes.tsx";

interface RouteMeta {
  label: string;
  icon: LucideIcon;
  color: string;
}

export const ROUTE_META: Record<string, RouteMeta> = {
  [ROUTES.PRESIDENCIA]: { label: "Presidencia", icon: TrendingUp, color: "#38BDF8" },
  [ROUTES.MARKETING]: {label: "Marketing", icon: BanknoteArrowDown, color: "#f59e0b"},
  [ROUTES.INFRAESTRUCTURA]: { label: "Infra / Mant", icon: Building2, color: "#0EA5E9" },
  [ROUTES.CIERRE_OBRA]: { label: "Auditoría", icon: CheckSquare, color: "#2563EB" },
  [ROUTES.PROCURA]: { label: "Procura", icon: FileSearch, color: "#9333EA" },
  [ROUTES.ANALISTAS]: { label: "Analistas", icon: Users, color: "#059669" },
  [ROUTES.FINANZAS]: { label: "Finanzas", icon: DollarSign, color: "#E11D48" },
  [ROUTES.CATALOGOS]: { label: "Proveedores", icon: UserCog, color: "#CBD5E1" },
  [ROUTES.CONFIG_APP]: { label: "Configuración", icon: SlidersHorizontal, color: "#64748B" },
};

/** Busca metadata por el prefijo de path más específico (para rutas con :params) */
export function getRouteMeta(pathname: string): RouteMeta | null {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname];
  const match = Object.keys(ROUTE_META).find((path) => pathname.startsWith(path));
  return match ? ROUTE_META[match] : null;
}
