/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Punto de entrada de la SPA. Compone hooks por dominio y renderiza
 * las rutas con control de acceso por rol.
 */

import { lazy, Suspense, useCallback, useEffect } from "react";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";

// Views — lazy-loaded for route-level code-splitting
const LoginScreen = lazy(() => import("./views/LoginScreen"));

import Spinner from "./components/UI/Spinner";
import { ToastProvider, useToast } from "./components/UI/Toast";
import PublicRouteShell from "./routes/PublicRouteShell";
import AccessDeniedView from "./routes/AccessDeniedView";
import AuthenticatedRoutes from "./routes/AuthenticatedRoutes";

// Hooks por dominio
import { useAuth } from "./hooks/useAuth";
import { useRoleAccess } from "./hooks/useRouting";
import { useDocumentHead } from "./hooks/useDocumentHead";
import { ROUTES, isPublicRoute } from "./routes";
import { useProjects } from "./hooks/useProjects";
import { useContractors } from "./hooks/useContractors";
import { useCatalog } from "./hooks/useCatalog";
import { NotificationsProvider } from "./components/UI/NotificationsProvider";
import { PublicSettingsProvider } from "./components/UI/PublicSettingsProvider";

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
        <Spinner size="xl" />
        <p className="text-sm font-medium">Cargando módulo…</p>
      </div>
    </div>
  );
}

/**
 * Pantalla de validación de sesión. Se muestra brevemente mientras se
 * verifica el token almacenado contra el backend — la propia pantalla ya
 * comunica "Cargando…" visualmente, así que no dispara un toast (antes lo
 * hacía y quedaba apilado con el de "Sesión iniciada" un instante después,
 * exponiendo el mecanismo interno de auth en vez de sentirse transparente).
 */
function SessionValidationScreen() {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppProps = {
  /** Router component to use. Defaults to BrowserRouter. Pass MemoryRouter in tests. */
  router?: React.ComponentType<any>;
};

export default function App({ router: Router = BrowserRouter, ...routerProps }: AppProps & Record<string, unknown> = {}) {
  return (
    <Router {...routerProps}>
      <ToastProvider>
        {/* PublicSettingsProvider por fuera de AppRoutes: este último depende
            de usePollingSettings(), que ahora lee de aquel contexto en vez de
            fetchear /settings por su cuenta — un solo GET /settings
            compartido por toda la sesión en vez de uno por cada hook que lo
            necesitaba (usePollingSettings, useMaxAdvancePercent,
            useBudgetSemaphore).
            NotificationsProvider NO vive aquí a propósito — ver su montaje
            dentro de AppRoutes, después de resolver la sesión real. */}
        <PublicSettingsProvider>
          <AppRoutes />
        </PublicSettingsProvider>
      </ToastProvider>
    </Router>
  );
}

// ---------------------------------------------------------------------------
// AppRoutes
// ---------------------------------------------------------------------------

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  useDocumentHead();

  // ---- Auth ----
  const {
    authToken,
    authUser,
    isValidatingSession,
    handleLogin,
    handleLogout: authLogout,
  } = useAuth();

  // ---- Role Access ----
  const { activeRole, canAccess, firstAllowedRoute, isLoadingPermissions } = useRoleAccess(authUser?.role);

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
    handleResubmitProject,
    handleReviewProject,
    handleRejectProject,
    handleDeleteDocument,
    syncProject,
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
    navigate(ROUTES.HOME);
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
    return <PublicRouteShell contractorsCount={contractors.length} onAddContractor={handleAddContractor} />;
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
    return <AccessDeniedView onLogout={handleLogout} />;
  }

  // ---- Cargando matriz de permisos (GET /api/auth/permissions) ----
  if (isLoadingPermissions) {
    return <SessionValidationScreen />;
  }

  // ---- Layout autenticado ----
  // NotificationsProvider se monta acá, no en App() — solo cuando authToken
  // y authUser ya están confirmados por ESTA MISMA instancia de useAuth()
  // (no una segunda instancia propia con su propio ciclo de validación
  // desincronizado, ver comentario en NotificationsProvider.tsx). Fuera de
  // esta rama (login, validando sesión, sin rol) no hay bandeja que
  // mostrar, así que tampoco debe haber conexión WebSocket activa.
  const fallbackRoute = firstAllowedRoute(authUser.role) as string;
  return (
    <NotificationsProvider authToken={authToken} authUser={authUser}>
      <AuthenticatedRoutes
        user={authUser}
        activeRole={activeRole ?? ""}
        canAccess={canAccess}
        fallbackRoute={fallbackRoute}
        projects={projects}
        auditLogs={auditLogs}
        isLoadingApi={isLoadingApi}
        inspectedProject={inspectedProject}
        onCloseInspectedProject={() => setInspectedProject(null)}
        onSelectProject={(p: Record<string, unknown>) => { setInspectedProject(p as never); }}
        onLogout={handleLogout}
        contractors={contractors}
        onUpdateContractorRating={handleUpdateContractorRating}
        onContractorMutated={() => loadContractors()}
        materialsCatalog={materialsCatalog}
        onAddProject={handleAddProject}
        onResubmitProject={handleResubmitProject}
        onReviewProject={handleReviewProject}
        onRejectProject={handleRejectProject}
        onDeleteDocument={handleDeleteDocument}
        onSyncProject={syncProject}
        onApproveInvestment={handleApproveInvestment}
        onAddProposal={handleAddProposal}
        onRemoveProposal={handleRemoveProposal}
        onImportSupplierProposals={handleImportSupplierProposals}
        onSubmitComparative={handleSubmitComparative}
        onSelectContractor={handleSelectContractor}
        onRejectProposals={handleRejectProposals}
        onPayAdvance={handlePayAdvance}
        onVerifyCompletion={handleVerifyCompletion}
        onPayFinal={handlePayFinal}
        authToken={authToken}
        location={location}
      />
    </NotificationsProvider>
  );
}