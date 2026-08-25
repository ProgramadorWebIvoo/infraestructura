/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dropdown de Configuración del sidebar. Vive como componente propio (memo)
 * para que abrir/cerrar el submenú solo re-renderice este subárbol y no los
 * 7 NavLink principales. El submenú se abre como acordeón (altura animada con
 * AnimatePresence) y, en modo colapsado, cada ítem muestra tooltip (SidebarTip).
 */

import { memo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Settings, ChevronDown, Users, UserCog, Package, Brain, SlidersHorizontal } from "lucide-react";
import SidebarTip from "./SidebarTip";
import { navLinkClass, sidebarIconClass, sidebarTextClass, SIDEBAR_FOCUS_RING } from "./sidebarNavClasses";

interface ConfigDropdownProps {
  isCollapsed: boolean;
  onClose: () => void;
}

const CONFIG_PATHS = ["/usuarios", "/config-proveedores", "/config-materiales", "/config-ia", "/config-app"];

function ConfigDropdown({ isCollapsed, onClose }: ConfigDropdownProps) {
  const location = useLocation();
  const isConfigActive = CONFIG_PATHS.some((path) => location.pathname.startsWith(path));
  const [isConfigOpen, setIsConfigOpen] = useState(isConfigActive);

  return (
    <div className="space-y-0.5">
      <SidebarTip label="Configuración" disabled={!isCollapsed}>
        <button
          onClick={() => setIsConfigOpen((prev) => !prev)}
          className={`group relative flex items-center rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border-l-2 w-full text-left focus-visible:outline-none focus-visible:ring-2 ${SIDEBAR_FOCUS_RING} ${
            isCollapsed ? "justify-center gap-0 px-0 py-2.5" : "gap-3 px-3 py-2.5 hover:translate-x-0.5"
          } ${
            isConfigActive && !isConfigOpen
              ? "border-slate-400 bg-slate-800/60 text-white"
              : "border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-white"
          }`}
          aria-expanded={isConfigOpen}
        >
          <Settings
            className={`h-[18px] w-[18px] shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:rotate-[3deg] ${
              isConfigActive && !isConfigOpen ? "text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.35)]" : "text-slate-400 group-hover:text-white"
            }`}
          />
          <span className={sidebarTextClass(isCollapsed, true)}>Configuración</span>
          {!isCollapsed && (
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-300 ${isConfigOpen ? "rotate-180" : ""}`}
            />
          )}
        </button>
      </SidebarTip>

      <AnimatePresence initial={false}>
        {isConfigOpen && (
          <motion.div
            role="menu"
            aria-orientation="vertical"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden space-y-0.5 pt-0.5"
          >
            <div className={isCollapsed ? "" : "ml-3 border-l border-slate-800/60 pl-3"}>
              <SidebarTip label="Usuarios" disabled={!isCollapsed}>
                <NavLink
                  role="menuitem"
                  to="/usuarios"
                  id="sidebar-usuarios"
                  onClick={onClose}
                  className={navLinkClass("info", isCollapsed)}
                >
                  {({ isActive }) => (
                    <>
                      <Users className={sidebarIconClass(isActive)} />
                      <span className={sidebarTextClass(isCollapsed)}>Usuarios</span>
                    </>
                  )}
                </NavLink>
              </SidebarTip>

              <SidebarTip label="Proveedores" disabled={!isCollapsed}>
                <NavLink
                  role="menuitem"
                  to="/config-proveedores"
                  id="sidebar-config-proveedores"
                  onClick={onClose}
                  className={navLinkClass("brand", isCollapsed)}
                >
                  {({ isActive }) => (
                    <>
                      <UserCog className={sidebarIconClass(isActive)} />
                      <span className={sidebarTextClass(isCollapsed)}>Proveedores</span>
                    </>
                  )}
                </NavLink>
              </SidebarTip>

              <SidebarTip label="Material" disabled={!isCollapsed}>
                <NavLink
                  role="menuitem"
                  to="/config-materiales"
                  id="sidebar-config-materiales"
                  onClick={onClose}
                  className={navLinkClass("success", isCollapsed)}
                >
                  {({ isActive }) => (
                    <>
                      <Package className={sidebarIconClass(isActive)} />
                      <span className={sidebarTextClass(isCollapsed)}>Material</span>
                    </>
                  )}
                </NavLink>
              </SidebarTip>

              <SidebarTip label="Modelos de IA" disabled={!isCollapsed}>
                <NavLink
                  role="menuitem"
                  to="/config-ia"
                  id="sidebar-config-ia"
                  onClick={onClose}
                  className={navLinkClass("warning", isCollapsed)}
                >
                  {({ isActive }) => (
                    <>
                      <Brain className={sidebarIconClass(isActive)} />
                      <span className={sidebarTextClass(isCollapsed)}>Modelos de IA</span>
                    </>
                  )}
                </NavLink>
              </SidebarTip>

              <SidebarTip label="Configuración App" disabled={!isCollapsed}>
                <NavLink
                  role="menuitem"
                  to="/config-app"
                  id="sidebar-config-app"
                  onClick={onClose}
                  className={navLinkClass("neutral", isCollapsed)}
                >
                  {({ isActive }) => (
                    <>
                      <SlidersHorizontal className={sidebarIconClass(isActive)} />
                      <span className={sidebarTextClass(isCollapsed)}>Configuración App</span>
                    </>
                  )}
                </NavLink>
              </SidebarTip>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(ConfigDropdown);
