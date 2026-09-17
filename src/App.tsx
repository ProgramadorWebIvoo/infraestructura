/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Punto de entrada de la SPA. Compone hooks por dominio y renderiza
 * las rutas con control de acceso por rol.
 */

import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider, removeOldestQuery } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

// Views — lazy-loaded for route-level code-splitting
const LoginScreen = lazy(() => import("./views/LoginScreen"));
// Único punto de App.tsx que necesita motion/react — lazy para que un
// visitante anónimo (login, portal público) nunca la descargue/ejecute; ver
// docblock de LoggingOutOverlay.tsx.
const LoggingOutOverlay = lazy(() => import("./components/LoggingOutOverlay"));

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
import { useProjectTypes } from "./hooks/useProjectTypes";
import { useIdleRoutePrefetch } from "./hooks/useIdleRoutePrefetch";
import { NotificationsProvider } from "./components/UI/NotificationsProvider";
import { PublicSettingsProvider } from "./components/UI/PublicSettingsProvider";
import { ExchangeRatesProvider } from "./components/UI/ExchangeRatesProvider";
import { AiFeatureGateProvider } from "./components/UI/AiFeatureGateProvider";
import DebugPanel from "./components/UI/DebugPanel/DebugPanel";
import { useDebugStore } from "./stores/debugStore";

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

// QueryClient a nivel de módulo (no dentro de App()): una sola instancia para
// toda la vida de la pestaña, no una nueva en cada remount de <App/> (tests
// con múltiples renders, HMR). staleTime por defecto conservador — los hooks
// de application/ que migren a TanStack Query fijan su propio staleTime
// alineado a los intervalos de polling ya documentados en Rules/09-METRICS.md
// (proyectos 25s, notificaciones 8s, catálogos 15s) para no cambiar el
// comportamiento percibido durante la migración incremental.
//
// gcTime: 24h — alineado al maxAge del persister de abajo. Si gcTime fuera
// menor (el default de TanStack es 5min), una query sin observers activos
// (tab en background, componente desmontado) se recolectaría de la memoria
// antes de que el persister la escriba, perdiendo el propósito de persistir.
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: CACHE_MAX_AGE_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Persistencia del cache en localStorage: al recargar la página (F5, cierre
// de pestaña) la UI hidrata instantáneo con los últimos datos conocidos en
// vez de mostrar skeletons, y TanStack revalida en background según el
// staleTime/refetchInterval de cada query (stale-while-revalidate
// cross-reload).
//
// buster: NO es la versión de la app — cambiarlo en cada deploy invalidaría
// el cache persistido en cada release, anulando el propósito. Es un lever
// manual: subir CACHE_SCHEMA_VERSION solo cuando un cambio de shape en los
// datos cacheados (ej. un campo renombrado/removido en la respuesta de la
// API) haría que hidratar cache viejo rompa un componente en vez de
// simplemente mostrar datos desactualizados por unos segundos.
const CACHE_SCHEMA_VERSION = "1";

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "ivoo-query-cache",
  // localStorage tiene una cuota (~5-10MB por origen, según navegador). Sin
  // `retry`, un `setItem` que la exceda falla en silencio (la librería lo
  // atrapa internamente) y esa sesión simplemente deja de persistir cache —
  // no crashea, pero tampoco se recupera. `removeOldestQuery` es la
  // estrategia documentada de TanStack: en caso de fallo, descarta la query
  // persistida más vieja y reintenta el guardado, en vez de rendirse.
  retry: removeOldestQuery,
});

// Colecciones que pueden crecer mucho con datos reales de producción
// (catálogo de materiales, propuestas de proveedores) — se excluyen de la
// persistencia en localStorage porque compiten por la cuota compartida con
// el resto del cache sin aportar tanto (revalidan rápido igual, por
// staleTime corto). El resto de queries sí persiste para hidratar
// instantáneo al recargar (ver comentario de PERSIST_OPTIONS más abajo).
const LARGE_QUERY_KEY_PREFIXES = ["catalogProducts", "supplierMaterialProposals"];

const PERSIST_OPTIONS = {
  persister,
  maxAge: CACHE_MAX_AGE_MS,
  buster: CACHE_SCHEMA_VERSION,
  dehydrateOptions: {
    // No persistir queries en estado de error: al rehidratar no queremos
    // que un fetch fallido de la última sesión se muestre como dato válido.
    // Tampoco las colecciones grandes (ver LARGE_QUERY_KEY_PREFIXES).
    shouldDehydrateQuery: (query: { state: { status: string }; queryKey: readonly unknown[] }) =>
      query.state.status === "success" &&
      !LARGE_QUERY_KEY_PREFIXES.includes(query.queryKey[0] as string),
  },
};

export default function App({ router: Router = BrowserRouter, ...routerProps }: AppProps & Record<string, unknown> = {}) {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={PERSIST_OPTIONS}>
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
            <AiFeatureGateProvider>
              <AppRoutes />
            </AiFeatureGateProvider>
          </PublicSettingsProvider>
        </ToastProvider>
      </Router>
    </PersistQueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// AppRoutes
// ---------------------------------------------------------------------------

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClientInstance = useQueryClient();
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

  // ---- Debug mode: flag client-side (stores/debugStore.ts), gateado a
  // ADMIN/SUPERADMIN — mismo criterio de rol que el toggle en CONFIG APP
  // (ver ConfigAppPanel/components/DebugModeCard.tsx). Alguien con un rol
  // distinto nunca ve el botón flotante aunque el flag haya quedado
  // encendido en su localStorage (ej. cambio de rol sin logout).
  const debugModeEnabled = useDebugStore(s => s.enabled);
  const canUseDebugMode = activeRole === "SUPERADMIN" || activeRole === "ADMIN";

  // ---- Pre-fetching inteligente: heurística "próxima ruta probable por rol" ----
  useIdleRoutePrefetch(activeRole, canAccess);

  // ---- Contractors ----
  const {
    contractors,
    setContractors,
    handleAddContractor,
    handleUpdateContractorRating,
    loadContractors,
    resetContractors,
  } = useContractors(authToken, showToast, canAccess(ROUTES.ANALISTAS) || canAccess(ROUTES.CATALOGOS));

  // ---- Catalog ----
  const {
    materialsCatalog,
    setMaterialsCatalog,
    handleAddCatalogItem,
    resetCatalog,
  } = useCatalog(authToken, showToast, canAccess(ROUTES.INFRAESTRUCTURA));

  const { projectTypes } = useProjectTypes(authToken, showToast, canAccess(ROUTES.INFRAESTRUCTURA));

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
    handleSendToReevaluation,
    handleResolveReevaluation,
    handleDeleteDocument,
    syncProject,
    handleApproveInvestment,
    handleAddProposal,
    handleRenegotiateProposal,
    handleSendRenegotiationInvite,
    handleRemoveProposal,
    handleImportSupplierProposals,
    handleSubmitComparative,
    handleSelectContractor,
    handleRejectProposals,
    handlePayAdvance,
    handleVerifyCompletion,
    handlePayFinal,
    resetData,
    loadApiData,
  } = useProjects(authToken, showToast, activeRole);

  // ---- Logout compuesto (limpia auth + datos) ----
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // useCallback: se pasa como onLogout a SidebarNav (memo()) — sin referencia
  // estable, ese memo no evita el re-render en cada cambio de ruta/proyectos.
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    // Beat mínimo para que LoggingOutScreen no sea un flash ilegible cuando
    // /logout resuelve casi instantáneo (localhost, red rápida) — el logout
    // real y el timer corren en paralelo, se espera el más lento de los dos.
    const minDisplay = new Promise((resolve) => setTimeout(resolve, 550));
    await Promise.all([authLogout(), minDisplay]);
    resetData();
    resetContractors();
    resetCatalog();
    // Limpia el cache de TanStack (memoria + localStorage persistido): sin
    // esto, el próximo login en el mismo navegador (otro usuario/rol)
    // hidrataría de entrada con datos del usuario anterior hasta que cada
    // query revalide.
    queryClientInstance.clear();
    navigate(ROUTES.HOME);
    showToast("Sesión cerrada.", "info");
    setIsLoggingOut(false);
  }, [authLogout, resetData, resetContractors, resetCatalog, queryClientInstance, navigate, showToast]);

  // ---- Handlers de inspección de proyecto ----
  // useCallback: se pasan a AuthenticatedRoutes -> paneles con memo() (ej.
  // Table.tsx) — sin referencia estable, esos memo() no evitan re-render en
  // cada cambio de ruta/proyectos (error conocido #2 del CLAUDE.md frontend).
  const handleCloseInspectedProject = useCallback(() => setInspectedProject(null), [setInspectedProject]);
  const handleSelectProject = useCallback(
    (p: Record<string, unknown>) => { setInspectedProject(p as never); },
    [setInspectedProject],
  );

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

  // ---- Cerrando sesión — overlay de despedida, ver LoggingOutOverlay ----
  if (isLoggingOut) {
    return (
      <Suspense fallback={null}>
        <LoggingOutOverlay />
      </Suspense>
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
  const fallbackRoute = firstAllowedRoute() as string;
  return (
    <NotificationsProvider authToken={authToken} authUser={authUser}>
      {/* Un solo fetch de tasas para toda la sesión autenticada — las vistas
          consumen vía useCurrencyConversion(), sin instanciar su propio
          fetch/auth por componente (ver ExchangeRatesProvider). */}
      <ExchangeRatesProvider authToken={authToken}>
      <AuthenticatedRoutes
        user={authUser}
        activeRole={activeRole ?? ""}
        canAccess={canAccess}
        fallbackRoute={fallbackRoute}
        projects={projects}
        auditLogs={auditLogs}
        onRefreshData={loadApiData}
        isLoadingApi={isLoadingApi}
        inspectedProject={inspectedProject}
        onCloseInspectedProject={handleCloseInspectedProject}
        onSelectProject={handleSelectProject}
        onLogout={handleLogout}
        contractors={contractors}
        onUpdateContractorRating={handleUpdateContractorRating}
        onContractorMutated={() => loadContractors()}
        materialsCatalog={materialsCatalog}
        projectTypes={projectTypes}
        onAddProject={handleAddProject}
        onResubmitProject={handleResubmitProject}
        onReviewProject={handleReviewProject}
        onRejectProject={handleRejectProject}
        onSendToReevaluation={handleSendToReevaluation}
        onResolveReevaluation={handleResolveReevaluation}
        onDeleteDocument={handleDeleteDocument}
        onSyncProject={syncProject}
        onApproveInvestment={handleApproveInvestment}
        onAddProposal={handleAddProposal}
        onRenegotiateProposal={handleRenegotiateProposal}
        onSendRenegotiationInvite={handleSendRenegotiationInvite}
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
      {canUseDebugMode && debugModeEnabled && <DebugPanel authUser={authUser} activeRole={activeRole} />}
      </ExchangeRatesProvider>
    </NotificationsProvider>
  );
}