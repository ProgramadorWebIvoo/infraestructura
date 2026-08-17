import { lazy } from "react";
import { Location, Navigate, Route, Routes } from "react-router-dom";
import { ROUTES, ProtectedRoute } from "../routes.tsx";
import AuthenticatedLayout from "../components/Layout/AuthenticatedLayout";
// Types are enforced at the leaf view component level; this shell passes through any props.

const PresidenciaDashboard = lazy(() => import("../views/PresidenciaDashboard"));
const InfraestructuraMantenimientoPanel = lazy(() => import("../views/InfraestructuraMantenimientoPanel"));
const CierreObraPanel = lazy(() => import("../views/CierreObraPanel"));
const ProcuraPanel = lazy(() => import("../views/ProcuraPanel"));
const AnalistasPanel = lazy(() => import("../views/AnalistasPanel"));
const FinanzasPanel = lazy(() => import("../views/FinanzasPanel"));
const ProveedoresRegistrados = lazy(() => import("../views/ProveedoresRegistrados"));
const ProveedoresConfigPanel = lazy(() => import("../views/ProveedoresConfigPanel"));
const MaterialConfigPanel = lazy(() => import("../views/MaterialConfigPanel"));
const AIConfigPanel = lazy(() => import("../views/AIConfigPanel"));
const ConfigAppPanel = lazy(() => import("../views/ConfigAppPanel"));
const UsuariosPanel = lazy(() => import("../views/UsuariosPanel"));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuthenticatedRoutesProps = Record<string, any>;

export default function AuthenticatedRoutes(props: AuthenticatedRoutesProps) {
  const {
    user, activeRole, canAccess, fallbackRoute,
    projects, auditLogs, isLoadingApi, inspectedProject, onCloseInspectedProject, onSelectProject,
    onLogout, contractors, onUpdateContractorRating, onContractorMutated,
    materialsCatalog,
    onAddProject, onReviewProject, onApproveInvestment, onAddProposal,
    onRemoveProposal, onImportSupplierProposals, onSubmitComparative,
    onSelectContractor, onRejectProposals, onPayAdvance, onVerifyCompletion, onPayFinal,
    authToken, location,
  } = props;

  return (
    <AuthenticatedLayout
      user={user}
      activeRole={activeRole}
      canAccess={canAccess}
      inspectedProject={inspectedProject}
      onCloseInspectedProject={onCloseInspectedProject}
      onLogout={onLogout}
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
              <PresidenciaDashboard projects={projects} auditLogs={auditLogs} onSelectProject={onSelectProject} isLoading={isLoadingApi} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.INFRAESTRUCTURA}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.INFRAESTRUCTURA)} redirectTo={fallbackRoute}>
              <InfraestructuraMantenimientoPanel onAddProject={onAddProject} projects={projects} materialsCatalog={materialsCatalog} isLoading={isLoadingApi} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CIERRE_OBRA}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.CIERRE_OBRA)} redirectTo={fallbackRoute}>
              <CierreObraPanel projects={projects} onReviewProject={onReviewProject} onVerifyCompletion={onVerifyCompletion} isLoading={isLoadingApi} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.PROCURA}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.PROCURA)} redirectTo={fallbackRoute}>
              <ProcuraPanel projects={projects} onApproveInvestment={onApproveInvestment} onSelectContractor={onSelectContractor} onRejectProposals={onRejectProposals} authToken={authToken} isLoading={isLoadingApi} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ANALISTAS}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.ANALISTAS)} redirectTo={fallbackRoute}>
              <AnalistasPanel projects={projects} contractors={contractors} onAddProposal={onAddProposal} onRemoveProposal={onRemoveProposal} onSubmitComparative={onSubmitComparative} onImportSupplierProposals={onImportSupplierProposals} isLoading={isLoadingApi} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.FINANZAS}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.FINANZAS)} redirectTo={fallbackRoute}>
              <FinanzasPanel projects={projects} onPayAdvance={onPayAdvance} onPayFinal={onPayFinal} isLoading={isLoadingApi} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CATALOGOS}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.CATALOGOS)} redirectTo={fallbackRoute}>
              <ProveedoresRegistrados contractors={contractors} projects={projects} authToken={authToken} onUpdateContractorRating={onUpdateContractorRating} isLoading={isLoadingApi} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CONFIG_PROVEEDORES}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.CONFIG_PROVEEDORES)} redirectTo={fallbackRoute}>
              <ProveedoresConfigPanel authToken={authToken} onContractorMutated={onContractorMutated} activeRole={activeRole} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CONFIG_MATERIALES}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.CONFIG_MATERIALES)} redirectTo={fallbackRoute}>
              <MaterialConfigPanel authToken={authToken} activeRole={activeRole} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CONFIG_IA}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.CONFIG_IA)} redirectTo={fallbackRoute}>
              <AIConfigPanel authToken={authToken} activeRole={activeRole}/>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CONFIG_APP}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.CONFIG_APP)} redirectTo={fallbackRoute}>
              <ConfigAppPanel authToken={authToken} activeRole={activeRole} />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.USUARIOS}
          element={
            <ProtectedRoute canAccess={canAccess(ROUTES.USUARIOS)} redirectTo={fallbackRoute}>
              <UsuariosPanel authToken={authToken} activeRole={activeRole} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={fallbackRoute} replace />} />
      </Routes>
    </AuthenticatedLayout>
  );
}
