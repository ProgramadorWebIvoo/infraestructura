/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Barra de navegación lateral: brand, links por rol, dropdown de configuración
 * y footer de usuario/logout. Envuelta en memo — con los callbacks estables del
 * layout, no se re-renderiza al cambiar de ruta.
 */

import { memo } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "motion/react";
import {
  Building2,
  TrendingUp,
  CheckSquare,
  FileSearch,
  Users,
  DollarSign,
  UserCog,
  X,
  LogOut,
  ChevronRight,
} from "lucide-react";
import ConfigDropdown from "./ConfigDropdown";
import { navLinkClass, sidebarIconClass, sidebarTextClass } from "./sidebarNavClasses";

interface SidebarNavProps {
  isOpen: boolean;
  onClose: () => void;
  user: { name: string; email: string } | null;
  onLogout: () => void;
  canAccess: (path: string) => boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// ─── User initials helper ────────────────────────────────────────────────────
const getUserInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

// ─── Component ───────────────────────────────────────────────────────────────
function SidebarNav({ isOpen, onClose, user, onLogout, canAccess, isCollapsed, onToggleCollapse }: SidebarNavProps) {
  const userInitials = user?.name ? getUserInitials(user.name) : "?";

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-950/60 z-50 transition-opacity duration-300 ease-out lg:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar navigation */}
      <aside
        className={`fixed inset-y-0 left-0 ${isCollapsed ? "w-16" : "w-64"} bg-[#0F172A] text-white border-r border-slate-800/80 z-50 flex flex-col transition-[width,transform,translate] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform-gpu lg:translate-x-0 lg:static lg:h-screen lg:sticky lg:top-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* ── Sidebar Header (Logo/Brand) ─────────────────────────────────── */}
        <div className={`relative border-b border-slate-800/60 shrink-0 overflow-hidden ${isCollapsed ? "py-3" : "p-3"}`}>
          {/* Ambient atmospheric light */}
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-indigo-500/5 pointer-events-none" />

          {/* Subtle top edge highlight */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-emerald-500/15 to-transparent pointer-events-none" />

          <div className={`flex items-center relative ${isCollapsed ? "justify-center" : "justify-between"}`}>
            <div className={`flex items-center ${isCollapsed ? "" : "gap-3"}`}>
              {/* Logo icon */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-white/12 ring-inset">
                  <Building2 className="h-5 w-5 text-white stroke-[2.5]" />
                </div>
              </div>

              {/* Wordmark + tagline */}
              {!isCollapsed && (
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black tracking-tight text-emerald-400 leading-none font-brand">IVOO</span>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.18em] leading-none">Gestión</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 tracking-wide leading-tight">
                    Construyendo con propósito
                  </p>
                </div>
              )}
            </div>

            <button
              aria-label="Cerrar menú lateral"
              className="lg:hidden text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors duration-200 self-start"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Sidebar Collapse Button ─────────────────────────────────── */}
        <button
          aria-label={isCollapsed ? "Expandir barra de navegación" : "Minimizar barra de navegación"}
          onClick={onToggleCollapse}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 hidden lg:flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <motion.div animate={{ rotate: isCollapsed ? 0 : 180 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
            <ChevronRight />
          </motion.div>
        </button>

        {/* ── Sidebar Navigation Items ────────────────────────────────────── */}
        <nav aria-label="Menú principal" className="sidebar-scrollbar flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {canAccess("/presidencia") && (
            <NavLink
              to="/presidencia"
              id="sidebar-presidencia"
              onClick={onClose}
              className={navLinkClass("bg-slate-800", "border-sky-400", isCollapsed)}
              title="Presidencia"
            >
              {({ isActive }) => (
                <>
                  <TrendingUp className={sidebarIconClass(isActive, "text-sky-400")} />
                  <span className={sidebarTextClass(isCollapsed)}>Presidencia</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/infraestructura") && (
            <NavLink
              to="/infraestructura"
              id="sidebar-infraestructura"
              onClick={onClose}
              className={navLinkClass("bg-sky-500", "border-sky-400", isCollapsed)}
              title="Infraestructura"
            >
              {({ isActive }) => (
                <>
                  <Building2 className={sidebarIconClass(isActive)} />
                  <span className={sidebarTextClass(isCollapsed)}>Infra / Mant</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/cierre-obra") && (
            <NavLink
              to="/cierre-obra"
              id="sidebar-cierre"
              onClick={onClose}
              className={navLinkClass("bg-blue-600", "border-blue-400", isCollapsed)}
              title="Cierre de Obra"
            >
              {({ isActive }) => (
                <>
                  <CheckSquare className={sidebarIconClass(isActive)} />
                  <span className={sidebarTextClass(isCollapsed)}>Cierre Obra</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/procura") && (
            <NavLink
              to="/procura"
              id="sidebar-procura"
              onClick={onClose}
              className={navLinkClass("bg-purple-600", "border-purple-400", isCollapsed)}
              title="Procura"
            >
              {({ isActive }) => (
                <>
                  <FileSearch className={sidebarIconClass(isActive)} />
                  <span className={sidebarTextClass(isCollapsed)}>Procura</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/analistas") && (
            <NavLink
              to="/analistas"
              id="sidebar-analistas"
              onClick={onClose}
              className={navLinkClass("bg-emerald-600", "border-emerald-400", isCollapsed)}
              title="Analistas"
            >
              {({ isActive }) => (
                <>
                  <Users className={sidebarIconClass(isActive)} />
                  <span className={sidebarTextClass(isCollapsed)}>Analistas</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/finanzas") && (
            <NavLink
              to="/finanzas"
              id="sidebar-finanzas"
              onClick={onClose}
              className={navLinkClass("bg-rose-600", "border-rose-400", isCollapsed)}
              title="Finanzas"
            >
              {({ isActive }) => (
                <>
                  <DollarSign className={sidebarIconClass(isActive)} />
                  <span className={sidebarTextClass(isCollapsed)}>Finanzas</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/catalogos") && (
            <NavLink
              to="/catalogos"
              id="sidebar-catalogos"
              onClick={onClose}
              className={navLinkClass("bg-slate-800", "border-slate-400", isCollapsed)}
              title="Catalogos"
            >
              {({ isActive }) => (
                <>
                  <UserCog className={sidebarIconClass(isActive, "text-slate-300")} />
                  <span className={sidebarTextClass(isCollapsed)}>Proveedores</span>
                </>
              )}
            </NavLink>
          )}

          {/* ── Configuration Dropdown ────────────────────────────────────── */}
          {canAccess("/usuarios") && <ConfigDropdown isCollapsed={isCollapsed} onClose={onClose} />}
        </nav>

        {/* ── Sidebar Footer ──────────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-800/80 shrink-0 space-y-2">
          {/* User info */}
          {user && (
            <div className={`flex items-center py-2 rounded-xl text-xs ${isCollapsed ? "justify-center px-0" : "gap-3 px-3"}`}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-[11px] font-black text-white shrink-0 ring-1 ring-white/10 shadow-sm">
                {userInitials}
              </div>
              <div className={`${sidebarTextClass(isCollapsed)} min-w-0 flex-1`}>
                <p className="text-slate-200 font-bold truncate leading-tight">{user.name}</p>
                <p className="text-[11px] text-slate-500 font-mono truncate leading-tight mt-0.5">{user.email}</p>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            id="btn-logout"
            role="menuitem"
            onClick={onLogout}
            className={`group w-full flex items-center rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-slate-400 hover:bg-slate-900/50 hover:text-white ${
              isCollapsed ? "justify-center gap-0 px-0 py-2.5" : "gap-3 px-3 py-2.5 hover:translate-x-0.5"
            }`}
          >
            <LogOut className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 ${isCollapsed ? "" : "group-hover:translate-x-0.5"}`} />
            <span className={sidebarTextClass(isCollapsed)}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default memo(SidebarNav);
