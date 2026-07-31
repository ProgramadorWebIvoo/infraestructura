/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dropdown de Configuración del sidebar. Vive como componente propio (memo)
 * para que abrir/cerrar el submenú solo re-renderice este subárbol y no los
 * 7 NavLink principales.
 */

import { memo, useState } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "motion/react";
import { Settings, ChevronDown, Users, UserCog, Package, Brain } from "lucide-react";
import { navLinkClass, sidebarIconClass, sidebarTextClass } from "./sidebarNavClasses";

interface ConfigDropdownProps {
  isCollapsed: boolean;
  onClose: () => void;
}

function ConfigDropdown({ isCollapsed, onClose }: ConfigDropdownProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setIsConfigOpen((prev) => !prev)}
        className={`group relative flex items-center rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border-l-2 border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-white w-full text-left ${
          isCollapsed ? "justify-center gap-0 px-0 py-2.5" : "gap-3 px-3 py-2.5 hover:translate-x-0.5"
        }`}
        aria-expanded={isConfigOpen}
        title="Configuración"
      >
        <Settings className="h-[18px] w-[18px] shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:rotate-[3deg] text-slate-400 group-hover:text-white" />
        <span className={sidebarTextClass(isCollapsed, true)}>Configuración</span>
        {!isCollapsed && (
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${isConfigOpen ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {isConfigOpen && (
        <motion.div
          role="menu"
          aria-orientation="vertical"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className={`space-y-0.5 pt-0.5 ${isCollapsed ? "" : "ml-3 border-l border-slate-800/60 pl-3"}`}
        >
          <NavLink
            role="menuitem"
            to="/usuarios"
            id="sidebar-usuarios"
            onClick={onClose}
            title="Usuarios"
            className={navLinkClass("bg-sky-500", "border-sky-400", isCollapsed)}
          >
            {({ isActive }) => (
              <>
                <Users className={sidebarIconClass(isActive)} />
                <span className={sidebarTextClass(isCollapsed)}>Usuarios</span>
              </>
            )}
          </NavLink>

          <NavLink
            role="menuitem"
            to="/config-proveedores"
            id="sidebar-config-proveedores"
            onClick={onClose}
            title="Proveedores"
            className={navLinkClass("bg-indigo-600", "border-indigo-400", isCollapsed)}
          >
            {({ isActive }) => (
              <>
                <UserCog className={sidebarIconClass(isActive)} />
                <span className={sidebarTextClass(isCollapsed)}>Proveedores</span>
              </>
            )}
          </NavLink>

          <NavLink
            role="menuitem"
            to="/config-materiales"
            id="sidebar-config-materiales"
            onClick={onClose}
            title="Material"
            className={navLinkClass("bg-emerald-600", "border-emerald-400", isCollapsed)}
          >
            {({ isActive }) => (
              <>
                <Package className={sidebarIconClass(isActive)} />
                <span className={sidebarTextClass(isCollapsed)}>Material</span>
              </>
            )}
          </NavLink>

          <NavLink
            role="menuitem"
            to="/config-ia"
            id="sidebar-config-ia"
            onClick={onClose}
            title="Modelos de IA"
            className={navLinkClass("bg-violet-600", "border-violet-400", isCollapsed)}
          >
            {({ isActive }) => (
              <>
                <Brain className={sidebarIconClass(isActive)} />
                <span className={sidebarTextClass(isCollapsed)}>Modelos de IA</span>
              </>
            )}
          </NavLink>
        </motion.div>
      )}
    </div>
  );
}

export default memo(ConfigDropdown);
