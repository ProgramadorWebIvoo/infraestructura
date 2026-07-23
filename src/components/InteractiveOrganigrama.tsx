/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ProjectStatus } from "../types";
import type { Project } from "../types";
import { 
  Building2, 
  Database, 
  CheckSquare, 
  FileSearch, 
  Users, 
  DollarSign, 
  TrendingUp, 
  FileText,
  Clock,
  ChevronRight
} from "lucide-react";

interface InteractiveOrganigramaProps {
  projects: Project[];
  activeRole: string;
  onSelectRole: (role: string) => void;
}

export default function InteractiveOrganigrama({
  projects,
  activeRole,
  onSelectRole,
}: InteractiveOrganigramaProps) {
  
  // Calculate pending items per role
  const getPendingCount = (role: string) => {
    switch (role) {
      case "CIERRE_DE_OBRA":
        return projects.filter(
          p => p.status === ProjectStatus.CREADO || p.status === ProjectStatus.VERIFICANDO_FINALIZACION
        ).length;
      case "PROCURA":
        return projects.filter(
          p => p.status === ProjectStatus.REVISADO_CIERRE || p.status === ProjectStatus.COMPARATIVA_ENVIADA
        ).length;
      case "ANALISTA":
        return projects.filter(p => p.status === ProjectStatus.CONFIRMADO_PROCURA).length;
      case "FINANZAS":
        return projects.filter(
          p => p.status === ProjectStatus.CONTRATADO || p.status === ProjectStatus.LISTO_PAGO_FINAL
        ).length;
      case "INFRAESTRUCTURA":
      case "MANTENIMIENTO":
        return projects.filter(p => p.status === ProjectStatus.EN_EJECUCION).length;
      case "PRESIDENCIA":
        return projects.length;
      default:
        return 0;
    }
  };

  const rolesDetails = [
    {
      id: "PRESIDENCIA",
      title: "Presidencia ↔ Base de Datos",
      description: "Presidencia es el único que tiene acceso directo a la base de datos completa. Visualiza el proceso, condiciones e inversión en tiempo real de cualquier trabajo u obra que se esté realizando.",
      color: "border-amber-500 bg-amber-50/70 text-amber-900",
      icon: TrendingUp,
      statusLabel: "Obras activas bajo supervisión"
    },
    {
      id: "CIERRE_DE_OBRA",
      title: "Infraestructura ↔ Cierre de Obra ↔ Mantenimiento",
      description: "Revisa las peticiones de inversión, calcula materiales y valida planos de obra. Al finalizar las obras, inspecciona que cumplan con los estándares de calidad antes de enviar la conformidad a la base de datos para el pago final.",
      color: "border-blue-600 bg-blue-50/70 text-blue-900",
      icon: CheckSquare,
      statusLabel: "Revisiones y verificaciones técnicas pendientes"
    },
    {
      id: "PROCURA",
      title: "Base de Datos ↔ Procura (Gerencia)",
      description: "Recibe las peticiones técnicas aprobadas por Cierre de Obra. Revisa montos de inversión inicial, autoriza el envío de peticiones a licitación con Analistas, compara ofertas finales y confirma la contratación del contratista ganador.",
      color: "border-purple-600 bg-purple-50/70 text-purple-900",
      icon: FileSearch,
      statusLabel: "Aprobaciones de inversión y contratación pendientes"
    },
    {
      id: "ANALISTA",
      title: "Base de Datos ↔ Analistas de Procura",
      description: "Recibe peticiones aprobadas de Procura y las licita a contratistas (quienes operan bajo códigos únicos de proveedor). Analiza propuestas de costos/tiempos y arma los cuadros comparativos para enviarlos a la base de datos.",
      color: "border-emerald-600 bg-emerald-50/70 text-emerald-900",
      icon: Users,
      statusLabel: "Licitaciones y cuadros comparativos pendientes"
    },
    {
      id: "FINANZAS",
      title: "Base de Datos ↔ Finanzas",
      description: "Al confirmarse una contratación, Finanzas libera el anticipo pactado por los analistas para iniciar las obras. Al finalizar la obra (aprobada por Cierre de Obra), libera la totalidad de los fondos.",
      color: "border-rose-600 bg-rose-50/70 text-rose-900",
      icon: DollarSign,
      statusLabel: "Pagos de anticipos o liberación de fondos pendientes"
    }
  ];

  const currentRoleInfo = rolesDetails.find(r => r.id === activeRole) || rolesDetails[0];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-300">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left column: Visual Org chart mapping the uploaded diagram */}
        <div className="flex-1">
          <h3 className="font-sans font-bold text-slate-900 text-lg mb-1 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-sky-500" />
            Flujo de Decisiones Organigrama IVOO
          </h3>
          <p className="text-xs text-slate-500 mb-6 font-medium">
            Visualización interactiva del flujo del sistema. Haz clic en cualquier departamento para ver sus responsabilidades y expedientes pendientes.
          </p>
 
          <div className="flex flex-col items-center gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 overflow-x-auto min-w-[320px]">
            
            {/* PRESIDENCIA */}
            <button
              id="org-node-presidencia"
              onClick={() => onSelectRole("PRESIDENCIA")}
              className={`w-48 p-3 rounded-xl border text-center transition-all cursor-pointer ${
                activeRole === "PRESIDENCIA"
                  ? "border-slate-900 bg-slate-900 text-white shadow-md scale-[1.03]"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              <div className={`font-mono text-[10px] font-bold tracking-wider ${activeRole === "PRESIDENCIA" ? "text-sky-400" : "text-slate-500"}`}>PRESIDENCIA</div>
              <div className="font-sans font-semibold text-xs mt-0.5">Supervisión en Tiempo Real</div>
              <div className={`mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-bold font-mono uppercase ${activeRole === "PRESIDENCIA" ? "bg-slate-800 text-sky-300" : "bg-sky-50 text-sky-700"}`}>
                DB Master ({getPendingCount("PRESIDENCIA")})
              </div>
            </button>
 
            {/* Down Arrow / Line to DB */}
            <div className="h-4 w-0.5 bg-slate-300"></div>
 
            {/* BASE DE DATOS (Central Hub) */}
            <div className="w-52 p-3 rounded-xl border border-sky-100 bg-sky-50 text-center shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-sky-800 font-bold text-xs tracking-wider font-mono">
                <Database className="h-3.5 w-3.5 text-sky-500 animate-pulse" />
                BASE DE DATOS IVOO
              </div>
              <div className="text-[9px] text-sky-600 font-bold font-mono uppercase tracking-wide mt-0.5">Núcleo Centralizador</div>
            </div>
 
            {/* Connector Lines to Departments */}
            <div className="w-full max-w-lg flex items-center justify-between px-6 -mt-1">
              <div className="w-1/3 h-4 border-t-2 border-l-2 border-dashed border-slate-300 rounded-tl-lg"></div>
              <div className="w-0.5 h-4 bg-slate-300"></div>
              <div className="w-1/3 h-4 border-t-2 border-r-2 border-dashed border-slate-300 rounded-tr-lg"></div>
            </div>
 
            {/* 3 Columns: Left (Cierre / Infra), Center (Procura/Analistas), Right (Finanzas) */}
            <div className="w-full grid grid-cols-3 gap-2">
              
              {/* Left Column: CIERRE DE OBRA (Infraestructura) */}
              <div className="flex flex-col items-center">
                <button
                  id="org-node-cierre"
                  onClick={() => onSelectRole("CIERRE_DE_OBRA")}
                  className={`w-full max-w-[140px] p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    activeRole === "CIERRE_DE_OBRA"
                      ? "border-blue-600 bg-blue-600 text-white shadow-md scale-[1.03]"
                      : "border-slate-200 bg-white text-slate-800 hover:border-blue-400"
                  }`}
                >
                  <div className={`font-mono text-[9px] font-bold ${activeRole === "CIERRE_DE_OBRA" ? "text-blue-200" : "text-blue-700"}`}>CIERRE DE OBRA</div>
                  <div className="text-[10px] font-medium mt-0.5">Revisión Técnica</div>
                  {getPendingCount("CIERRE_DE_OBRA") > 0 && (
                    <span className={`mt-1.5 inline-block text-[9px] font-bold font-mono px-2 py-0.5 rounded-lg ${activeRole === "CIERRE_DE_OBRA" ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-800"}`}>
                      {getPendingCount("CIERRE_DE_OBRA")} Pend.
                    </span>
                  )}
                </button>
                <div className="h-3 w-0.5 bg-slate-300"></div>
                <div className="text-[9px] font-mono font-bold text-slate-400 bg-white px-2 py-0.5 border border-slate-200 rounded-lg">
                  Infraestructura
                </div>
              </div>
 
              {/* Center Column: PROCURA & ANALISTAS */}
              <div className="flex flex-col items-center">
                <button
                  id="org-node-procura"
                  onClick={() => onSelectRole("PROCURA")}
                  className={`w-full max-w-[140px] p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    activeRole === "PROCURA"
                      ? "border-purple-600 bg-purple-600 text-white shadow-md scale-[1.03]"
                      : "border-slate-200 bg-white text-slate-800 hover:border-purple-400"
                  }`}
                >
                  <div className={`font-mono text-[9px] font-bold ${activeRole === "PROCURA" ? "text-purple-200" : "text-purple-700"}`}>GERENCIA PROCURA</div>
                  <div className="text-[10px] font-medium mt-0.5">Inversión</div>
                  {getPendingCount("PROCURA") > 0 && (
                    <span className={`mt-1.5 inline-block text-[9px] font-bold font-mono px-2 py-0.5 rounded-lg ${activeRole === "PROCURA" ? "bg-purple-700 text-white" : "bg-purple-50 text-purple-800"}`}>
                      {getPendingCount("PROCURA")} Pend.
                    </span>
                  )}
                </button>
                <div className="h-3 w-0.5 bg-slate-300"></div>
                <button
                  id="org-node-analistas"
                  onClick={() => onSelectRole("ANALISTA")}
                  className={`w-full max-w-[140px] p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    activeRole === "ANALISTA"
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-md scale-[1.03]"
                      : "border-slate-200 bg-white text-slate-800 hover:border-emerald-400"
                  }`}
                >
                  <div className={`font-mono text-[9px] font-bold ${activeRole === "ANALISTA" ? "text-emerald-200" : "text-emerald-700"}`}>ANALISTAS</div>
                  <div className="text-[10px] font-medium mt-0.5">Licitaciones</div>
                  {getPendingCount("ANALISTA") > 0 && (
                    <span className={`mt-1.5 inline-block text-[9px] font-bold font-mono px-2 py-0.5 rounded-lg ${activeRole === "ANALISTA" ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-800"}`}>
                      {getPendingCount("ANALISTA")} Licit.
                    </span>
                  )}
                </button>
              </div>
 
              {/* Right Column: FINANZAS */}
              <div className="flex flex-col items-center">
                <button
                  id="org-node-finanzas"
                  onClick={() => onSelectRole("FINANZAS")}
                  className={`w-full max-w-[140px] p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    activeRole === "FINANZAS"
                      ? "border-rose-600 bg-rose-600 text-white shadow-md scale-[1.03]"
                      : "border-slate-200 bg-white text-slate-800 hover:border-rose-400"
                  }`}
                >
                  <div className={`font-mono text-[9px] font-bold ${activeRole === "FINANZAS" ? "text-rose-200" : "text-rose-700"}`}>FINANZAS</div>
                  <div className="text-[10px] font-medium mt-0.5">Fondos</div>
                  {getPendingCount("FINANZAS") > 0 && (
                    <span className={`mt-1.5 inline-block text-[9px] font-bold font-mono px-2 py-0.5 rounded-lg ${activeRole === "FINANZAS" ? "bg-rose-700 text-white" : "bg-rose-50 text-rose-800"}`}>
                      {getPendingCount("FINANZAS")} Pagos
                    </span>
                  )}
                </button>
                <div className="h-3 w-0.5 bg-slate-300"></div>
                <div className="text-[9px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 border border-slate-200 rounded-lg">
                  Mantenimiento
                </div>
              </div>
 
            </div>
 
          </div>
        </div>
 
        {/* Right column: Selected Department description / responsibilities */}
        <div className="flex-1 bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl border ${currentRoleInfo.color.split(" ")[0]} ${currentRoleInfo.color.split(" ")[1]} shadow-sm`}>
                <currentRoleInfo.icon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-sans font-bold text-slate-900 text-md leading-snug">
                  {currentRoleInfo.title}
                </h4>
                <p className="font-mono text-[9px] text-sky-600 uppercase tracking-widest font-extrabold mt-0.5">
                  Rol Actual Seleccionado
                </p>
              </div>
            </div>
 
            <div className="mt-4 border-t border-slate-200 pt-3">
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Reglas de Retornos y Enlaces (Organigrama):
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {currentRoleInfo.description}
              </p>
            </div>
          </div>
 
          <div className="mt-6 border-t border-slate-200 pt-4">
            <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {currentRoleInfo.statusLabel}
                </div>
                <div className="text-base font-black text-slate-900 font-mono mt-0.5">
                  {getPendingCount(activeRole)} {getPendingCount(activeRole) === 1 ? "proyecto" : "proyectos"}
                </div>
              </div>
              <button
                id="btn-goto-role-panel"
                onClick={() => onSelectRole(activeRole)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors shadow-md shadow-sky-500/10 cursor-pointer"
              >
                Ir al Panel
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
 
        </div>
 
      </div>
    </div>
  );
}
