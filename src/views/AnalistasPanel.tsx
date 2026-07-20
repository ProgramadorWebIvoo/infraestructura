/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Project, ProjectStatus, Contractor, Proposal } from "../types";
import { useToast } from "../components/UI/Toast";
import { 
  Users, 
  Plus, 
  Send, 
  Trash2, 
  DollarSign, 
  Clock, 
  FileSpreadsheet, 
  Award,
  FolderOpen,
  LayoutList,
  Loader2
} from "lucide-react";
import { SkeletonCard, SkeletonList, SkeletonBlock } from "../components/SkeletonLoader";
import Card from "../components/UI/Card";
import SectionHeader from "../components/UI/SectionHeader";
import NumericInput from "../components/UI/NumericInput";
import AlertBanner from "../components/UI/AlertBanner";
import EmptyState from "../components/UI/EmptyState";

interface ImportResult {
  message: string;
  imported: number;
  skipped: number;
}

interface AnalistasPanelProps {
  projects: Project[];
  contractors: Contractor[];
  onAddProposal: (projectId: string, proposal: Omit<Proposal, "id">) => void;
  onRemoveProposal: (projectId: string, proposalId: string) => void;
  onSubmitComparative: (projectId: string) => void;
  onImportSupplierProposals?: (projectId: string) => Promise<ImportResult>;
  isLoading?: boolean;
}

export default function AnalistasPanel({
  projects,
  contractors,
  onAddProposal,
  onRemoveProposal,
  onSubmitComparative,
  onImportSupplierProposals,
  isLoading = false,
}: AnalistasPanelProps) {
  const { showToast } = useToast();
  if (isLoading) return <AnalistasSkeleton />;
  // States
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [contractorCode, setContractorCode] = useState(contractors[0]?.code ?? "");
  const [materialCost, setMaterialCost] = useState<number | "">(1000);
  const [laborCost, setLaborCost] = useState<number | "">(800);
  const [deliveryWeeks, setDeliveryWeeks] = useState<number | "">(2);
  const [advancePercent, setAdvancePercent] = useState(30);
  const [description, setDescription] = useState("");

  // Import supplier proposals state
  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const pendingLicitacion = projects.filter(p => p.status === ProjectStatus.CONFIRMADO_PROCURA);
  const activeProject = pendingLicitacion.find(p => p.id === selectedProjectId);

  const handleAddProposal = (e: React.FormEvent) => {
    e.preventDefault();
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

    setDescription("");
    setMaterialCost(1000);
    setLaborCost(800);
    setDeliveryWeeks(2);
  };

  const handleImport = async () => {
    if (!selectedProjectId || !onImportSupplierProposals) return;
    setIsImporting(true);
    setImportFeedback(null);
    try {
      const result = await onImportSupplierProposals(selectedProjectId);
      setImportFeedback({ message: result.message, type: "success" });
      setTimeout(() => setImportFeedback(null), 5700); // 5000 visible + 700ms transition
    } catch (error) {
      setImportFeedback({
        message: error instanceof Error ? error.message : "Error inesperado al importar propuestas.",
        type: "error",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedProjectId) return;
    if (!activeProject?.proposals || activeProject.proposals.length === 0) {
      showToast("Agrega al menos una propuesta antes de enviar el cuadro comparativo.", "warning");
      return;
    }
    onSubmitComparative(selectedProjectId);
    setSelectedProjectId("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Left panel: Active Licitations and Adder */}
      <div className="lg:col-span-7 space-y-6">
        <Card>
          <SectionHeader
            icon={<FileSpreadsheet className="h-5 w-5" />}
            title="Carga de Propuestas de Contratistas"
            description="Reciba y digitalice ofertas para consolidar cuadros comparativos. Los contratistas operan bajo códigos únicos asignados."
          />

          {pendingLicitacion.length === 0 ? (
            <EmptyState
              icon={<FolderOpen className="h-8 w-8" />}
              message="No hay expedientes en licitación activa. Vaya al panel de Procura o Cierre de Obra para avanzar flujos."
            />
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
                        <NumericInput
                          id="analistas-weeks"
                          value={deliveryWeeks}
                          onChange={setDeliveryWeeks}
                          min={1}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Costo Materiales ($)</label>
                        <NumericInput
                          id="analistas-mat-cost"
                          value={materialCost}
                          onChange={setMaterialCost}
                          min={0}
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Costo Mano de Obra ($)</label>
                        <NumericInput
                          id="analistas-labor-cost"
                          value={laborCost}
                          onChange={setLaborCost}
                          min={0}
                          placeholder="0.00"
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
        </Card>
      </div>

      {/* Right panel: Comparative Table Preview & Submission */}
      <div className="lg:col-span-5 space-y-6">
        <Card hoverable={false}>
          <SectionHeader
            icon={<Award className="h-5 w-5" />}
            title="Cuadro Comparativo Digital"
            description="Consolide y compare las ofertas recibidas por expediente."
            color="sky"
          />

          {!activeProject ? (
            <EmptyState
              icon={<Award className="h-8 w-8" />}
              message="Seleccione un expediente en el panel izquierdo para ver su cuadro comparativo."
            />
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
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Propuestas Ingresadas ({activeProject.proposals?.length || 0}):
                  </span>
                  <button
                    onClick={handleImport}
                    disabled={isImporting}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    title="Importar propuestas recibidas desde el portal de proveedores"
                  >
                    {isImporting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <LayoutList className="h-3.5 w-3.5" />
                    )}
                    {isImporting ? "Importando..." : "Traer del portal"}
                  </button>
                </div>
                
                <div className={`overflow-hidden transition-all duration-700 ease-in-out ${importFeedback ? "max-h-16 opacity-100" : "max-h-0 opacity-0"}`}>
                  {importFeedback && (
                    <AlertBanner type={importFeedback.type} message={importFeedback.message} />
                  )}
                </div>

                <div className="space-y-2.5 max-h-[185px] overflow-y-auto pr-1">
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
                    <EmptyState
                      icon={<FileSpreadsheet className="h-6 w-6" />}
                      message="Ninguna oferta registrada. Use el formulario en el panel izquierdo o importe desde el portal de proveedores."
                    />
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
        </Card>
      </div>

    </div>
  );
}

/* ─── Skeleton Loader ─── */
function AnalistasSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 space-y-6">
        <SkeletonCard />
        <SkeletonList items={3} />
      </div>
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
            <SkeletonBlock className="h-5 w-5 rounded-lg" />
            <SkeletonBlock className="h-4 w-48" />
          </div>
          <SkeletonBlock className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
