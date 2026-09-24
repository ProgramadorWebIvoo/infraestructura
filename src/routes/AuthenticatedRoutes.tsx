import { lazy } from "react";
import { Location, Navigate, Route, Routes } from "react-router-dom";
import { ROUTES, ProtectedRoute } from "@/routes.tsx";
import { ROUTE_PREFETCH } from "@/routes/prefetchRegistry";
import AuthenticatedLayout from "@/components/Layout/AuthenticatedLayout";
import { useHomeAnnouncement } from "@/hooks/useHomeAnnouncement";
// Types are enforced at the leaf view component level; this shell passes through any props.

// Cada `lazy()` reusa el MISMO loader que el registro de pre-fetch
// (src/routes/prefetchRegistry.ts) — una sola lista de `import()` en vez de
// dos mantenidas en paralelo (la de acá y la que antes vivía hardcodeada en
// SidebarNav para hover-prefetch).
const HomePanel = lazy(ROUTE_PREFETCH[ROUTES.HOME]!.loadChunk);
const PresidenciaDashboard = lazy(ROUTE_PREFETCH[ROUTES.PRESIDENCIA]!.loadChunk);
const MarketingUnderConstruction = lazy(ROUTE_PREFETCH[ROUTES.MARKETING]!.loadChunk);
const InfraestructuraMantenimientoPanel = lazy(ROUTE_PREFETCH[ROUTES.INFRAESTRUCTURA]!.loadChunk);
const AuditoriaPanel = lazy(ROUTE_PREFETCH[ROUTES.AUDITORIA]!.loadChunk);
const ProcuraPanel = lazy(ROUTE_PREFETCH[ROUTES.PROCURA]!.loadChunk);
const AnalistasPanel = lazy(ROUTE_PREFETCH[ROUTES.ANALISTAS]!.loadChunk);
const FinanzasPanel = lazy(ROUTE_PREFETCH[ROUTES.FINANZAS]!.loadChunk);
const ProveedoresRegistrados = lazy(ROUTE_PREFETCH[ROUTES.CATALOGOS]!.loadChunk);
const ConfigAppPanel = lazy(ROUTE_PREFETCH[ROUTES.CONFIG_APP]!.loadChunk);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuthenticatedRoutesProps = Record<string, any>;

export default function AuthenticatedRoutes(props: AuthenticatedRoutesProps) {
  const {
    user, activeRole, canAccess, fallbackRoute,
    projects, auditLogs, onRefreshData, isLoadingApi, inspectedProject, onCloseInspectedProject, onSelectProject,
    onLogout, contractors, onUpdateContractorRating, onContractorMutated,
    materialsCatalog, projectTypes,
    onAddProject, onResubmitProject, onRejectProject, onSendToReevaluation, onResolveReevaluation, onReviewProject, onDeleteDocument, onSyncProject, onApproveInvestment, onAddProposal,
    onRenegotiateProposal, onSendRenegotiationInvite,
    onRemoveProposal, onImportSupplierProposals, onSubmitComparative,
    onSelectContractor, onRejectProposals, onPayAdvance, onVerifyCompletion, onPayFinal,
    authToken, location,
  } = props;

  const homeAnnouncement = useHomeAnnouncement();

  return (
    <AuthenticatedLayout
      user={user}
      activeRole={activeRole}
      canAccess={canAccess}
      authToken={authToken}
      inspectedProject={inspectedProject}
      onCloseInspectedProject={onCloseInspectedProject}
      onLogout={onLogout}
    >
      <Routes location={location}>
        <Route
          path={ROUTES.HOME}
          element={<HomePanel user={user} activeRole={activeRole} projects={projects} auditLogs={auditLogs} isLoading={isLoadingApi} announcement={homeAnnouncement} />}
        />
        <Route
          path={ROUTES.PRESIDENCIA}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.PRESIDENCIA)} redirectTo={fallbackRoute}>
              <PresidenciaDashboard projects={projects} auditLogs={auditLogs} authToken={authToken} isLoading={isLoadingApi} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.MARKETING}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.MARKETING)} redirectTo={fallbackRoute}>
              <MarketingUnderConstruction />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.INFRAESTRUCTURA}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.INFRAESTRUCTURA)} redirectTo={fallbackRoute}>
              <InfraestructuraMantenimientoPanel onAddProject={onAddProject} onResubmitProject={onResubmitProject} onDeleteDocument={onDeleteDocument} projects={projects} auditLogs={auditLogs} authToken={authToken} materialsCatalog={materialsCatalog} projectTypes={projectTypes} isLoading={isLoadingApi} onRefreshData={onRefreshData} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.AUDITORIA}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.AUDITORIA)} redirectTo={fallbackRoute}>
              <AuditoriaPanel projects={projects} auditLogs={auditLogs} authToken={authToken} onReviewProject={onReviewProject} onRejectProject={onRejectProject} onResolveReevaluation={onResolveReevaluation} onVerifyCompletion={onVerifyCompletion} onSyncProject={onSyncProject} isLoading={isLoadingApi} onRefreshData={onRefreshData} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.PROCURA}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.PROCURA)} redirectTo={fallbackRoute}>
              <ProcuraPanel projects={projects} onApproveInvestment={onApproveInvestment} onSendToReevaluation={onSendToReevaluation} onSelectContractor={onSelectContractor} onRejectProposals={onRejectProposals} authToken={authToken} isLoading={isLoadingApi} onRefreshData={onRefreshData} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ANALISTAS}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.ANALISTAS)} redirectTo={fallbackRoute}>
              <AnalistasPanel projects={projects} contractors={contractors} onAddProposal={onAddProposal} onRenegotiateProposal={onRenegotiateProposal} onSendRenegotiationInvite={onSendRenegotiationInvite} onRemoveProposal={onRemoveProposal} onSubmitComparative={onSubmitComparative} onImportSupplierProposals={onImportSupplierProposals} authToken={authToken} isLoading={isLoadingApi} onRefreshData={onRefreshData} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.FINANZAS}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.FINANZAS)} redirectTo={fallbackRoute}>
              <FinanzasPanel projects={projects} authToken={authToken} onPayAdvance={onPayAdvance} onPayFinal={onPayFinal} isLoading={isLoadingApi} onRefreshData={onRefreshData} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CATALOGOS}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.CATALOGOS)} redirectTo={fallbackRoute}>
              <ProveedoresRegistrados contractors={contractors} projects={projects} authToken={authToken} onUpdateContractorRating={onUpdateContractorRating} isLoading={isLoadingApi} onRefreshData={onRefreshData} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CONFIG_APP}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.CONFIG_APP)} redirectTo={fallbackRoute}>
              <ConfigAppPanel
                authToken={authToken}
                activeRole={activeRole}
                canAccess={canAccess}
                onContractorMutated={onContractorMutated}
              />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={fallbackRoute} replace />} />
      </Routes>
    </AuthenticatedLayout>
  );
}
