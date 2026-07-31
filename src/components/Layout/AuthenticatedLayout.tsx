/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Layout autenticado — shell visual con sidebar, topbar mobile,
 * indicador de rol, footer y modal de inspección.
 * Recibe las rutas como children y las envuelve en transiciones AnimatePresence.
 */

import { lazy, Suspense, useState, useEffect, useCallback, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Database } from "lucide-react";

import Spinner from "../UI/Spinner";
import SidebarNav from "../UI/SidebarNav";
import MobileTopBar from "../UI/MobileTopBar";
import OfflineBanner from "../UI/OfflineBanner";
import ErrorBoundary from "../ErrorBoundary";
import type { Project } from "../../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AuthenticatedLayoutProps {
  user: { name: string; email: string } | null;
  activeRole: string;
  canAccess: (path: string) => boolean;
  projectsCount: number;
  contractorsCount: number;
  inspectedProject: Project | null;
  onCloseInspectedProject: () => void;
  onLogout: () => void;
  children: ReactNode;
}

interface SidebarNavProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// ---------------------------------------------------------------------------
// Suspense fallback para el contenido de rutas
// ---------------------------------------------------------------------------

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <Spinner size="xl" />
        <p className="text-sm font-medium">Cargando módulo…</p>
      </div>
    </div>
  );
}

// El modal se lazy-loadea porque solo se abre bajo demanda
const InspectProjectModal = lazy(() => import("../Modals/InspectProjectModal"));

// El estado colapsado del sidebar sobrevive al refresh de página
const SIDEBAR_COLLAPSED_KEY = "ivoo.sidebar.collapsed";

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function AuthenticatedLayout({
  user,
  activeRole,
  canAccess,
  projectsCount,
  contractorsCount,
  inspectedProject,
  onCloseInspectedProject,
  onLogout,
  children,
}: AuthenticatedLayoutProps) {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1",
  );

  const pageVariants = prefersReducedMotion
    ? { initial: { opacity: 1 }, enter: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 12 },
        enter: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 },
      };
  const pageTransition = { duration: prefersReducedMotion ? 0 : 0.22, ease: "easeOut" as const };

  const handleOnToggleCollapsed = useCallback(() => setIsSidebarCollapsed((prev) => !prev), []);
  const handleCloseMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, isSidebarCollapsed ? "1" : "0");
  }, [isSidebarCollapsed]);

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex font-sans antialiased">

        <SidebarNav
          isOpen={isMobileSidebarOpen}
          onClose={handleCloseMobileSidebar}
          user={user}
          onLogout={onLogout}
          canAccess={canAccess}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleOnToggleCollapsed}
        />

        {/* Main Container Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">

          <MobileTopBar
            user={user}
            onMenuClick={() => setIsMobileSidebarOpen(true)}
          />

          {/* Main Workspace Body */}
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

            {/* Dynamic Role Indicator Notification — hidden on mobile */}
            <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-br from-sky-50/40 to-white px-5 py-4 rounded-2xl border border-slate-200 shadow-xs gap-3 border-l-4 border-l-sky-400">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-sky-600 ring-1 ring-sky-200/50">
                  <Database className="h-3 w-3 text-sky-500" />
                  Base de datos unificada
                </span>
                <span className="font-semibold text-slate-700">{projectsCount} Obras</span>
                <span className="text-slate-300 hidden sm:inline">&bull;</span>
                <span className="font-semibold text-slate-700">{contractorsCount} Proveedores</span>
              </div>
              <div className="inline-flex items-center gap-1.5 self-start sm:self-auto text-[11px] font-mono font-bold bg-gradient-to-r from-slate-100 to-slate-50 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200 shadow-xs">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-xs shadow-emerald-500/40" />
                Terminal: {activeRole}
              </div>
            </div>

            {/* Route-driven module rendering with smooth view transitions */}
            <Suspense fallback={<PageFallback />}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  variants={pageVariants}
                  transition={pageTransition}
                  className="min-w-0"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </Suspense>

          </main>

          {/* Inspect Modal — lazy-loaded */}
          <Suspense fallback={null}>
            <InspectProjectModal
              isOpen={!!inspectedProject}
              project={inspectedProject}
              onClose={onCloseInspectedProject}
            />
          </Suspense>

          {/* Footer */}
          <footer className="mt-12 border-t border-slate-200 bg-gradient-to-b from-white to-slate-50/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
                {/* Brand */}
                <div className="inline-flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-xs">
                    <Database className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-bold text-slate-700">IVOO</span>
                  <span className="text-slate-300">|</span>
                  <span>Gestión de Infraestructura</span>
                </div>

                {/* Links */}
                <div className="flex items-center gap-4">
                  <span>&copy; {new Date().getFullYear()}</span>
                  <span className="text-slate-300 hidden sm:inline">&bull;</span>
                  <span>Organigrama Integrado IVOO</span>
                  <span className="text-slate-300 hidden sm:inline">&bull;</span>
                  <span>Todos los derechos reservados.</span>
                </div>
              </div>
            </div>
          </footer>

        </div>
      </div>
    </ErrorBoundary>
  );
}
