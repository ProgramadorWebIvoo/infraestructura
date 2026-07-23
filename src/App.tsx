/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Punto de entrada de la SPA. Compone hooks por dominio y renderiza
 * las rutas con control de acceso por rol.
 */

import { lazy, Suspense, useCallback, useEffect, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

// Views — lazy-loaded for route-level code-splitting
const PresidenciaDashboard = lazy(() => import("./views/PresidenciaDashboard"));
const InfraestructuraMantenimientoPanel = lazy(() => import("./views/InfraestructuraMantenimientoPanel"));
const CierreObraPanel = lazy(() => import("./views/CierreObraPanel"));
const ProcuraPanel = lazy(() => import("./views/ProcuraPanel"));
const AnalistasPanel = lazy(() => import("./views/AnalistasPanel"));
const FinanzasPanel = lazy(() => import("./views/FinanzasPanel"));
const MaterialesProveedores = lazy(() => import("./views/MaterialesProveedores"));
const ProveedoresRegistrados = lazy(() => import("./views/ProveedoresRegistrados"));
const ProveedoresConfigPanel = lazy(() => import("./views/ProveedoresConfigPanel"));
const MaterialConfigPanel = lazy(() => import("./views/MaterialConfigPanel"));
const AIConfigPanel = lazy(() => import("./views/AIConfigPanel"));
const PropuestaMaterialesPublica = lazy(() => import("./views/PropuestaMaterialesPublica"));
const UsuariosPanel = lazy(() => import("./views/UsuariosPanel"));
const LoginScreen = lazy(() => import("./views/LoginScreen"));

import { ToastProvider, useToast } from "./components/UI/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import AuthenticatedLayout from "./components/Layout/AuthenticatedLayout";

// Hooks por dominio
import { useAuth } from "./hooks/useAuth";
import { useRoleAccess } from "./hooks/useRouting";
import { ROUTES, isPublicRoute, ProtectedRoute } from "./routes";
import { useProjects } from "./hooks/useProjects";
import { useContractors } from "./hooks/useContractors";
import { useCatalog } from "./hooks/useCatalog";

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Suspense fallback — mantiene el shell visual mientras carga un chunk
// ---------------------------------------------------------------------------

/** Full‑screen spinner, usado en rutas públicas y login */
function FullScreenFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
        <p className="text-sm font-medium">Cargando módulo…</p>
      </div>
    </div>
  );
}

/**
 * Pantalla de validación de sesión. Se muestra brevemente mientras se
 * verifica el token almacenado contra el backend. Lanza una notificación
 * toast para informar al usuario sin ocupar toda la atención visual.
 */
function SessionValidationScreen() {
  const { showToast } = useToast();
  const notified = useRef(false);
  useEffect(() => {
    if (notified.current) return;
    notified.current = true;
    showToast("Verificando sesión almacenada…", "info");
  }, [showToast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-2">
        <span className="text-5xl font-black tracking-tight text-slate-300 select-none">
          IVOO
        </span>
        <span className="text-sm font-medium text-slate-400">Cargando…</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </BrowserRouter>
  );
}

// ---------------------------------------------------------------------------
// AppRoutes
// ---------------------------------------------------------------------------

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // ---- Auth ----
  const {
    authToken,
    authUser,
    isValidatingSession,
    handleLogin,
    handleLogout: authLogout,
  } = useAuth();

  // ---- Role Access ----
  const { activeRole, canAccess, firstAllowedRoute } = useRoleAccess(authUser?.role);

  // ---- Contractors ----
  const {
    contractors,
    setContractors,
    handleAddContractor,
    handleUpdateContractorRating,
    loadContractors,
    resetContractors,
  } = useContractors(authToken, showToast);

  // ---- Catalog ----
  const {
    materialsCatalog,
    setMaterialsCatalog,
    handleAddCatalogItem,
    resetCatalog,
  } = useCatalog(authToken, showToast);

  // ---- Projects ----
  const {
    projects,
    auditLogs,
    isLoadingApi,
    inspectedProject,
    setInspectedProject,
    handleAddProject,
    handleReviewProject,
    handleApproveInvestment,
    handleAddProposal,
    handleRemoveProposal,
    handleImportSupplierProposals,
    handleSubmitComparative,
    handleSelectContractor,
    handleRejectProposals,
    handlePayAdvance,
    handleVerifyCompletion,
    handlePayFinal,
    resetData,
  } = useProjects(authToken, showToast);

  // ---- Logout compuesto (limpia auth + datos) ----
  const handleLogout = async () => {
    await authLogout();
    showToast("Sesión cerrada.", "info");
    resetData();
    resetContractors();
    resetCatalog();
    navigate(ROUTES.PRESIDENCIA);
  };

  // ---- Login wrapper con toast de bienvenida ----
  const handleLoginWithToast = useCallback(async (email: string, password: string) => {
    await handleLogin(email, password);
    showToast("Sesión iniciada correctamente.", "success");
  }, [handleLogin, showToast]);

  // Reset scroll on navigation for a clean entrance
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // ---- Public routes (sin auth) ----
  if (isPublicRoute(location.pathname)) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<FullScreenFallback />}>
          <Routes>
            <Route
              path={ROUTES.REGISTRO_PROVEEDORES}
              element={
                <MaterialesProveedores
                  contractorsCount={contractors.length}
                  onAddContractor={handleAddContractor}
                />
              }
            />
            <Route path={ROUTES.PROPUESTA_MATERIALES} element={<PropuestaMaterialesPublica />} />
            <Route path="*" element={<Navigate to={ROUTES.REGISTRO_PROVEEDORES} replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    );
  }

  // ---- Validando sesión guardada (token en localStorage, consultando backend) ----
  if (isValidatingSession) {
    return <SessionValidationScreen />;
  }

  // ---- No autenticado ----
  if (!authToken) {
    return (
      <Suspense fallback={<FullScreenFallback />}>
        <LoginScreen onLogin={handleLoginWithToast} />
      </Suspense>
    );
  }

  // ---- Autenticado pero sin rol asignado ----
  if (!authUser?.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">⛔</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">Acceso denegado</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Tu cuenta no tiene un rol asignado. Contacta al administrador del sistema para que configure tus permisos.
          </p>
          <button
            onClick={handleLogout}
            className="mt-2 px-6 py-2.5 bg-sky-500 text-white text-sm font-semibold rounded-xl hover:bg-sky-600 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // ---- Layout autenticado ----
  const fallbackRoute = firstAllowedRoute(authUser.role) as string;
  return (
    <AuthenticatedLayout
      user={authUser}
      activeRole={activeRole ?? ""}
      canAccess={canAccess}
      projectsCount={projects.length}
      contractorsCount={contractors.length}
      inspectedProject={inspectedProject}
      onCloseInspectedProject={() => setInspectedProject(null)}
      onLogout={handleLogout}
    >
      <Routes location={location}>
        <Route
          path={ROUTES.HOME}
          element={<Navigate to={fallbackRoute} replace />}
        />
        <Route
          path={ROUTES.PRESIDENCIA}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.PRESIDENCIA)} redirectTo={fallbackRoute}>
              <PresidenciaDashboard projects={projects} auditLogs={auditLogs} onSelectProject={(p) => setInspectedProject(p)} isLoading={isLoadingApi} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.INFRAESTRUCTURA}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.INFRAESTRUCTURA)} redirectTo={fallbackRoute}>
              <InfraestructuraMantenimientoPanel onAddProject={handleAddProject} projects={projects} materialsCatalog={materialsCatalog} isLoading={isLoadingApi} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CIERRE_OBRA}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.CIERRE_OBRA)} redirectTo={fallbackRoute}>
              <CierreObraPanel projects={projects} onReviewProject={handleReviewProject} onVerifyCompletion={handleVerifyCompletion} isLoading={isLoadingApi} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.PROCURA}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.PROCURA)} redirectTo={fallbackRoute}>
              <ProcuraPanel projects={projects} onApproveInvestment={handleApproveInvestment} onSelectContractor={handleSelectContractor} onRejectProposals={handleRejectProposals} authToken={authToken} isLoading={isLoadingApi} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ANALISTAS}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.ANALISTAS)} redirectTo={fallbackRoute}>
              <AnalistasPanel projects={projects} contractors={contractors} onAddProposal={handleAddProposal} onRemoveProposal={handleRemoveProposal} onSubmitComparative={handleSubmitComparative} onImportSupplierProposals={handleImportSupplierProposals} isLoading={isLoadingApi} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.FINANZAS}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.FINANZAS)} redirectTo={fallbackRoute}>
              <FinanzasPanel projects={projects} onPayAdvance={handlePayAdvance} onPayFinal={handlePayFinal} isLoading={isLoadingApi} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CATALOGOS}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.CATALOGOS)} redirectTo={fallbackRoute}>
              <ProveedoresRegistrados contractors={contractors} projects={projects} authToken={authToken} onUpdateContractorRating={handleUpdateContractorRating} isLoading={isLoadingApi} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CONFIG_PROVEEDORES}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.CONFIG_PROVEEDORES)} redirectTo={fallbackRoute}>
              <ProveedoresConfigPanel authToken={authToken} onContractorMutated={() => loadContractors()} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CONFIG_MATERIALES}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.CONFIG_MATERIALES)} redirectTo={fallbackRoute}>
              <MaterialConfigPanel authToken={authToken} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CONFIG_IA}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.CONFIG_IA)} redirectTo={fallbackRoute}>
              <AIConfigPanel authToken={authToken} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.USUARIOS}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.USUARIOS)} redirectTo={fallbackRoute}>
              <UsuariosPanel authToken={authToken} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={fallbackRoute} replace />} />
      </Routes>
    </AuthenticatedLayout>
  );
}