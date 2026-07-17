/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Project, ProjectStatus, Contractor, Proposal } from "../types";
import { 
  Users, 
  Plus, 
  Send, 
  Trash2, 
  DollarSign, 
  Clock, 
  FileSpreadsheet, 
  Award,
  AlertCircle,
  FolderOpen
} from "lucide-react";

interface AnalistasPanelProps {
  projects: Project[];
  contractors: Contractor[];
  onAddProposal: (projectId: string, proposal: Omit<Proposal, "id">) => void;
  onRemoveProposal: (projectId: string, proposalId: string) => void;
  onSubmitComparative: (projectId: string) => void;
}

export default function AnalistasPanel({
  projects,
  contractors,
  onAddProposal,
  onRemoveProposal,
  onSubmitComparative,
}: AnalistasPanelProps) {
  // States
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [contractorCode, setContractorCode] = useState(contractors[0]?.code ?? "");
  const [materialCost, setMaterialCost] = useState<number | "">(1000);
  const [laborCost, setLaborCost] = useState<number | "">(800);
  const [deliveryWeeks, setDeliveryWeeks] = useState<number | "">(2);
  const [advancePercent, setAdvancePercent] = useState(30);
  const [description, setDescription] = useState("");

  const pendingLicitacion = projects.filter(p => p.status === ProjectStatus.CONFIRMADO_PROCURA);
  const activeProject = pendingLicitacion.find(p => p.id === selectedProjectId);

  const handleAddProposal = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(selectedProjectId,contractorCode)
    if (!selectedProjectId) return;
    
    const contractor = contractors.find(c => c.code === contractorCode);
    if (!contractor) return;
   
    const matCostNum = Number(materialCost || 0);
    const laborCostNum = Number(laborCost || 0);
    const delWeeksNum = Number(deliveryWeeks || 1);

    onAddProposal(selectedProjectId, {
      contractorCode: contractor.code,
      contractorName: contractor.name,
      contractorRating: contractor.rating,
      materialCost: matCostNum,
      laborCost: laborCostNum,
      totalCost: matCostNum + laborCostNum,
      deliveryWeeks: delWeeksNum,
      negotiatedAdvancePercent: advancePercent,
      description: description.trim() || `Propuesta para trabajos de ${activeProject?.title}. Incluye materiales e instalación certificada.`
    });

    // Reset bid specific states
    setDescription("");
    // Give some random variations for the next bid to speed up testing
    setMaterialCost(Math.round((matCostNum * 0.95 + Math.random() * 200) / 10) * 10);
    setLaborCost(Math.round((laborCostNum * 1.05 + Math.random() * 100) / 10) * 10);
    setDeliveryWeeks(Math.max(1, delWeeksNum + (Math.random() > 0.5 ? 1 : -1)));
  };

  const handleSubmit = () => {
    if (!selectedProjectId) return;
    if (!activeProject?.proposals || activeProject.proposals.length === 0) {
      alert("Debes agregar al menos una propuesta antes de enviar el cuadro comparativo.");
      return;
    }
    onSubmitComparative(selectedProjectId);
    setSelectedProjectId("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Left panel: Active Licitations and Adder */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5 mb-6">
            <div className="bg-sky-50 text-sky-600 p-2.5 rounded-xl border border-sky-100">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-slate-900 text-base">Carga de Propuestas de Contratistas</h3>
              <p className="text-xs text-slate-500 font-medium">Reciba y digitalice ofertas para consolidar cuadros comparativos. Los contratistas operan bajo códigos únicos asignados.</p>
            </div>
          </div>

          {pendingLicitacion.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <FolderOpen className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No hay expedientes en licitación activa</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">Vaya al panel de <strong>Procura</strong> o <strong>Cierre de Obra</strong> para avanzar flujos.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select Project */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Seleccionar Expediente a Cotizar:</label>
                <select
                  id="analistas-project-selector"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full text-xs px-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-semibold text-slate-800"
                >
                  <option value="">-- Seleccionar Obra Aprobada para Licitación --</option>
                  {pendingLicitacion.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} - {p.title} (${p.approvedInvestmentAmount?.toLocaleString("en-US")} Max)
                    </option>
                  ))}
                </select>
              </div>

              {activeProject && (
                <div className="space-y-5 pt-2">
                  {/* Adder Form */}
                  <form onSubmit={handleAddProposal} className="p-5 bg-slate-50/80 rounded-xl border border-slate-100 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-sky-500 stroke-[2.5]" />
                      Registrar Oferta del Proveedor
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Proveedor / Contratista</label>
                        <select
                          id="analistas-contractor"
                          value={contractorCode}
                          onChange={(e) => setContractorCode(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 text-slate-700 font-bold"
                        >
                          {contractors.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Semanas de Ejecución</label>
                        <input
                          id="analistas-weeks"
                          type="number"
                          min="1"
                          value={deliveryWeeks}
                          onChange={(e) => { const v = e.target.value.replace(/[eE]/g, ''); setDeliveryWeeks(v === "" ? "" : Math.max(0, parseInt(v) || 1)); }}
                          onKeyDown={(e) => { if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === 'Subtract') e.preventDefault(); }}
                          onPaste={(e) => { e.preventDefault(); const v = e.clipboardData.getData('text/plain').replace(/[eE]/g, ''); setDeliveryWeeks(v === "" ? "" : Math.max(0, parseInt(v) || 1)); }}
                          placeholder="0"
                          className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Costo Materiales ($)</label>
                        <input
                          id="analistas-mat-cost"
                          type="number"
                          value={materialCost}
                          onChange={(e) => { const v = e.target.value.replace(/[eE]/g, ''); setMaterialCost(v === "" ? "" : Math.max(0, parseFloat(v) || 0)); }}
                          onKeyDown={(e) => { if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === 'Subtract') e.preventDefault(); }}
                          onPaste={(e) => { e.preventDefault(); const v = e.clipboardData.getData('text/plain').replace(/[eE]/g, ''); setMaterialCost(v === "" ? "" : Math.max(0, parseFloat(v) || 0)); }}
                          placeholder="0.00"
                          className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Costo Mano de Obra ($)</label>
                        <input
                          id="analistas-labor-cost"
                          type="number"
                          value={laborCost}
                          onChange={(e) => { const v = e.target.value.replace(/[eE]/g, ''); setLaborCost(v === "" ? "" : Math.max(0, parseFloat(v) || 0)); }}
                          onKeyDown={(e) => { if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === 'Subtract') e.preventDefault(); }}
                          onPaste={(e) => { e.preventDefault(); const v = e.clipboardData.getData('text/plain').replace(/[eE]/g, ''); setLaborCost(v === "" ? "" : Math.max(0, parseFloat(v) || 0)); }}
                          placeholder="0.00"
                          className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Anticipo Negociado (%)</label>
                        <select
                          id="analistas-advance"
                          value={advancePercent}
                          onChange={(e) => setAdvancePercent(parseInt(e.target.value))}
                          className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 text-slate-700 font-bold"
                        >
                          <option value="10">10%</option>
                          <option value="20">20%</option>
                          <option value="30">30%</option>
                          <option value="40">40%</option>
                          <option value="50">50%</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alcance y Condiciones de la Oferta</label>
                      <input
                        id="analistas-bid-desc"
                        type="text"
                        placeholder="Ej. Suministro total de cables, incluye garantía y flete."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 text-slate-700 font-medium"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-200/60">
                      <div className="text-xs font-bold text-slate-700">
                        Costo Total Oferta: <span className="font-mono text-sky-700 text-sm font-black">${(Number(materialCost) + Number(laborCost)).toLocaleString()}</span>
                      </div>
                      <button
                        id="btn-analistas-add-bid"
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-sky-700 bg-sky-50 border border-sky-100 hover:bg-sky-100 rounded-xl transition-all cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar al Cuadro
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Comparative Table Preview & Submission */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
            <Award className="h-5 w-5 text-sky-600" />
            <h4 className="font-sans font-bold text-slate-900 text-sm">Cuadro Comparativo Digital</h4>
          </div>

          {!activeProject ? (
            <div className="text-center py-12 text-xs text-slate-400 italic font-medium leading-relaxed">
              Seleccione un expediente a cotizar en el panel de la izquierda para ver su cuadro comparativo en tiempo real.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-100 text-xs">
                <span className="font-bold text-sky-900 block mb-1">Techo de Inversión Aprobado:</span>
                <span className="font-mono font-black text-sky-700 text-base">
                  ${activeProject.approvedInvestmentAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">Definido por la Gerencia de Procura según ficha técnica de Cierre de Obra.</p>
              </div>

              <div className="space-y-3.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Propuestas Ingresadas ({activeProject.proposals?.length || 0}):</span>
                
                <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                  {activeProject.proposals?.map((prop) => (
                    <div key={prop.id} className="p-3.5 border border-slate-100 bg-white rounded-xl flex items-center justify-between gap-3 shadow-xs hover:border-slate-200 transition-colors">
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{prop.contractorName}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">Plazo: {prop.deliveryWeeks} sem | Anticipo: {prop.negotiatedAdvancePercent}%</div>
                        <div className="font-mono text-[11px] text-sky-600 font-bold mt-1">${prop.totalCost.toLocaleString()} USD</div>
                      </div>
                      <button
                        id={`btn-delete-proposal-${prop.id}`}
                        onClick={() => onRemoveProposal(activeProject.id, prop.id)}
                        className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 p-2 rounded-xl transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {(!activeProject.proposals || activeProject.proposals.length === 0) && (
                    <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 font-medium italic bg-slate-50/50">
                      Ningún contratista ha enviado oferta todavía para este expediente. Use el formulario arriba.
                    </div>
                  )}
                </div>
              </div>

              {activeProject.proposals && activeProject.proposals.length > 0 && (
                <div className="border-t border-slate-100 pt-5 space-y-3">
                  <button
                    id="btn-analistas-submit-comparative"
                    onClick={handleSubmit}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-md shadow-sky-500/10 transition-all cursor-pointer transform hover:scale-[1.01]"
                  >
                    <Send className="h-4 w-4" />
                    Enviar Cuadro de Comparación a Gerencia Procura
                  </button>
                  <p className="text-[10px] text-slate-400 text-center leading-relaxed font-medium">
                    Al enviar, se consolida la terna comparativa en la Base de Datos para la adjudicación por parte de Procura.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
