/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 3 de Infraestructura/Mantenimiento: info de inversiones + listado
 * de peticiones del departamento — extraída de
 * InfraestructuraMantenimientoPanel.
 */

import { useState } from "react";
import { DollarSign, Eye, FilePlus2 } from "lucide-react";
import type { Project } from "../../types";
import Card from "../../components/UI/Card";
import InspectRequestModal from "../../components/Modals/InspectRequestModal";

interface RequestsListSectionProps {
  projects: Project[];
}

export default function RequestsListSection({ projects }: RequestsListSectionProps) {
  const [inspectedRequest, setInspectedRequest] = useState<Project | null>(null);

  return (
    <>
      <div className="bg-slate-900 text-slate-300 rounded-2xl p-6 border border-slate-800 shadow-md border-l-4 border-l-sky-400">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-sky-500/10 rounded-xl">
            <DollarSign className="h-4 w-4 text-sky-400" />
          </div>
          <div>
            <h4 className="font-mono font-bold text-[10px] uppercase tracking-widest text-sky-400">
              Gestión de Inversiones e Insumos
            </h4>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Al registrar una obra, la base de datos almacena el requerimiento técnico inicial de materiales.
            </p>
          </div>
        </div>
        <div className="mt-4 border-t border-slate-800 pt-4 space-y-4 text-xs">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-sky-500/10 text-sky-400 font-mono text-[10px] font-black shrink-0">1</span>
            <span className="text-slate-400 font-medium leading-relaxed">El departamento técnico define los metros cúbicos, sacos o lámparas estimadas.</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-sky-500/10 text-sky-400 font-mono text-[10px] font-black shrink-0">2</span>
            <span className="text-slate-400 font-medium leading-relaxed"><strong className="text-slate-300">Cierre de Obra</strong> verificará el volumen, los planos y la viabilidad física de la instalación.</span>
          </div>
        </div>
      </div>

      <div>
        <Card className="min-h-139 border-l-4 border-l-slate-400">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-4">
            <div className="p-2 bg-slate-100 rounded-xl">
              <FilePlus2 className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Peticiones del Departamento</h4>
              <p className="text-[10px] text-slate-400 font-medium">{projects.length} registradas</p>
            </div>
          </div>
          <div
            className="space-y-3 overflow-y-auto pr-1 max-h-[420px]"
            style={{ willChange: "scroll-position" }}
          >
            {projects.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-8">No hay peticiones registradas aún.</p>
            ) : (
              projects.map((p) => (
                <div
                  key={p.id}
                  className="p-4 border border-slate-100 bg-white rounded-xl space-y-2.5 hover:border-slate-200 hover:shadow-sm transition-all duration-200"
                  style={{ contentVisibility: "auto", contain: "layout style paint" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono font-bold text-sky-600">{p.id}</span>
                      <h5 className="text-xs font-bold text-slate-800 line-clamp-1 mt-0.5">{p.title}</h5>
                    </div>
                    <span className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-lg border shrink-0 ${
                      p.type === "INFRAESTRUCTURA" ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}>
                      {p.type === "INFRAESTRUCTURA" ? "INFRA" : "MANT"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 font-mono font-bold text-slate-700">
                      <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                      {p.estimatedTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        id={`btn-inspect-request-${p.id}`}
                        onClick={() => setInspectedRequest(p)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-sky-700 bg-sky-50 border border-sky-100 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        Inspeccionar
                      </button>
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-mono font-bold">{p.status}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <InspectRequestModal
        isOpen={!!inspectedRequest}
        project={inspectedRequest}
        onClose={() => setInspectedRequest(null)}
      />
    </>
  );
}
