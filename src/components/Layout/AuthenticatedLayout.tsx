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

import { SkeletonBlock } from "../SkeletonLoader";
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

// ---------------------------------------------------------------------------
// Suspense fallback para el contenido de rutas
// ---------------------------------------------------------------------------
// Skeleton, no spinner: es el único mecanismo de loading visible en la app.
// Esta etapa cubre la descarga del chunk JS de la vista lazy-loaded (en hard
// refresh, sin caché de chunks, puede tardar cientos de ms — suficiente para
// notarse) — la vista real, una vez montada, muestra su propio skeleton
// específico (forma real de sus datos: KPIs, tabla, tabs, lo que sea).
//
// A propósito genérico y sin forma de "contenido" (nada de cards con header
// simulado ni layout específico): cada vista tiene su propio skeleton en
// isLoading, con una forma distinta según sus datos (ver
// InfraestructuraMantenimientoPanel/index.tsx para un ejemplo con tabs).
// Si este fallback imitara la forma de alguna vista en particular, cada vez
// que esa vista cambiara su skeleton habría que volver a sincronizar este
// archivo compartido por 12+ rutas lazy distintas — y aun sincronizado,
// las otras 11 rutas seguirían viendo un "salto" de forma al pasar de este
// fallback al suyo propio. Manteniéndolo neutral (solo barras shimmer,
// mismo lenguaje visual que SkeletonBlock/SkeletonCard/etc en toda la app)
// nunca compite ni desentona con ninguna forma específica.
function PageFallback() {
  return (
    <div className="py-2 space-y-3">
      <SkeletonBlock className="h-3 w-32" />
      <SkeletonBlock className="h-24 w-full" />
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
      <div className="min-h-screen bg-surface-sunken text-slate-800 flex font-sans antialiased">

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

        </div>
      </div>
    </ErrorBoundary>
  );
}
