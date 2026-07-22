import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Building2,
  TrendingUp,
  CheckSquare,
  FileSearch,
  Users,
  DollarSign,
  Settings,
  X,
  LogOut,
  UserCog,
  ChevronDown,
  Package,
  Brain,
} from "lucide-react";

interface SidebarNavProps {
  isOpen: boolean;
  onClose: () => void;
  user: { name: string; email: string } | null;
  onLogout: () => void;
  canAccess: (path: string) => boolean;
}

// ─── Navigation link class factory ───────────────────────────────────────────
const navLinkClass = (activeBg: string, borderColor: string) =>
  ({ isActive }: { isActive: boolean }) =>
    `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border-l-2 ${
      isActive
        ? `${activeBg} text-white ${borderColor} shadow-sm font-black`
        : "border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-white hover:translate-x-0.5"
    }`;

const sidebarIconClass = (isActive: boolean, activeClass = "!text-white") =>
  `h-[18px] w-[18px] shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:rotate-[3deg] ${
    isActive ? activeClass : "text-slate-400 group-hover:text-white"
  }`;

// ─── User initials helper ────────────────────────────────────────────────────
const getUserInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

// ─── Component ───────────────────────────────────────────────────────────────
export default function SidebarNav({ isOpen, onClose, user, onLogout, canAccess }: SidebarNavProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const userInitials = user?.name ? getUserInitials(user.name) : "?";

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 transition-opacity duration-300 ease-out lg:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar navigation */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-[#0F172A] text-white border-r border-slate-800/80 z-50 flex flex-col transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:h-screen lg:sticky lg:top-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* ── Sidebar Header (Logo/Brand) ─────────────────────────────────── */}
        <div className="relative p-6 border-b border-slate-800/80 shrink-0 overflow-hidden">
          {/* Gradient blobs — depth layers */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-indigo-500/8 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              {/* Logo icon with live indicator */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-1 ring-white/15">
                  <Building2 className="h-5 w-5 text-white stroke-[2.5]" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0F172A] shadow-xs" />
              </div>

              {/* Wordmark + tagline */}
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black tracking-tight text-emerald-400 leading-none font-brand">IVOO</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em] leading-none">Gestión</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5 tracking-wide">
                  Construyendo con propósito
                </p>
              </div>
            </div>

            <button
              aria-label="Cerrar menú lateral"
              className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors duration-200 self-start"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Sidebar Navigation Items ────────────────────────────────────── */}
        <nav className="sidebar-scrollbar flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest px-3 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500/60 animate-pulse" />
            Flujos de Trabajo
          </div>

          {canAccess("/presidencia") && (
            <NavLink
              to="/presidencia"
              id="sidebar-presidencia"
              onClick={onClose}
              className={navLinkClass("bg-slate-800", "border-sky-400")}
            >
              {({ isActive }) => (
                <>
                  <TrendingUp className={sidebarIconClass(isActive, "text-sky-400")} />
                  <span>Presidencia</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/infraestructura") && (
            <NavLink
              to="/infraestructura"
              id="sidebar-infraestructura"
              onClick={onClose}
              className={navLinkClass("bg-sky-500", "border-sky-400")}
            >
              {({ isActive }) => (
                <>
                  <Building2 className={sidebarIconClass(isActive)} />
                  <span>Infra / Mant</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/cierre-obra") && (
            <NavLink
              to="/cierre-obra"
              id="sidebar-cierre"
              onClick={onClose}
              className={navLinkClass("bg-blue-600", "border-blue-400")}
            >
              {({ isActive }) => (
                <>
                  <CheckSquare className={sidebarIconClass(isActive)} />
                  <span>Cierre Obra</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/procura") && (
            <NavLink
              to="/procura"
              id="sidebar-procura"
              onClick={onClose}
              className={navLinkClass("bg-purple-600", "border-purple-400")}
            >
              {({ isActive }) => (
                <>
                  <FileSearch className={sidebarIconClass(isActive)} />
                  <span>Procura</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/analistas") && (
            <NavLink
              to="/analistas"
              id="sidebar-analistas"
              onClick={onClose}
              className={navLinkClass("bg-emerald-600", "border-emerald-400")}
            >
              {({ isActive }) => (
                <>
                  <Users className={sidebarIconClass(isActive)} />
                  <span>Analistas</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/finanzas") && (
            <NavLink
              to="/finanzas"
              id="sidebar-finanzas"
              onClick={onClose}
              className={navLinkClass("bg-rose-600", "border-rose-400")}
            >
              {({ isActive }) => (
                <>
                  <DollarSign className={sidebarIconClass(isActive)} />
                  <span>Finanzas</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/catalogos") && (
            <NavLink
              to="/catalogos"
              id="sidebar-catalogos"
              onClick={onClose}
              className={navLinkClass("bg-slate-800", "border-slate-400")}
            >
              {({ isActive }) => (
                <>
                  <UserCog className={sidebarIconClass(isActive, "text-slate-300")} />
                  <span>Proveedores</span>
                </>
              )}
            </NavLink>
          )}

          {/* ── Configuration Dropdown ────────────────────────────────────── */}
          {canAccess("/usuarios") && (
            <div className="space-y-0.5">
              <button
                onClick={() => setIsConfigOpen((prev) => !prev)}
                className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border-l-2 border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-white hover:translate-x-0.5 w-full text-left"
              >
                <Settings className="h-[18px] w-[18px] shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:rotate-[3deg] text-slate-400 group-hover:text-white" />
                <span className="flex-1">Configuración</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isConfigOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isConfigOpen && (
                <div className="ml-3 space-y-0.5 border-l border-slate-800/60 pl-3 pt-0.5">
                  {/* Usuarios */}
                  <NavLink
                    to="/usuarios"
                    id="sidebar-usuarios"
                    onClick={onClose}
                    className={navLinkClass("bg-sky-500", "border-sky-400")}
                  >
                    {({ isActive }) => (
                      <>
                        <Users className={sidebarIconClass(isActive)} />
                        <span>Usuarios</span>
                      </>
                    )}
                  </NavLink>

                  {/* Proveedores (pending) */}
                  <span
                    className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold border-l-2 border-transparent text-slate-600 opacity-50 cursor-not-allowed select-none"
                    title="Próximamente"
                  >
                    <UserCog className="h-[18px] w-[18px] shrink-0 text-slate-600" />
                    <span className="flex-1">Proveedores</span>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">Próx</span>
                  </span>

                  {/* Material (pending) */}
                  <span
                    className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold border-l-2 border-transparent text-slate-600 opacity-50 cursor-not-allowed select-none"
                    title="Próximamente"
                  >
                    <Package className="h-[18px] w-[18px] shrink-0 text-slate-600" />
                    <span className="flex-1">Material</span>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">Próx</span>
                  </span>

                  {/* IA Models (pending) */}
                  <span
                    className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold border-l-2 border-transparent text-slate-600 opacity-50 cursor-not-allowed select-none"
                    title="Próximamente"
                  >
                    <Brain className="h-[18px] w-[18px] shrink-0 text-slate-600" />
                    <span className="flex-1">IA Models</span>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">Próx</span>
                  </span>
                </div>
              )}
            </div>
          )}

          
        </nav>

        {/* ── Sidebar Footer ──────────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-800/80 shrink-0 space-y-2">
          {/* User info */}
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-[11px] font-black text-white shrink-0 ring-1 ring-white/10 shadow-sm">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-slate-200 font-bold truncate leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-500 font-mono truncate leading-tight mt-0.5">{user.email}</p>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            id="btn-logout"
            onClick={onLogout}
            className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-slate-400 hover:bg-slate-900/50 hover:text-white hover:translate-x-0.5"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
