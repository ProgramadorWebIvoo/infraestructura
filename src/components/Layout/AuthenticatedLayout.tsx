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

import { SkeletonCard } from "../SkeletonLoader";
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
// Skeleton, no spinner: es el único mecanismo de loading visible en la app.
// Esta etapa cubre la descarga del chunk JS de la vista lazy-loaded (típico
// milisegundos) — la vista real, una vez montada, muestra su propio
// skeleton específico (forma real de sus datos) sin salto de lenguaje
// visual entre una etapa y la otra.

function PageFallback() {
  return (
    <div className="py-2">
      <div className="skeleton-shimmer h-3 w-32 rounded mb-4" />
      <SkeletonCard />
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
          activeRole={activeRole}
          onLogout={onLogout}
          canAccess={canAccess}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleOnToggleCollapsed}
        />

        {/* Main Container Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">

          <MobileTopBar
            user={user}
            activeRole={activeRole}
            onMenuClick={() => setIsMobileSidebarOpen(true)}
          />

          {/* Main Workspace Body */}
          <main className="flex-1 max-w-8xl mx-auto w-full py-6 space-y-6 px-6">

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
