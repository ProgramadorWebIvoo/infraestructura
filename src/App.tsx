/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Project, ProjectStatus, Contractor, AuditLog, Proposal } from "./types";
import {
  INITIAL_CONTRACTORS,
  MATERIAL_CATALOG,
  INITIAL_PROJECTS,
  INITIAL_AUDIT_LOGS,
} from "./data";

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
import { apiFetch } from "./services/api";

// Icons
import {
  X,
  MapPin,
  Calendar,
  CheckCircle,
} from "lucide-react";
import SidebarNav from "./components/UI/SidebarNav";
import MobileTopBar from "./components/UI/MobileTopBar";
import { ToastProvider, useToast } from "./components/UI/Toast";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </BrowserRouter>
  );
}


const routeRoles: Record<string, string> = {
  "/presidencia": "PRESIDENCIA",
  "/infraestructura": "INFRAESTRUCTURA",
  "/cierre-obra": "CIERRE_DE_OBRA",
  "/procura": "PROCURA",
  "/analistas": "ANALISTA",
  "/finanzas": "FINANZAS",
  "/catalogos": "CATALOGOS",
  "/usuarios": "ADMIN",
};

const roleAccess: Record<string, string[]> = {
  SUPERADMIN:     ["/presidencia", "/infraestructura", "/cierre-obra", "/procura", "/analistas", "/finanzas", "/catalogos", "/usuarios"],
  ADMIN:          ["/presidencia", "/infraestructura", "/cierre-obra", "/procura", "/analistas", "/finanzas", "/catalogos", "/usuarios"],
  PRESIDENCIA:    ["/presidencia", "/catalogos"],
  INFRAESTRUCTURA:["/presidencia", "/infraestructura"],
  CIERRE_DE_OBRA: ["/presidencia", "/cierre-obra"],
  PROCURA:        ["/presidencia", "/procura", "/catalogos"],
  ANALISTA:       ["/presidencia", "/analistas"],
  FINANZAS:       ["/presidencia", "/finanzas"],
  CATALOGOS:      ["/presidencia", "/catalogos"],
};

const publicRoutes = new Set(["/registro-proveedores"]);
const isPublicPath = (path: string) =>
  publicRoutes.has(path) || path.startsWith("/propuesta-materiales/");

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("ivoo_auth_token") ?? "");
  const [authUser, setAuthUser] = useState<{ name: string; email: string; role?: string } | null>(() => {
    const saved = localStorage.getItem("ivoo_auth_user");
    return saved ? JSON.parse(saved) : null;
  });
  const activeRole = authUser?.role ?? "PRESIDENCIA";

  const canAccess = (path: string) => {
    const role = authUser?.role ?? "PRESIDENCIA";
    return (roleAccess[role] ?? roleAccess["PRESIDENCIA"]).includes(path);
  };

  const firstAllowedRoute = (role: string) =>
    roleAccess[role]?.[0] ?? "/presidencia";

  const [projects, setProjects] = useState<Project[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [materialsCatalog, setMaterialsCatalog] = useState<{ name: string; unit: string; estimatedUnitPrice: number }[]>([]);

  const [isLoadingApi, setIsLoadingApi] = useState(true);
  const isFetchingRef = useRef(false);

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Inspect project detail state
  const [inspectedProject, setInspectedProject] = useState<Project | null>(null);

  const loadApiData = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const [projects, audit, contractors, materials] = await Promise.all([
          apiFetch<Project[]>("/projects", { token: authToken }),
          apiFetch<AuditLog[]>("/audit-logs", { token: authToken }),
          apiFetch<Contractor[]>("/contractors", { token: authToken }),
          apiFetch<{ name: string; unit: string; estimatedUnitPrice: number }[]>("/materials", { token: authToken }),
        ]);

        setProjects(projects);
        setAuditLogs(audit);
        setContractors(contractors);
        setMaterialsCatalog(materials);
      } catch (error) {
        console.error(error);
        setProjects(INITIAL_PROJECTS);
        setAuditLogs(INITIAL_AUDIT_LOGS);
        setContractors(INITIAL_CONTRACTORS);
        setMaterialsCatalog(MATERIAL_CATALOG);
        showToast("No se pudo conectar con la API. Cargando datos locales de respaldo.", "warning");
      } finally {
        isFetchingRef.current = false;
        setIsLoadingApi(false);
      }
    };

  useEffect(() => {
    if (!authToken) {
      setIsLoadingApi(false);
      return;
    }
    loadApiData();
  }, [authToken]);

  const refreshAuditLogs = async () => {
    try {
      const audit = await apiFetch<AuditLog[]>("/audit-logs", { token: authToken });
      setAuditLogs(audit);
    } catch {
      // silent fail on poll
    }
  };

  const syncProject = (project: Project) => {
    setProjects(prev => [project, ...prev.filter(item => item.id !== project.id)]);
    setInspectedProject(prev => prev?.id === project.id ? project : prev);
    refreshAuditLogs(); // solo refresca auditoría, no 4 endpoints
  };

  // --- Actions & Flow State Machine ---

  // 1. Infraestructura / Mantenimiento adds new work order
  const handleAddProject = async (newProj: Omit<Project, "id" | "createdDate" | "status">) => {
    try {
      const project = await apiFetch<Project>("/projects", {
        method: "POST",
        token: authToken,
        body: JSON.stringify(newProj),
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      showToast("No se pudo registrar la obra en Laravel.", "error");
    }
  };

  // 2. Cierre de Obra reviews calculations and blueprints
  const handleReviewProject = async (projectId: string, notes: string, planFiles: File[], calcFiles: File[]) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/review`, {
        method: "POST",
        token: authToken,
        body: JSON.stringify({ notes, blueprintsCount: planFiles.length, calculationsAdded: calcFiles.length > 0 }),
      });
      syncProject(project);

      const uploadGroup = async (files: File[], type: "PLANO" | "CALC") => {
        if (files.length === 0) return;
        const form = new FormData();
        form.append("document_type", type);
        files.forEach(f => form.append("files[]", f));
        await apiFetch(`/projects/${projectId}/documents`, {
          method: "POST",
          token: authToken,
          body: form,
        });
      };

      await Promise.all([uploadGroup(planFiles, "PLANO"), uploadGroup(calcFiles, "CALC")]);

      // Reload project to get updated documents list
      const refreshed = await apiFetch<Project>(`/projects/${projectId}`, { token: authToken });
      setProjects(prev => [refreshed, ...prev.filter(item => item.id !== refreshed.id)]);
    } catch (error) {
      console.error(error);
      showToast("No se pudo guardar la revisión técnica.", "error");
    }
  };

  // 3. Procura sets maximum approved budget investment limit
  const handleApproveInvestment = async (projectId: string, notes: string, approvedAmount: number) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/approve-investment`, {
        method: "POST",
        token: authToken,
        body: JSON.stringify({ notes, approvedInvestmentAmount: approvedAmount }),
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      showToast("No se pudo aprobar la inversión.", "error");
    }
  };

  // 4. Analysts submit new bids/proposals
  const handleAddProposal = async (projectId: string, proposal: Omit<Proposal, "id">) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/proposals`, {
        method: "POST",
        token: authToken,
        body: JSON.stringify(proposal),
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      showToast("No se pudo cargar la propuesta.", "error");
    }
  };

  const handleRemoveProposal = async (projectId: string, proposalId: string) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/proposals/${proposalId}`, {
        method: "DELETE",
        token: authToken,
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      showToast("No se pudo eliminar la propuesta.", "error");
    }
  };

  // 4b. Analysts import supplier material proposals as comparative proposals
  const handleImportSupplierProposals = async (projectId: string): Promise<{ message: string; imported: number; skipped: number }> => {
    const json = await apiFetch<{
      message: string;
      imported: number;
      skipped: number;
      project?: { data?: Project } | Project;
    }>(`/projects/${projectId}/import-supplier-proposals`, {
      method: "POST",
      token: authToken,
    });

    // Update project in state
    if (json.project) {
      const project = (json.project as { data?: Project }).data ?? (json.project as Project);
      setProjects(prev => [project, ...prev.filter(item => item.id !== project.id)]);
      setInspectedProject(prev => prev?.id === project.id ? project : prev);
    }

    await refreshAuditLogs();

    return {
      message: json.message,
      imported: json.imported ?? 0,
      skipped: json.skipped ?? 0,
    };
  };

  // 5. Analysts submit compiled comparative spreadsheet to Procura
  const handleSubmitComparative = async (projectId: string) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/submit-comparative`, {
        method: "POST",
        token: authToken,
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      showToast("No se pudo enviar el cuadro comparativo.", "error");
    }
  };

  // 6. Procura awards/hires a contractor from the comparative list
  const handleSelectContractor = async (projectId: string, contractorCode: string, proposalId: string) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/select-contractor`, {
        method: "POST",
        token: authToken,
        body: JSON.stringify({ contractorCode, proposalId }),
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      throw error; // propagar para que el modal muestre el feedback
    }
  };

  // 7. Procura rejects comparative proposals → back to CONFIRMADO_PROCURA
  const handleRejectProposals = async (projectId: string, reason: string) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/reject-proposals`, {
        method: "POST",
        token: authToken,
        body: JSON.stringify({ reason }),
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      showToast("No se pudo rechazar el cuadro comparativo.", "error");
    }
  };

  // 8. Finanzas pays the negotiated advance, setting project to active execution
  const handlePayAdvance = async (projectId: string, amount: number) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/payments`, {
        method: "POST",
        token: authToken,
        body: JSON.stringify({ paymentType: "ADVANCE", amount }),
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      showToast("No se pudo registrar el anticipo.", "error");
    }
  };

  // 8. Cierre de Obra audits work completed in field and certifies quality standards
  const handleVerifyCompletion = async (projectId: string) => {
    const project = projects.find(item => item.id === projectId);
    const isStartingVerification = project?.status === ProjectStatus.EN_EJECUCION;

    try {
      const updated = await apiFetch<Project>(
        `/projects/${projectId}/${isStartingVerification ? "report-finished" : "verify-completion"}`,
        {
          method: "POST",
          token: authToken,
          body: isStartingVerification ? undefined : JSON.stringify({ qualityVerified: true }),
        },
      );
      syncProject(updated);
    } catch (error) {
      console.error(error);
      showToast("No se pudo actualizar la verificación de cierre.", "error");
    }
  };

  // 9. Finanzas pays the final balance, fully closing the workflow
  const handlePayFinal = async (projectId: string, amount: number) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/payments`, {
        method: "POST",
        token: authToken,
        body: JSON.stringify({ paymentType: "FINAL", amount }),
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      showToast("No se pudo registrar el pago final.", "error");
    }
  };

  // --- Dynamic catalog handlers ---
  const handleAddContractor = (newContractor: Contractor) => {
    setContractors(prev => [...prev.filter(item => item.code !== newContractor.code), newContractor]);
  };

  const handleUpdateContractorRating = async (code: string, rating: number) => {
    await apiFetch(`/contractors/${code}/rating`, {
      method: "POST",
      token: authToken,
      body: JSON.stringify({ rating }),
    });
    setContractors(prev => prev.map(c => c.code === code ? { ...c, rating } : c));
  };

  const handleAddCatalogItem = (newItem: { name: string; unit: string; estimatedUnitPrice: number }) => {
    setMaterialsCatalog(prev => [...prev, newItem]);
  };

  // --- Guided Demo Flows Simulation ---
  const handleTriggerDemo = async () => {
    try {
      await handleAddProject({
        title: "Climatizacion de Sala de Servidores CD IVOO",
        type: "INFRAESTRUCTURA",
        description: "Reemplazo integral de unidades de aire de precision de 5 toneladas y renovacion de ducteria para el cuarto de datos central.",
        location: "Centro de Distribucion Central",
        materials: [
          { id: "dm1", name: "Lampara LED Industrial 150W", quantity: 6, unit: "Unidad", estimatedUnitPrice: 55.0 },
          { id: "dm2", name: "Cable de Cobre THHN #10 AWG", quantity: 2, unit: "Rollo (100m)", estimatedUnitPrice: 110.0 }
        ],
        estimatedTotal: 550.0
      });
      navigate("/cierre-obra");
    } catch {
      // Error ya manejado en handleAddProject via toast
    }
  };

  const handleResetApp = () => {
    showToast("Reinicio: importa database.sql en MySQL y recarga la página.", "info");
    window.location.reload();
  };

  const handleLogin = async (email: string, password: string) => {
    const data = await apiFetch<{ token: string; user: { name: string; email: string; role?: string } }>("/login", {
      method: "POST",
      body: JSON.stringify({ email, password, device_name: "web" }),
    });

    localStorage.setItem("ivoo_auth_token", data.token);
    localStorage.setItem("ivoo_auth_user", JSON.stringify(data.user));
    setAuthToken(data.token);
    setAuthUser(data.user);
  };

  const handleLogout = async () => {
    if (authToken) {
      await apiFetch("/logout", { method: "POST", token: authToken }).catch(() => null);
    }

    localStorage.removeItem("ivoo_auth_token");
    localStorage.removeItem("ivoo_auth_user");
    setAuthToken("");
    setAuthUser(null);
    setProjects([]);
    setAuditLogs([]);
    setContractors([]);
    setMaterialsCatalog([]);
    navigate("/presidencia");
  };

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

  if (!authToken) {
    return <LoginScreen onLogin={handleLogin} />;
  }

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
            <span className="text-slate-300">•</span>
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

      {/* --- INSPECT MODAL (DETALLE DE RETORNOS - MASTER PROJECT TIMELINE) --- */}
      {inspectedProject && createPortal(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">Expediente de Obra</span>
                <h3 className="text-md font-bold font-sans">{inspectedProject.title}</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{inspectedProject.id} • {inspectedProject.type}</p>
              </div>
              <button
                id="btn-close-inspect-modal"
                onClick={() => setInspectedProject(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Project attributes summary */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Ubicación física:</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {inspectedProject.location}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Fecha de Apertura:</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {inspectedProject.createdDate}
                  </div>
                </div>
              </div>

              {/* State Machine Step-by-Step Path */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1.5">
                  Trazabilidad de Retornos e Integraciones (Organigrama IVOO)
                </h4>

                <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  
                  {/* Step 1: Request creation */}
                  <div className="flex gap-3 relative">
                    <div className="w-7 h-7 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-xs font-bold text-white z-10 shrink-0 shadow-xs">
                      1
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Infraestructura / Mantenimiento</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">Registro técnico de requerimientos de insumos.</p>
                      <div className="mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600">
                        <strong>Descripción:</strong> {inspectedProject.description}
                        <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 font-mono font-medium text-slate-500">
                          Presupuesto Estimado Inicial: ${inspectedProject.estimatedTotal.toLocaleString()} USD
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Cierre de Obra */}
                  <div className="flex gap-3 relative">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white z-10 shrink-0 shadow-xs ${
                      inspectedProject.cierreObraNotes ? "bg-blue-600" : "bg-slate-200"
                    }`}>
                      2
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Revisión Técnica Cierre de Obra</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">Cálculos de inversión, volumen de material y planimetría.</p>
                      {inspectedProject.cierreObraNotes ? (
                        <div className="mt-1 bg-blue-50/40 p-2.5 rounded-lg border border-blue-100 text-[11px] text-slate-600">
                          <strong>Notas Cierre de Obra:</strong> {inspectedProject.cierreObraNotes}
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-blue-700 font-mono font-semibold">
                            <span>• Planos: {inspectedProject.blueprintsCount || 0}</span>
                            <span>• Cálculos: {inspectedProject.calculationsAdded ? "Adjuntados" : "No"}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">Paso pendiente de revisión técnica.</p>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Procura Approved Investment */}
                  <div className="flex gap-3 relative">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white z-10 shrink-0 shadow-xs ${
                      inspectedProject.approvedInvestmentAmount ? "bg-purple-600" : "bg-slate-200"
                    }`}>
                      3
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Aprobación Presupuestaria Procura</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">Autorización de inversión máxima autorizada para licitación.</p>
                      {inspectedProject.approvedInvestmentAmount ? (
                        <div className="mt-1 bg-purple-50/40 p-2.5 rounded-lg border border-purple-100 text-[11px] text-slate-600">
                          <strong>Tope Presupuestario:</strong> ${inspectedProject.approvedInvestmentAmount.toLocaleString()} USD
                          <p className="mt-1 text-slate-500"><strong>Nota Procura:</strong> {inspectedProject.procuraReviewNotes}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">Pendiente de tope presupuestario.</p>
                      )}
                    </div>
                  </div>

                  {/* Step 4: Analyst & Contractor bidding */}
                  <div className="flex gap-3 relative">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white z-10 shrink-0 shadow-xs ${
                      inspectedProject.proposals && inspectedProject.proposals.length > 0 ? "bg-emerald-600" : "bg-slate-200"
                    }`}>
                      4
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Licitación & Cuadro Comparativo Analistas</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">Carga de propuestas físicas y consolidación de terna.</p>
                      {inspectedProject.proposals && inspectedProject.proposals.length > 0 ? (
                        <div className="mt-1 space-y-1 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100 text-[11px]">
                          <span className="font-bold text-emerald-800 uppercase text-[9px] tracking-wider">Ofertas recibidas:</span>
                          <ul className="space-y-1 text-slate-600">
                            {inspectedProject.proposals.map(pr => (
                              <li key={pr.id} className="flex justify-between font-mono">
                                <span>{pr.contractorName} ({pr.contractorCode}):</span>
                                <span className="font-bold">${pr.totalCost.toLocaleString()}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">Pendiente de cotizaciones.</p>
                      )}
                    </div>
                  </div>

                  {/* Step 5: Contratación / Adjudicación */}
                  <div className="flex gap-3 relative">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white z-10 shrink-0 shadow-xs ${
                      inspectedProject.selectedContractorCode ? "bg-indigo-600" : "bg-slate-200"
                    }`}>
                      5
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Adjudicación por Procura</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">Adjudicación del contratista final de la base de datos.</p>
                      {inspectedProject.selectedContractorCode ? (
                        <div className="mt-1 bg-indigo-50/40 p-2.5 rounded-lg border border-indigo-100 text-[11px] text-slate-700 font-semibold">
                          Proveedor Adjudicado: {inspectedProject.selectedContractorCode}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">Pendiente de adjudicar ganador.</p>
                      )}
                    </div>
                  </div>

                  {/* Step 6: Finanzas payment of advance */}
                  <div className="flex gap-3 relative">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white z-10 shrink-0 shadow-xs ${
                      inspectedProject.advancePaidAmount ? "bg-rose-600" : "bg-slate-200"
                    }`}>
                      6
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Anticipo Finanzas (Inicio de Obra)</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">Liberación bancaria del anticipo para el arranque.</p>
                      {inspectedProject.advancePaidAmount ? (
                        <div className="mt-1 bg-rose-50/40 p-2.5 rounded-lg border border-rose-100 text-[11px] text-slate-600">
                          <strong>Anticipo Transferido:</strong> ${inspectedProject.advancePaidAmount.toLocaleString()} USD
                          <div className="text-[9px] text-slate-400 mt-0.5 font-mono">Fecha Valor: {inspectedProject.advancePaidDate}</div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">Arranque pendiente de pago de anticipo.</p>
                      )}
                    </div>
                  </div>

                  {/* Step 7: Quality and final verification */}
                  <div className="flex gap-3 relative">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white z-10 shrink-0 shadow-xs ${
                      inspectedProject.qualityVerified ? "bg-green-600" : "bg-slate-200"
                    }`}>
                      7
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Auditoría & Calidad Cierre de Obra</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">Inspección final física de la infraestructura completada.</p>
                      {inspectedProject.qualityVerified ? (
                        <div className="mt-1 bg-green-50/40 p-2.5 rounded-lg border border-green-100 text-[11px] text-slate-600 flex items-center gap-1.5 font-semibold text-green-800">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Obra certificada con estándares óptimos el {inspectedProject.completionVerifiedDate}.
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">Pendiente de verificación técnica final de calidad.</p>
                      )}
                    </div>
                  </div>

                  {/* Step 8: Final payment */}
                  <div className="flex gap-3 relative">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white z-10 shrink-0 shadow-xs ${
                      inspectedProject.finalPaidAmount ? "bg-green-700" : "bg-slate-200"
                    }`}>
                      8
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Liquidación Final Finanzas</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">Pago de liquidación del saldo restante y cierre de cuenta.</p>
                      {inspectedProject.finalPaidAmount ? (
                        <div className="mt-1 bg-green-950 text-white p-2.5 rounded-lg text-[11px] font-semibold">
                          Liquidación Final de ${inspectedProject.finalPaidAmount.toLocaleString()} USD Transferida el {inspectedProject.finalPaidDate}.
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">Pendiente de liquidación bancaria.</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                id="btn-close-inspect-footer"
                onClick={() => setInspectedProject(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Entendido
              </button>
            </div>

          </div>
        </div>
      , document.body)}

      {/* Footer copyright */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto px-4">
          IVOO Gestión de Infraestructura &copy; {new Date().getFullYear()} • Organigrama Integrado IVOO • Todos los derechos reservados.
        </div>
      </footer>

      </div>
    </div>
  );
}
