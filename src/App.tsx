/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Punto de entrada de la SPA. Compone hooks por dominio y renderiza
 * las rutas con control de acceso por rol.
 */

import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

// Views
import PresidenciaDashboard from "./views/PresidenciaDashboard";
import InfraestructuraMantenimientoPanel from "./views/InfraestructuraMantenimientoPanel";
import CierreObraPanel from "./views/CierreObraPanel";
import ProcuraPanel from "./views/ProcuraPanel";
import AnalistasPanel from "./views/AnalistasPanel";
import FinanzasPanel from "./views/FinanzasPanel";
import MaterialesProveedores from "./views/MaterialesProveedores";
import ProveedoresRegistrados from "./views/ProveedoresRegistrados";
import PropuestaMaterialesPublica from "./views/PropuestaMaterialesPublica";
import UsuariosPanel from "./views/UsuariosPanel";
import LoginScreen from "./views/LoginScreen";

// UI
import SidebarNav from "./components/UI/SidebarNav";
import MobileTopBar from "./components/UI/MobileTopBar";
import InspectProjectModal from "./components/InspectProjectModal";
import { ToastProvider, useToast } from "./components/UI/Toast";

// Hooks por dominio
import { useAuth, isPublicPath } from "./hooks/useAuth";
import { useProjects } from "./hooks/useProjects";
import { useContractors } from "./hooks/useContractors";
import { useCatalog } from "./hooks/useCatalog";

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------

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
// AppRoutes — toda la lógica de ruteo y layout
// ---------------------------------------------------------------------------

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // ---- Auth ----
  const {
    authToken,
    authUser,
    activeRole,
    canAccess,
    firstAllowedRoute,
    handleLogin,
    handleLogout: authLogout,
  } = useAuth();

  // ---- Contractors ----
  const {
    contractors,
    setContractors,
    handleAddContractor,
    handleUpdateContractorRating,
    resetContractors,
  } = useContractors(authToken);

  // ---- Catalog ----
  const {
    materialsCatalog,
    setMaterialsCatalog,
    handleAddCatalogItem,
    resetCatalog,
  } = useCatalog();

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
  } = useProjects(authToken, showToast, {
    onContractorsLoaded: (data) => setContractors(data as any),
    onMaterialsLoaded: (data) => setMaterialsCatalog(data),
  });

  // ---- Logout compuesto (limpia auth + datos) ----
  const handleLogout = async () => {
    await authLogout();
    resetData();
    resetContractors();
    resetCatalog();
    navigate("/presidencia");
  };

  // ---- UI state ----
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // ---- Public routes (sin auth) ----
  if (isPublicPath(location.pathname)) {
    return (
      <Routes>
        <Route
          path="/registro-proveedores"
          element={
            <MaterialesProveedores
              contractorsCount={contractors.length}
              onAddContractor={handleAddContractor}
            />
          }
        />
        <Route path="/propuesta-materiales/:token" element={<PropuestaMaterialesPublica />} />
        <Route path="*" element={<Navigate to="/registro-proveedores" replace />} />
      </Routes>
    );
  }

  // ---- No autenticado ----
  if (!authToken) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // ---- Layout autenticado ----
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex font-sans antialiased">

      <SidebarNav
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        user={authUser}
        onLogout={handleLogout}
        canAccess={canAccess}
      />

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">

        <MobileTopBar
          user={authUser}
          onMenuClick={() => setIsMobileSidebarOpen(true)}
        />

        {/* Main Workspace Body */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* Dynamic Role Indicator Notification */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-xs gap-3">
            <div className="flex items-center gap-2.5 text-xs text-slate-500">
              <span className="font-mono text-sky-600 font-bold uppercase tracking-wider text-[10px]">Base de datos unificada:</span>
              <span className="font-semibold text-slate-700">{projects.length} Obras</span>
              <span className="text-slate-300">&bull;</span>
              <span className="font-semibold text-slate-700">{contractors.length} Proveedores</span>
            </div>
            <div className="inline-flex items-center gap-1.5 self-start sm:self-auto text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
              <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse"></span>
              Terminal: {activeRole}
            </div>
          </div>

          {/* Route-driven module rendering */}
          <div className="transition-all duration-300">
            <Routes>
              <Route
                path="/"
                element={<Navigate to={firstAllowedRoute(authUser?.role ?? "PRESIDENCIA")} replace />}
              />
              <Route
                path="/presidencia"
                element={canAccess("/presidencia")
                  ? <PresidenciaDashboard projects={projects} auditLogs={auditLogs} onSelectProject={(p) => setInspectedProject(p)} isLoading={isLoadingApi} />
                  : <Navigate to={firstAllowedRoute(authUser?.role ?? "PRESIDENCIA")} replace />}
              />
              <Route
                path="/infraestructura"
                element={canAccess("/infraestructura")
                  ? <InfraestructuraMantenimientoPanel onAddProject={handleAddProject} projects={projects} materialsCatalog={materialsCatalog} isLoading={isLoadingApi} />
                  : <Navigate to={firstAllowedRoute(authUser?.role ?? "PRESIDENCIA")} replace />}
              />
              <Route
                path="/cierre-obra"
                element={canAccess("/cierre-obra")
                  ? <CierreObraPanel projects={projects} onReviewProject={handleReviewProject} onVerifyCompletion={handleVerifyCompletion} isLoading={isLoadingApi} />
                  : <Navigate to={firstAllowedRoute(authUser?.role ?? "PRESIDENCIA")} replace />}
              />
              <Route
                path="/procura"
                element={canAccess("/procura")
                  ? <ProcuraPanel projects={projects} onApproveInvestment={handleApproveInvestment} onSelectContractor={handleSelectContractor} onRejectProposals={handleRejectProposals} authToken={authToken} isLoading={isLoadingApi} />
                  : <Navigate to={firstAllowedRoute(authUser?.role ?? "PRESIDENCIA")} replace />}
              />
              <Route
                path="/analistas"
                element={canAccess("/analistas")
                  ? <AnalistasPanel projects={projects} contractors={contractors} onAddProposal={handleAddProposal} onRemoveProposal={handleRemoveProposal} onSubmitComparative={handleSubmitComparative} onImportSupplierProposals={handleImportSupplierProposals} isLoading={isLoadingApi} />
                  : <Navigate to={firstAllowedRoute(authUser?.role ?? "PRESIDENCIA")} replace />}
              />
              <Route
                path="/finanzas"
                element={canAccess("/finanzas")
                  ? <FinanzasPanel projects={projects} onPayAdvance={handlePayAdvance} onPayFinal={handlePayFinal} isLoading={isLoadingApi} />
                  : <Navigate to={firstAllowedRoute(authUser?.role ?? "PRESIDENCIA")} replace />}
              />
              <Route
                path="/catalogos"
                element={canAccess("/catalogos")
                  ? <ProveedoresRegistrados contractors={contractors} projects={projects} authToken={authToken} onUpdateContractorRating={handleUpdateContractorRating} isLoading={isLoadingApi} />
                  : <Navigate to={firstAllowedRoute(authUser?.role ?? "PRESIDENCIA")} replace />}
              />
              <Route
                path="/usuarios"
                element={canAccess("/usuarios")
                  ? <UsuariosPanel authToken={authToken} />
                  : <Navigate to={firstAllowedRoute(authUser?.role ?? "PRESIDENCIA")} replace />}
              />
              <Route path="*" element={<Navigate to={firstAllowedRoute(authUser?.role ?? "PRESIDENCIA")} replace />} />
            </Routes>
          </div>

        </main>

        {/* Inspect Modal */}
        {inspectedProject && (
          <InspectProjectModal project={inspectedProject} onClose={() => setInspectedProject(null)} />
        )}

        {/* Footer copyright */}
        <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-400 font-medium">
          <div className="max-w-7xl mx-auto px-4">
            IVOO Gestión de Infraestructura &copy; {new Date().getFullYear()} &bull; Organigrama Integrado IVOO &bull; Todos los derechos reservados.
          </div>
        </footer>

      </div>
    </div>
  );
}
