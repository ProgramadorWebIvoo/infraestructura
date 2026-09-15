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

import { memo, useRef } from "react";
import { NavLink } from "react-router-dom";
import { MotionConfig } from "motion/react";
import {
  Building2,
  TrendingUp,
  CheckSquare,
  FileSearch,
  Users,
  DollarSign,
  UserCog,
  Settings,
  X,
  LogOut,
  ChevronRight,
  House,
  BanknoteArrowDown
} from "lucide-react";
import SidebarTip from "./SidebarTip";
import SidebarCollapseHint from "./SidebarCollapseHint";
import NotificationBell from "./NotificationBell";
import RoleBadge from "./RoleBadge";
import ExchangeRatesSidebarSection from "./ExchangeRatesSidebarSection";
import { navLinkClass, sidebarIconClass, sidebarTextClass, SIDEBAR_FOCUS_RING } from "./sidebarNavClasses";
import { getUserInitials } from "@/utils";
import { usePrefetchOnIntent } from "@/hooks/usePrefetchOnIntent";
import { ROUTES } from "@/routes";

interface SidebarNavProps {
  isOpen: boolean;
  onClose: () => void;
  user: { name: string; email: string } | null;
  activeRole: string;
  onLogout: () => void;
  canAccess: (path: string) => boolean;
  /** Sentinel en memoria de useAuth() — ver usePrefetchOnIntent para por qué hace falta acá. */
  authToken: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
function SidebarNav({ isOpen, onClose, user, activeRole, onLogout, canAccess, authToken, isCollapsed, onToggleCollapse }: SidebarNavProps) {
  // Pre-fetch en hover/focus: un handler por ruta del sidebar (ver
  // usePrefetchOnIntent — debounced, respeta saveData/2G, no compite con la
  // navegación real). Los hooks de React no pueden llamarse condicionalmente
  // (ver CLAUDE.md §7 error #1), así que se piden TODOS acá arriba, sin
  // importar si `canAccess` termina ocultando ese link — el propio hook ya
  // es un no-op barato si nunca se dispara el hover.
  const prefetchPresidencia = usePrefetchOnIntent(ROUTES.PRESIDENCIA, authToken);
  const prefetchMarketing = usePrefetchOnIntent(ROUTES.MARKETING, authToken);
  const prefetchInfraestructura = usePrefetchOnIntent(ROUTES.INFRAESTRUCTURA, authToken);
  const prefetchCierreObra = usePrefetchOnIntent(ROUTES.CIERRE_OBRA, authToken);
  const prefetchProcura = usePrefetchOnIntent(ROUTES.PROCURA, authToken);
  const prefetchAnalistas = usePrefetchOnIntent(ROUTES.ANALISTAS, authToken);
  const prefetchFinanzas = usePrefetchOnIntent(ROUTES.FINANZAS, authToken);
  const prefetchCatalogos = usePrefetchOnIntent(ROUTES.CATALOGOS, authToken);
  const prefetchConfigApp = usePrefetchOnIntent(ROUTES.CONFIG_APP, authToken);

  const userInitials = user?.name ? getUserInitials(user.name) : "?";
  const collapseLabel = isCollapsed ? "Expandir barra de navegación" : "Minimizar barra de navegación";
  const collapseButtonRef = useRef<HTMLButtonElement>(null);

  // isCollapsed es una preferencia de desktop (persistida en localStorage) que
  // no debe aplicarse al drawer mobile: cuando isOpen es true, el usuario abrió
  // el menú mobile y espera verlo a ancho completo, sin importar cómo haya
  // quedado el rail de desktop la última vez. El botón de colapsar (lg:flex,
  // oculto en mobile) sigue leyendo isCollapsed real, no este valor derivado.
  const effectiveCollapsed = isCollapsed && !isOpen;

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
      {/* isCollapsed (rail angosto) es una preferencia exclusiva de desktop
          (persistida en localStorage) — en mobile el drawer siempre debe abrir
          a ancho completo (w-64), por eso el ancho colapsado va detrás de lg:.
          Todo el contenido visual usa effectiveCollapsed (isCollapsed && !isOpen)
          por la misma razón — ver definición arriba. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-surface-inverted text-white border-r border-slate-800/80 transition-[width,transform,translate,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu
          w-64 ${isCollapsed ? "lg:w-16" : "lg:w-64"}
          ${isOpen ? "translate-x-0 shadow-2xl shadow-slate-950/50" : "-translate-x-full shadow-none"}
          lg:translate-x-0 lg:shadow-none lg:static lg:h-screen lg:sticky lg:top-0`}
      >
        {/* ── Sidebar Header (Logo/Brand) ─────────────────────────────────── */}
        {/* Sin overflow-hidden: el dropdown de NotificationBell necesita desbordar
            este contenedor para no quedar recortado (antes vivía en el footer). */}
        <div className={`group/header relative border-b border-slate-800/60 shrink-0 ${effectiveCollapsed ? "py-3" : "p-3"}`}>
          {/* Ambient atmospheric light */}
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-indigo-500/5 pointer-events-none" />

          {/* Subtle top edge highlight */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-emerald-500/15 to-transparent pointer-events-none" />

          <div className={`flex items-center relative ${effectiveCollapsed ? "justify-center" : "justify-between"}`}>
            {effectiveCollapsed ? (
              // Colapsado: solo el ícono de expandir, sin el tile de marca
              // (casa con fondo verde) que ocupaba este lugar antes — el
              // rail angosto no necesita reafirmar la marca, ya la vio
              // expandida; este espacio es puramente funcional.
              <SidebarTip label={collapseLabel} disabled={!effectiveCollapsed}>
                <button
                  ref={collapseButtonRef}
                  aria-label={collapseLabel}
                  aria-expanded={!isCollapsed}
                  onClick={onToggleCollapse}
                  className={`hidden lg:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 cursor-pointer transition-colors duration-200 hover:text-white hover:bg-slate-800/60 focus-visible:outline-none focus-visible:ring-2 ${SIDEBAR_FOCUS_RING} focus-visible:ring-offset-2 focus-visible:ring-offset-surface-inverted`}
                >
                  <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </SidebarTip>
            ) : (
              <SidebarTip label="IVOO GESTIÓN" disabled={!effectiveCollapsed}>
                <div className="flex items-center min-w-0 h-10 gap-3">
                  <div className="relative shrink-0 overflow-hidden">
                    <img src="/ivoo_logoo.svg" alt="IVOO" className="block h-9 w-auto" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.18em] leading-none">
                    Gestión
                  </span>
                </div>
              </SidebarTip>
            )}

            {!effectiveCollapsed && (
              // Expandido: el botón de colapso solo aparece al pasar el mouse
              // por la fila del header (o con teclado, vía focus-within) —
              // discreto el resto del tiempo, visible cuando el usuario está
              // mirando esa zona (patrón Gemini/ChatGPT).
              <button
                ref={collapseButtonRef}
                aria-label={collapseLabel}
                aria-expanded={!isCollapsed}
                onClick={onToggleCollapse}
                className={`hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 opacity-0 transition-all duration-200 cursor-pointer hover:text-white hover:bg-slate-800/60 group-hover/header:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 ${SIDEBAR_FOCUS_RING} focus-visible:ring-offset-2 focus-visible:ring-offset-surface-inverted`}
              >
                <ChevronRight className="h-4 w-4 rotate-180" strokeWidth={2.5} />
              </button>
            )}

            <button
              aria-label="Cerrar menú lateral"
              className={`lg:hidden text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors duration-200 self-start focus-visible:outline-none focus-visible:ring-2 ${SIDEBAR_FOCUS_RING}`}
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <SidebarCollapseHint anchorRef={collapseButtonRef} enabled={!isOpen} />

          {/* Fila propia para rol activo + notificaciones: en colapsado el rail
              de 64px no tiene espacio para el logo y la campana lado a lado en
              la fila de arriba, así que ambos bajan aquí, siempre centrados.
              El badge usa sidebarTextClass (fade, no mount/unmount) para evitar
              el "salto" mientras el ancho del rail todavía está animando.
              Oculta en mobile (hidden lg:flex): ahí MobileTopBar ya muestra rol
              y campana de forma siempre accesible sin abrir el drawer; mostrar
              ambos también aquí duplicaría la campana cuando el drawer se abre. */}
          <div className={`relative mt-2.5 hidden lg:flex items-center ${effectiveCollapsed ? "justify-center" : "justify-between gap-2"}`}>
            <div className={sidebarTextClass(effectiveCollapsed, true)}>
              <RoleBadge role={activeRole} variant="dark" className="w-full justify-center" />
            </div>
            <SidebarTip label="Notificaciones" disabled={!effectiveCollapsed}>
              <NotificationBell variant="dark" align="left-start" />
            </SidebarTip>
          </div>
        </div>

        {/* ── Sidebar Navigation Items ────────────────────────────────────── */}
        <nav aria-label="Menú principal" className={`sidebar-scrollbar flex-1 overflow-y-auto py-6 space-y-1 ${effectiveCollapsed ? "px-2" : "px-4"}`}>
          <SidebarTip label="Inicio" disabled={!effectiveCollapsed}>
            <NavLink
              to="/"
              id="sidebar-home"
              end
              onClick={onClose}
              className={navLinkClass("neutral", effectiveCollapsed)}
            >
              {({ isActive }) => (
                <>
                  <House className={sidebarIconClass(isActive)} />
                  <span className={sidebarTextClass(effectiveCollapsed)}>Inicio</span>
                </>
              )}
            </NavLink>
          </SidebarTip>

          {canAccess("/presidencia") && (
            <SidebarTip label="Presidencia" disabled={!effectiveCollapsed}>
              <NavLink
                to="/presidencia"
                id="sidebar-presidencia"
                onClick={onClose}
                onMouseEnter={prefetchPresidencia.onMouseEnter}
                onFocus={prefetchPresidencia.onFocus}
                onMouseLeave={prefetchPresidencia.onMouseLeave}
                onBlur={prefetchPresidencia.onBlur}
                className={navLinkClass("brand", effectiveCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    <TrendingUp className={sidebarIconClass(isActive)} />
                    <span className={sidebarTextClass(effectiveCollapsed)}>Presidencia</span>
                  </>
                )}
              </NavLink>
            </SidebarTip>
          )}

          {canAccess("/marketing") && (
            <SidebarTip label='Marketing' disabled={!effectiveCollapsed}>
              <NavLink
                to='/marketing'
                id="sidebar-marketing"
                onClick={onClose}
                onMouseEnter={prefetchMarketing.onMouseEnter}
                onFocus={prefetchMarketing.onFocus}
                onMouseLeave={prefetchMarketing.onMouseLeave}
                onBlur={prefetchMarketing.onBlur}
                className={navLinkClass('warning', effectiveCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    <BanknoteArrowDown className={sidebarIconClass(isActive)}/>
                    <span className={sidebarTextClass(effectiveCollapsed)}>Marketing</span>
                  </>
                )}
              </NavLink>
            </SidebarTip>
          )}

          {canAccess("/infraestructura") && (
            <SidebarTip label="Infra / Mant" disabled={!effectiveCollapsed}>
              <NavLink
                to="/infraestructura"
                id="sidebar-infraestructura"
                onClick={onClose}
                onMouseEnter={prefetchInfraestructura.onMouseEnter}
                onFocus={prefetchInfraestructura.onFocus}
                onMouseLeave={prefetchInfraestructura.onMouseLeave}
                onBlur={prefetchInfraestructura.onBlur}
                className={navLinkClass("info", effectiveCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    <Building2 className={sidebarIconClass(isActive)} />
                    <span className={sidebarTextClass(effectiveCollapsed)}>Infra / Mant</span>
                  </>
                )}
              </NavLink>
            </SidebarTip>
          )}

          {canAccess("/cierre-obra") && (
            <SidebarTip label="Cierre de Obra" disabled={!effectiveCollapsed}>
              <NavLink
                to="/cierre-obra"
                id="sidebar-cierre"
                onClick={onClose}
                onMouseEnter={prefetchCierreObra.onMouseEnter}
                onFocus={prefetchCierreObra.onFocus}
                onMouseLeave={prefetchCierreObra.onMouseLeave}
                onBlur={prefetchCierreObra.onBlur}
                className={navLinkClass("brand", effectiveCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    <CheckSquare className={sidebarIconClass(isActive)} />
                    <span className={sidebarTextClass(effectiveCollapsed)}>Cierre Obra</span>
                  </>
                )}
              </NavLink>
            </SidebarTip>
          )}

          {canAccess("/procura") && (
            <SidebarTip label="Procura" disabled={!effectiveCollapsed}>
              <NavLink
                to="/procura"
                id="sidebar-procura"
                onClick={onClose}
                onMouseEnter={prefetchProcura.onMouseEnter}
                onFocus={prefetchProcura.onFocus}
                onMouseLeave={prefetchProcura.onMouseLeave}
                onBlur={prefetchProcura.onBlur}
                className={navLinkClass("info", effectiveCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    <FileSearch className={sidebarIconClass(isActive)} />
                    <span className={sidebarTextClass(effectiveCollapsed)}>Procura</span>
                  </>
                )}
              </NavLink>
            </SidebarTip>
          )}

          {canAccess("/analistas") && (
            <SidebarTip label="Analistas" disabled={!effectiveCollapsed}>
              <NavLink
                to="/analistas"
                id="sidebar-analistas"
                onClick={onClose}
                onMouseEnter={prefetchAnalistas.onMouseEnter}
                onFocus={prefetchAnalistas.onFocus}
                onMouseLeave={prefetchAnalistas.onMouseLeave}
                onBlur={prefetchAnalistas.onBlur}
                className={navLinkClass("success", effectiveCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    <Users className={sidebarIconClass(isActive)} />
                    <span className={sidebarTextClass(effectiveCollapsed)}>Analistas</span>
                  </>
                )}
              </NavLink>
            </SidebarTip>
          )}

          {canAccess("/finanzas") && (
            <SidebarTip label="Finanzas" disabled={!effectiveCollapsed}>
              <NavLink
                to="/finanzas"
                id="sidebar-finanzas"
                onClick={onClose}
                onMouseEnter={prefetchFinanzas.onMouseEnter}
                onFocus={prefetchFinanzas.onFocus}
                onMouseLeave={prefetchFinanzas.onMouseLeave}
                onBlur={prefetchFinanzas.onBlur}
                className={navLinkClass("danger", effectiveCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    <DollarSign className={sidebarIconClass(isActive)} />
                    <span className={sidebarTextClass(effectiveCollapsed)}>Finanzas</span>
                  </>
                )}
              </NavLink>
            </SidebarTip>
          )}

          {canAccess("/catalogos") && (
            <SidebarTip label="Proveedores" disabled={!effectiveCollapsed}>
              <NavLink
                to="/catalogos"
                id="sidebar-catalogos"
                onClick={onClose}
                onMouseEnter={prefetchCatalogos.onMouseEnter}
                onFocus={prefetchCatalogos.onFocus}
                onMouseLeave={prefetchCatalogos.onMouseLeave}
                onBlur={prefetchCatalogos.onBlur}
                className={navLinkClass("neutral", effectiveCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    <UserCog className={sidebarIconClass(isActive)} />
                    <span className={sidebarTextClass(effectiveCollapsed)}>Proveedores</span>
                  </>
                )}
              </NavLink>
            </SidebarTip>
          )}

          {/* ── Configuración ─────────────────────────────────────────────── */}
          {/* Un solo ítem — antes era un dropdown con 5 rutas separadas
              (Usuarios, Proveedores, Material, Modelos de IA, Configuración
              App); ahora esas 4 vistas viven como tabs dentro de ConfigAppPanel,
              así que basta un NavLink directo a /config-app. Se muestra si el
              usuario tiene acceso a esa ruta o a cualquiera de las que ahora
              son tabs suyas. */}
          {/* Los 4 paths "/usuarios", "/config-proveedores", etc. ya no son
              rutas del router (viven como tabs), pero siguen siendo los
              identificadores de vista que devuelve el backend en
              /api/auth/permissions — por eso se siguen usando como strings
              literales acá en vez de vía ROUTES (que ya no los expone). */}
          {(canAccess(ROUTES.CONFIG_APP) ||
            canAccess("/usuarios") ||
            canAccess("/config-proveedores") ||
            canAccess("/config-materiales") ||
            canAccess("/config-ia")) && (
            <SidebarTip label="Configuración" disabled={!effectiveCollapsed}>
              <NavLink
                to={ROUTES.CONFIG_APP}
                id="sidebar-config-app"
                onClick={onClose}
                onMouseEnter={prefetchConfigApp.onMouseEnter}
                onFocus={prefetchConfigApp.onFocus}
                onMouseLeave={prefetchConfigApp.onMouseLeave}
                onBlur={prefetchConfigApp.onBlur}
                className={navLinkClass("neutral", effectiveCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    <Settings className={sidebarIconClass(isActive)} />
                    <span className={sidebarTextClass(effectiveCollapsed)}>Configuración</span>
                  </>
                )}
              </NavLink>
            </SidebarTip>
          )}
        </nav>

        {/* ── Exchange Rates Section ───────────────────────────────────────── */}
        <ExchangeRatesSidebarSection userRole={activeRole} isCollapsed={effectiveCollapsed} />

        {/* ── Sidebar Footer ──────────────────────────────────────────────── */}
        <div className={`border-t border-slate-800/80 shrink-0 space-y-2 ${effectiveCollapsed ? "p-2" : "p-4"}`}>
          {/* User info */}
          {user && (
            <div className={`flex items-center py-2 rounded-xl text-xs ${effectiveCollapsed ? "justify-center px-0" : "gap-3 px-3"}`}>
              <SidebarTip
                label={
                  <>
                    <span className="block text-slate-100">{user.name}</span>
                    <span className="block text-[10px] font-mono font-normal text-slate-400">{user.email}</span>
                  </>
                }
                disabled={!effectiveCollapsed}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-[11px] font-black text-white shrink-0 ring-1 ring-white/10 shadow-sm">
                  {userInitials}
                </div>
              </SidebarTip>
              <div className={`${sidebarTextClass(effectiveCollapsed)} min-w-0 flex-1`}>
                <p className="text-slate-200 font-bold truncate leading-tight">{user.name}</p>
                <p className="text-[11px] text-slate-500 font-mono truncate leading-tight mt-0.5">{user.email}</p>
              </div>
            </div>
          )}

          {/* Logout */}
          <SidebarTip label="Cerrar sesión" disabled={!effectiveCollapsed}>
            <button
              id="btn-logout"
              role="menuitem"
              onClick={onLogout}
              className={`group w-full flex items-center rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-slate-400 hover:bg-slate-900/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 ${SIDEBAR_FOCUS_RING} ${
                effectiveCollapsed ? "justify-center gap-0 px-0 py-2.5" : "gap-3 px-3 py-2.5 hover:translate-x-0.5"
              }`}
            >
              <LogOut className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 ${effectiveCollapsed ? "" : "group-hover:translate-x-0.5"}`} />
              <span className={sidebarTextClass(effectiveCollapsed)}>Cerrar Sesión</span>
            </button>
          </SidebarTip>
        </div>
      </aside>
    </MotionConfig>
  );
}

export default memo(SidebarNav);
