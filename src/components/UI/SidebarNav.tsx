/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Barra de navegación lateral: brand, links por rol, dropdown de configuración
 * y footer de usuario/logout. Envuelta en memo — con los callbacks estables del
 * layout, no se re-renderiza al cambiar de ruta.
 *
 * Colapso: el ancho del rail anima con una curva ease-out-expo; las etiquetas
 * hacen fade direccional (ver sidebarTextClass) y en modo colapsado cada ítem
 * muestra un tooltip flotante (SidebarTip) al hacer hover/focus.
 */

import { memo } from "react";
import { NavLink } from "react-router-dom";
import { MotionConfig, motion } from "motion/react";
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
import SidebarTip from "./SidebarTip";
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
  const collapseLabel = isCollapsed ? "Expandir barra de navegación" : "Minimizar barra de navegación";

  return (
    <MotionConfig reducedMotion="user">
      {/* Mobile Sidebar Backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 bg-slate-950/60 z-50 transition-opacity duration-300 ease-out lg:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0F172A] text-white border-r border-slate-800/80 transition-[width,transform,translate,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu
          ${isCollapsed ? "w-16" : "w-64"}
          ${isOpen ? "translate-x-0 shadow-2xl shadow-slate-950/50" : "-translate-x-full shadow-none"}
          lg:translate-x-0 lg:shadow-none lg:static lg:h-screen lg:sticky lg:top-0`}
      >
        {/* ── Sidebar Header (Logo/Brand) ─────────────────────────────────── */}
        <div className={`relative border-b border-slate-800/60 shrink-0 overflow-hidden ${isCollapsed ? "py-3" : "p-3"}`}>
          {/* Ambient atmospheric light */}
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-indigo-500/5 pointer-events-none" />

          {/* Subtle top edge highlight */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-emerald-500/15 to-transparent pointer-events-none" />

          <div className={`flex items-center relative ${isCollapsed ? "justify-center" : "justify-between"}`}>
            <SidebarTip label="IVOO GESTIÓN" disabled={!isCollapsed}>
              <div className={`flex items-center min-w-0 h-10 ${isCollapsed ? "" : "gap-3"}`}>
                {/* Collapsed: tile de marca; expandido: logo oficial de la empresa (chip 3:1) */}
                {isCollapsed ? (
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-white/12 ring-inset">
                      <Building2 className="h-5 w-5 text-white stroke-[2.5]" />
                    </div>
                  </div>
                ) : (
                  <div className="relative shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15 shadow-lg shadow-emerald-500/20">
                    <img src="/ivoo_logoo.png" alt="IVOO" className="block h-9 w-auto" />
                  </div>
                )}

                {!isCollapsed && (
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.18em] leading-none">
                    Gestión
                  </span>
                )}
              </div>
            </SidebarTip>

            <button
              aria-label="Cerrar menú lateral"
              className="lg:hidden text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors duration-200 self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Sidebar Collapse Button ─────────────────────────────────── */}
        <button
          aria-label={collapseLabel}
          aria-expanded={!isCollapsed}
          title={collapseLabel}
          onClick={onToggleCollapse}
          className="group absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 hidden lg:flex items-center justify-center w-7 h-7 rounded-full bg-slate-800 border border-slate-700/80 text-slate-400 shadow-lg shadow-slate-950/40 ring-1 ring-black/20 transition-all duration-200 hover:text-white hover:bg-slate-700 hover:border-slate-500 hover:shadow-sky-500/20 hover:scale-110 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]"
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 180 }}
            transition={{ type: "spring", stiffness: 300, damping: 22, mass: 0.5 }}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={3} />
          </motion.div>
        </button>

        {/* ── Sidebar Navigation Items ────────────────────────────────────── */}
        <nav aria-label="Menú principal" className={`sidebar-scrollbar flex-1 overflow-y-auto py-6 space-y-1 ${isCollapsed ? "px-2" : "px-4"}`}>
          {canAccess("/presidencia") && (
            <SidebarTip label="Presidencia" disabled={!isCollapsed}>
              <NavLink
                to="/presidencia"
                id="sidebar-presidencia"
                onClick={onClose}
                className={navLinkClass("bg-slate-800", "border-sky-400", isCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    <TrendingUp className={sidebarIconClass(isActive, "text-sky-400")} />
                    <span className={sidebarTextClass(isCollapsed)}>Presidencia</span>
                  </>
                )}
              </NavLink>
            </SidebarTip>
          )}

          {canAccess("/infraestructura") && (
            <SidebarTip label="Infra / Mant" disabled={!isCollapsed}>
              <NavLink
                to="/infraestructura"
                id="sidebar-infraestructura"
                onClick={onClose}
                className={navLinkClass("bg-sky-500", "border-sky-400", isCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    <Building2 className={sidebarIconClass(isActive)} />
                    <span className={sidebarTextClass(isCollapsed)}>Infra / Mant</span>
                  </>
                )}
              </NavLink>
            </SidebarTip>
          )}

          {canAccess("/cierre-obra") && (
            <SidebarTip label="Cierre de Obra" disabled={!isCollapsed}>
              <NavLink
                to="/cierre-obra"
                id="sidebar-cierre"
                onClick={onClose}
                className={navLinkClass("bg-blue-600", "border-blue-400", isCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    <CheckSquare className={sidebarIconClass(isActive)} />
                    <span className={sidebarTextClass(isCollapsed)}>Cierre Obra</span>
                  </>
                )}
              </NavLink>
            </SidebarTip>
          )}

          {canAccess("/procura") && (
            <SidebarTip label="Procura" disabled={!isCollapsed}>
              <NavLink
                to="/procura"
                id="sidebar-procura"
                onClick={onClose}
                className={navLinkClass("bg-purple-600", "border-purple-400", isCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    <FileSearch className={sidebarIconClass(isActive)} />
                    <span className={sidebarTextClass(isCollapsed)}>Procura</span>
                  </>
                )}
              </NavLink>
            </SidebarTip>
          )}

          {canAccess("/analistas") && (
            <SidebarTip label="Analistas" disabled={!isCollapsed}>
              <NavLink
                to="/analistas"
                id="sidebar-analistas"
                onClick={onClose}
                className={navLinkClass("bg-emerald-600", "border-emerald-400", isCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    <Users className={sidebarIconClass(isActive)} />
                    <span className={sidebarTextClass(isCollapsed)}>Analistas</span>
                  </>
                )}
              </NavLink>
            </SidebarTip>
          )}

          {canAccess("/finanzas") && (
            <SidebarTip label="Finanzas" disabled={!isCollapsed}>
              <NavLink
                to="/finanzas"
                id="sidebar-finanzas"
                onClick={onClose}
                className={navLinkClass("bg-rose-600", "border-rose-400", isCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    <DollarSign className={sidebarIconClass(isActive)} />
                    <span className={sidebarTextClass(isCollapsed)}>Finanzas</span>
                  </>
                )}
              </NavLink>
            </SidebarTip>
          )}

          {canAccess("/catalogos") && (
            <SidebarTip label="Proveedores" disabled={!isCollapsed}>
              <NavLink
                to="/catalogos"
                id="sidebar-catalogos"
                onClick={onClose}
                className={navLinkClass("bg-slate-800", "border-slate-400", isCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    <UserCog className={sidebarIconClass(isActive, "text-slate-300")} />
                    <span className={sidebarTextClass(isCollapsed)}>Proveedores</span>
                  </>
                )}
              </NavLink>
            </SidebarTip>
          )}

          {/* ── Configuration Dropdown ────────────────────────────────────── */}
          {canAccess("/usuarios") && <ConfigDropdown isCollapsed={isCollapsed} onClose={onClose} />}
        </nav>

        {/* ── Sidebar Footer ──────────────────────────────────────────────── */}
        <div className={`border-t border-slate-800/80 shrink-0 space-y-2 ${isCollapsed ? "p-2" : "p-4"}`}>
          {/* User info */}
          {user && (
            <div className={`flex items-center py-2 rounded-xl text-xs ${isCollapsed ? "justify-center px-0" : "gap-3 px-3"}`}>
              <SidebarTip
                label={
                  <>
                    <span className="block text-slate-100">{user.name}</span>
                    <span className="block text-[10px] font-mono font-normal text-slate-400">{user.email}</span>
                  </>
                }
                disabled={!isCollapsed}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-[11px] font-black text-white shrink-0 ring-1 ring-white/10 shadow-sm">
                  {userInitials}
                </div>
              </SidebarTip>
              <div className={`${sidebarTextClass(isCollapsed)} min-w-0 flex-1`}>
                <p className="text-slate-200 font-bold truncate leading-tight">{user.name}</p>
                <p className="text-[11px] text-slate-500 font-mono truncate leading-tight mt-0.5">{user.email}</p>
              </div>
            </div>
          )}

          {/* Logout */}
          <SidebarTip label="Cerrar sesión" disabled={!isCollapsed}>
            <button
              id="btn-logout"
              role="menuitem"
              onClick={onLogout}
              className={`group w-full flex items-center rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-slate-400 hover:bg-slate-900/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
                isCollapsed ? "justify-center gap-0 px-0 py-2.5" : "gap-3 px-3 py-2.5 hover:translate-x-0.5"
              }`}
            >
              <LogOut className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 ${isCollapsed ? "" : "group-hover:translate-x-0.5"}`} />
              <span className={sidebarTextClass(isCollapsed)}>Cerrar Sesión</span>
            </button>
          </SidebarTip>
        </div>
      </aside>
    </MotionConfig>
  );
}

export default memo(SidebarNav);
