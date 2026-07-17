/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Project, ProjectStatus, Contractor, AuditLog, Proposal } from "./types";
import { 
  INITIAL_CONTRACTORS, 
  MATERIAL_CATALOG, 
  INITIAL_PROJECTS, 
  INITIAL_AUDIT_LOGS 
} from "./data";

// Subcomponents
import PresidenciaDashboard from "./components/PresidenciaDashboard";
import InfraestructuraMantenimientoPanel from "./components/InfraestructuraMantenimientoPanel";
import CierreObraPanel from "./components/CierreObraPanel";
import ProcuraPanel from "./components/ProcuraPanel";
import AnalistasPanel from "./components/AnalistasPanel";
import FinanzasPanel from "./components/FinanzasPanel";
import MaterialesProveedores from "./components/MaterialesProveedores";
import ProveedoresRegistrados from "./components/ProveedoresRegistrados";
import PropuestaMaterialesPublica from "./components/PropuestaMaterialesPublica";
import UsuariosPanel from "./components/UsuariosPanel";

// Icons
import { 
  Building2, 
  TrendingUp, 
  CheckSquare, 
  FileSearch, 
  Users, 
  DollarSign, 
  Settings,
  X,
  MapPin,
  Calendar,
  CheckCircle,
  Menu,
  LogIn,
  LogOut,
  UserCog
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await onLogin(email, password);
    } catch (loginError) {
      console.error(loginError);
      setError("Correo o clave incorrectos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-white p-6 text-slate-900 shadow-2xl shadow-slate-950/40">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/20">
            <Building2 className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-950">IVOO Gestion</h1>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Acceso interno</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Correo</label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-semibold outline-hidden transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Clave</label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-semibold outline-hidden transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          <button
            id="btn-login-submit"
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LogIn className="h-4 w-4" />
            {isSubmitting ? "Validando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
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
  const activeRole = routeRoles[location.pathname] ?? "PRESIDENCIA";
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("ivoo_auth_token") ?? "");
  const [authUser, setAuthUser] = useState<{ name: string; email: string; role?: string } | null>(() => {
    const saved = localStorage.getItem("ivoo_auth_user");
    return saved ? JSON.parse(saved) : null;
  });

  const canAccess = (path: string) => {
    const role = authUser?.role ?? "PRESIDENCIA";
    return (roleAccess[role] ?? roleAccess["PRESIDENCIA"]).includes(path);
  };

  const firstAllowedRoute = (role: string) =>
    roleAccess[role]?.[0] ?? "/presidencia";

  /*const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [contractors, setContractors] = useState<Contractor[]>(INITIAL_CONTRACTORS);
  const [materialsCatalog, setMaterialsCatalog] = useState(MATERIAL_CATALOG);*/
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [materialsCatalog, setMaterialsCatalog] = useState([]);

  const [isLoadingApi, setIsLoadingApi] = useState(true);

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Inspect project detail state
  const [inspectedProject, setInspectedProject] = useState<Project | null>(null);

   const loadApiData = async () => {
      try {
        const authHeaders = { Accept: "application/json", Authorization: `Bearer ${authToken}` };
        const [projectsResponse, auditResponse, contractorsResponse, materialsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/projects`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/audit-logs`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/contractors`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/materials`, { headers: authHeaders }),
        ]);

        if (!projectsResponse.ok || !auditResponse.ok || !contractorsResponse.ok || !materialsResponse.ok) {
          throw new Error("No se pudo cargar la informacion desde Laravel.");
        }

        const projectsJson = await projectsResponse.json();
        const auditJson = await auditResponse.json();
        const contractorsJson = await contractorsResponse.json();
        const materialsJson = await materialsResponse.json();

        setProjects(projectsJson.data ?? projectsJson);
        setAuditLogs(auditJson.data ?? auditJson);
        setContractors(contractorsJson.data ?? contractorsJson);
        setMaterialsCatalog(materialsJson.data ?? materialsJson);
      } catch (error) {
        console.error(error);
        alert("No se pudo conectar con la API de Laravel. Se mostraran datos locales de respaldo.");
      } finally {
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
    const response = await fetch(`${API_BASE_URL}/audit-logs`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${authToken}` },
    });
    if (!response.ok) return;

    const json = await response.json();
    setAuditLogs(json.data ?? json);
  };

  const syncProject = async (response: Response) => {
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "La API rechazo la operacion.");
    }

    const json = await response.json();
    const project = json.data ?? json;
    setProjects(prev => [project, ...prev.filter(item => item.id !== project.id)]);
    setInspectedProject(prev => prev?.id === project.id ? project : prev);
    await refreshAuditLogs();
    loadApiData();
    return project as Project;
  };

  // --- Actions & Flow State Machine ---

  // 1. Infraestructura / Mantenimiento adds new work order
  const handleAddProject = async (newProj: Omit<Project, "id" | "createdDate" | "status">) => {
    try {
      await syncProject(await fetch(`${API_BASE_URL}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(newProj),
      }));
    } catch (error) {
      console.error(error);
      alert("No se pudo registrar la obra en Laravel.");
    }
  };

  // 2. Cierre de Obra reviews calculations and blueprints
  const handleReviewProject = async (projectId: string, notes: string, planFiles: File[], calcFiles: File[]) => {
    try {
      await syncProject(await fetch(`${API_BASE_URL}/projects/${projectId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ notes, blueprintsCount: planFiles.length, calculationsAdded: calcFiles.length > 0 }),
      }));

      const uploadGroup = async (files: File[], type: "PLANO" | "CALC") => {
        if (files.length === 0) return;
        const form = new FormData();
        form.append("document_type", type);
        files.forEach(f => form.append("files[]", f));
        await fetch(`${API_BASE_URL}/projects/${projectId}/documents`, {
          method: "POST",
          headers: { Accept: "application/json", Authorization: `Bearer ${authToken}` },
          body: form,
        });
      };

      await Promise.all([uploadGroup(planFiles, "PLANO"), uploadGroup(calcFiles, "CALC")]);

      // Reload project to get updated documents list
      const refreshed = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${authToken}` },
      });
      if (refreshed.ok) {
        const json = await refreshed.json();
        const project = json.data ?? json;
        setProjects(prev => [project, ...prev.filter(item => item.id !== project.id)]);
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar la revision tecnica.");
    }
  };

  // 3. Procura sets maximum approved budget investment limit
  const handleApproveInvestment = async (projectId: string, notes: string, approvedAmount: number) => {
    try {
      await syncProject(await fetch(`${API_BASE_URL}/projects/${projectId}/approve-investment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ notes, approvedInvestmentAmount: approvedAmount }),
      }));
    } catch (error) {
      console.error(error);
      alert("No se pudo aprobar la inversion.");
    }
  };

  // 4. Analysts submit new bids/proposals
  const handleAddProposal = async (projectId: string, proposal: Omit<Proposal, "id">) => {
    try {
      await syncProject(await fetch(`${API_BASE_URL}/projects/${projectId}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(proposal),
      }));
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar la propuesta.");
    }
  };

  const handleRemoveProposal = async (projectId: string, proposalId: string) => {
    try {
      await syncProject(await fetch(`${API_BASE_URL}/projects/${projectId}/proposals/${proposalId}`, {
        method: "DELETE",
        headers: { Accept: "application/json", Authorization: `Bearer ${authToken}` },
      }));
    } catch (error) {
      console.error(error);
      alert("No se pudo eliminar la propuesta.");
    }
  };

  // 4b. Analysts import supplier material proposals as comparative proposals
  const handleImportSupplierProposals = async (projectId: string): Promise<{ message: string; imported: number; skipped: number }> => {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/import-supplier-proposals`, {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${authToken}` },
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.message || "No se pudieron importar las propuestas de proveedores.");
    }

    // Update project in state
    if (json.project) {
      const project = json.project.data ?? json.project;
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
      await syncProject(await fetch(`${API_BASE_URL}/projects/${projectId}/submit-comparative`, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${authToken}` },
      }));
    } catch (error) {
      console.error(error);
      alert("No se pudo enviar el cuadro comparativo.");
    }
  };

  // 6. Procura awards/hires a contractor from the comparative list
  const handleSelectContractor = async (projectId: string, contractorCode: string, proposalId: string) => {
    try {
      await syncProject(await fetch(`${API_BASE_URL}/projects/${projectId}/select-contractor`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ contractorCode, proposalId }),
      }));
    } catch (error) {
      console.error(error);
      throw error; // propagar para que el modal muestre el feedback
    }
  };

  // 7. Procura rejects comparative proposals → back to CONFIRMADO_PROCURA
  const handleRejectProposals = async (projectId: string, reason: string) => {
    try {
      await syncProject(await fetch(`${API_BASE_URL}/projects/${projectId}/reject-proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ reason }),
      }));
    } catch (error) {
      console.error(error);
      alert("No se pudo rechazar el cuadro comparativo.");
    }
  };

  // 8. Finanzas pays the negotiated advance, setting project to active execution
  const handlePayAdvance = async (projectId: string, amount: number) => {
    try {
      await syncProject(await fetch(`${API_BASE_URL}/projects/${projectId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ paymentType: "ADVANCE", amount }),
      }));
    } catch (error) {
      console.error(error);
      alert("No se pudo registrar el anticipo.");
    }
  };

  // 8. Cierre de Obra audits work completed in field and certifies quality standards
  const handleVerifyCompletion = async (projectId: string) => {
    const project = projects.find(item => item.id === projectId);
    const isStartingVerification = project?.status === ProjectStatus.EN_EJECUCION;

    try {
      await syncProject(await fetch(
        `${API_BASE_URL}/projects/${projectId}/${isStartingVerification ? "report-finished" : "verify-completion"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${authToken}` },
          body: isStartingVerification ? undefined : JSON.stringify({ qualityVerified: true }),
        }
      ));
    } catch (error) {
      console.error(error);
      alert("No se pudo actualizar la verificacion de cierre.");
    }
  };

  // 9. Finanzas pays the final balance, fully closing the workflow
  const handlePayFinal = async (projectId: string, amount: number) => {
    try {
      await syncProject(await fetch(`${API_BASE_URL}/projects/${projectId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ paymentType: "FINAL", amount }),
      }));
    } catch (error) {
      console.error(error);
      alert("No se pudo registrar el pago final.");
    }
  };

  // --- Dynamic catalog handlers ---
  const handleAddContractor = (newContractor: Contractor) => {
    setContractors(prev => [...prev.filter(item => item.code !== newContractor.code), newContractor]);
  };

  const handleUpdateContractorRating = async (code: string, rating: number) => {
    const response = await fetch(`${API_BASE_URL}/contractors/${code}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ rating }),
    });
    if (!response.ok) throw new Error("No se pudo actualizar la evaluacion.");
    setContractors(prev => prev.map(c => c.code === code ? { ...c, rating } : c));
  };

  const handleAddCatalogItem = (newItem: { name: string; unit: string; estimatedUnitPrice: number }) => {
    setMaterialsCatalog(prev => [...prev, newItem]);
  };

  // --- Guided Demo Flows Simulation ---
  const handleTriggerDemo = async () => {
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
  };

  const handleResetApp = () => {
    alert("El reinicio ahora se realiza desde MySQL importando database.sql. La pantalla se recargara desde la API.");
    window.location.reload();
  };

  const handleLogin = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password, device_name: "web" }),
    });

    if (!response.ok) {
      throw new Error("Credenciales invalidas.");
    }

    const data = await response.json();
    localStorage.setItem("ivoo_auth_token", data.token);
    localStorage.setItem("ivoo_auth_user", JSON.stringify(data.user));
    setAuthToken(data.token);
    setAuthUser(data.user);
  };

  const handleLogout = async () => {
    if (authToken) {
      await fetch(`${API_BASE_URL}/logout`, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${authToken}` },
      }).catch(() => null);
    }

    localStorage.removeItem("ivoo_auth_token");
    localStorage.removeItem("ivoo_auth_user");
    setAuthToken("");
    setAuthUser(null);
    setProjects(INITIAL_PROJECTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setContractors(INITIAL_CONTRACTORS);
    setMaterialsCatalog(MATERIAL_CATALOG);
    navigate("/presidencia");
  };

  const navLinkClass = (activeClass: string) => ({ isActive }: { isActive: boolean }) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
      isActive ? activeClass : "text-slate-400 hover:bg-slate-900 hover:text-white"
    }`;

  const sidebarIconClass = (isActive: boolean, activeClass = "text-white") =>
    `h-4.5 w-4.5 shrink-0 ${isActive ? activeClass : "text-slate-400"}`;

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
      
      {/* Mobile Sidebar Back Drop */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar navigation */}
      <aside 
        className={`fixed inset-y-0 left-0 w-64 bg-[#0F172A] text-white border-r border-slate-800 z-50 flex flex-col transition-transform duration-300 transform lg:translate-x-0 lg:static lg:h-screen lg:sticky lg:top-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header (Logo/Brand) */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
              <Building2 className="h-5 w-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-white leading-none">IVOO GESTIÓN</h2>
              <span className="text-[9px] text-sky-400 font-mono tracking-wider font-extrabold px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700/50 mt-1 inline-block">INTEGRADO</span>
            </div>
          </div>
          <button 
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/50 cursor-pointer"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
          <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest px-3 mb-3">
            Flujos de Trabajo
          </div>

          {canAccess("/presidencia") && (
            <NavLink
              to="/presidencia"
              id="sidebar-presidencia"
              onClick={() => setIsMobileSidebarOpen(false)}
              className={navLinkClass("bg-slate-800 text-white shadow-sm border border-slate-700/50 font-black")}
            >
              {({ isActive }) => (
                <>
                  <TrendingUp className={sidebarIconClass(isActive, "text-sky-400")} />
                  <span>Presidencia</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/infraestructura") && (
            <NavLink
              to="/infraestructura"
              id="sidebar-infraestructura"
              onClick={() => setIsMobileSidebarOpen(false)}
              className={navLinkClass("bg-sky-500 text-white shadow-md shadow-sky-500/20 font-black")}
            >
              {({ isActive }) => (
                <>
                  <Building2 className={sidebarIconClass(isActive)} />
                  <span>Infra / Mant</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/cierre-obra") && (
            <NavLink
              to="/cierre-obra"
              id="sidebar-cierre"
              onClick={() => setIsMobileSidebarOpen(false)}
              className={navLinkClass("bg-blue-600 text-white shadow-md shadow-blue-600/20 font-black")}
            >
              {({ isActive }) => (
                <>
                  <CheckSquare className={sidebarIconClass(isActive)} />
                  <span>Cierre Obra</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/procura") && (
            <NavLink
              to="/procura"
              id="sidebar-procura"
              onClick={() => setIsMobileSidebarOpen(false)}
              className={navLinkClass("bg-purple-600 text-white shadow-md shadow-purple-600/20 font-black")}
            >
              {({ isActive }) => (
                <>
                  <FileSearch className={sidebarIconClass(isActive)} />
                  <span>Procura</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/analistas") && (
            <NavLink
              to="/analistas"
              id="sidebar-analistas"
              onClick={() => setIsMobileSidebarOpen(false)}
              className={navLinkClass("bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-black")}
            >
              {({ isActive }) => (
                <>
                  <Users className={sidebarIconClass(isActive)} />
                  <span>Analistas</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/finanzas") && (
            <NavLink
              to="/finanzas"
              id="sidebar-finanzas"
              onClick={() => setIsMobileSidebarOpen(false)}
              className={navLinkClass("bg-rose-600 text-white shadow-md shadow-rose-600/20 font-black")}
            >
              {({ isActive }) => (
                <>
                  <DollarSign className={sidebarIconClass(isActive)} />
                  <span>Finanzas</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/catalogos") && (
            <NavLink
              to="/catalogos"
              id="sidebar-catalogos"
              onClick={() => setIsMobileSidebarOpen(false)}
              className={navLinkClass("bg-slate-800 text-white border border-slate-700/50 font-black")}
            >
              {({ isActive }) => (
                <>
                  <Settings className={sidebarIconClass(isActive)} />
                  <span>Proveedores</span>
                </>
              )}
            </NavLink>
          )}

          {canAccess("/usuarios") && (
            <NavLink
              to="/usuarios"
              id="sidebar-usuarios"
              onClick={() => setIsMobileSidebarOpen(false)}
              className={navLinkClass("bg-sky-500 text-white shadow-md shadow-sky-500/20 font-black")}
            >
              {({ isActive }) => (
                <>
                  <UserCog className={sidebarIconClass(isActive)} />
                  <span>Usuarios</span>
                </>
              )}
            </NavLink>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 shrink-0">
          <button
            id="btn-logout"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-slate-400 hover:bg-slate-900 hover:text-white"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top Banner Header */}
        <header className="bg-[#0F172A] text-white border-b border-slate-800 shadow-sm relative overflow-hidden md:hidden">
          {/* Subtle accent gradient behind header */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="max-w-7xl mx-1 px-1 sm:px-6 lg:px-8 pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
    
            {/* Logo Brand with mobile Hamburger */}
            <div className="flex items-center gap-3.5">
              <button 
                id="btn-mobile-menu"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-850 rounded-xl mr-1 transition-colors cursor-pointer"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="w-11 h-11 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 transform hover:scale-105 transition-transform duration-300">
                <Building2 className="h-5 w-5 text-white stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-xl font-black font-sans tracking-tight text-white flex items-center gap-2">
                  IVOO GESTIÓN <span className="text-sky-400 font-mono text-[10px] tracking-wider font-extrabold px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/50">INTEGRADO</span>
                </h1>
                <p className="text-[11px] text-slate-400 font-mono uppercase tracking-widest font-semibold mt-0.5">
                  Core Base de Datos &amp; Workflow de Infraestructura
                </p>
              </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="hidden md:block text-slate-400 text-right">
                <div className="text-[20px] text-slate-500 mt-0.5">{authUser?.email ?? "Sesion activa"}</div>
              </div>
            </div>
          </div>
        </header>

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
                ? <ProcuraPanel projects={projects} onApproveInvestment={handleApproveInvestment} onSelectContractor={handleSelectContractor} onRejectProposals={handleRejectProposals} authToken={authToken} apiBaseUrl={API_BASE_URL} isLoading={isLoadingApi} />
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
      {inspectedProject && (
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
      )}

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
