/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 2 de Analistas: cuadro comparativo digital — extraída de
 * AnalistasPanel.
 */

import { useState } from "react";
import type { Project } from "../../types";
import { useToast } from "../../components/UI/Toast";
import { Award, FileSpreadsheet, LayoutList, Loader2, Send, Trash2 } from "lucide-react";
import Card from "../../components/UI/Card";
import SectionHeader from "../../components/UI/SectionHeader";
import EmptyState from "../../components/UI/EmptyState";
import ConfirmDialog from "../../components/UI/ConfirmDialog";

interface ImportResult {
  message: string;
  imported: number;
  skipped: number;
}

interface ComparativeTableSectionProps {
  activeProject: Project | undefined;
  onRemoveProposal: (projectId: string, proposalId: string) => void;
  onSubmitComparative: (projectId: string) => void;
  onImportSupplierProposals?: (projectId: string) => Promise<ImportResult>;
  onComparativeSubmitted: () => void;
}

export default function ComparativeTableSection({
  activeProject,
  onRemoveProposal,
  onSubmitComparative,
  onImportSupplierProposals,
  onComparativeSubmitted,
}: ComparativeTableSectionProps) {
  const { showToast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const handleImport = async () => {
    if (!activeProject || !onImportSupplierProposals) return;
    setIsImporting(true);
    try {
      const result = await onImportSupplierProposals(activeProject.id);
      showToast(result.message, "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Error inesperado al importar propuestas.",
        "error",
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleSubmit = () => {
    if (!activeProject) return;
    if (!activeProject.proposals || activeProject.proposals.length === 0) {
      showToast("Agrega al menos una propuesta antes de enviar el cuadro comparativo.", "warning");
      return;
    }
    setConfirmSubmit(true);
  };

  return (
    <>
      <Card hoverable={false} className="border-l-4 border-l-sky-400">
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
            <div className="p-4 bg-gradient-to-br from-sky-50/50 to-white rounded-xl border border-sky-100/60 text-xs">
              <span className="font-bold text-sky-900 block mb-1">Techo de Inversión Aprobado:</span>
              <span className="font-mono font-black text-sky-700 text-base">
                ${activeProject.approvedInvestmentAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[10px] text-slate-500 mt-2 font-medium">Definido por la Gerencia de Procura según ficha técnica de Cierre de Obra.</p>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Propuestas Ingresadas ({activeProject.proposals?.length || 0}):
                </span>
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
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
              <div
                className="space-y-2.5 max-h-[185px] overflow-y-auto pr-1"
                style={{ willChange: "scroll-position" }}
              >
                {activeProject.proposals?.map((prop) => (
                  <div
                    key={prop.id}
                    className="p-3.5 border border-slate-100 bg-white rounded-xl flex items-center justify-between gap-3 shadow-xs hover:border-emerald-200 hover:shadow-sm transition-all duration-200"
                    style={{ contentVisibility: "auto", contain: "layout style paint" }}
                  >
                    <div>
                      <div className="font-bold text-slate-800 text-xs">{prop.contractorName}</div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">Plazo: {prop.deliveryWeeks > 0 ? `${prop.deliveryWeeks} sem` : "Sin dato"} | Anticipo: {prop.negotiatedAdvancePercent}%</div>
                      <div className="font-mono text-[11px] text-emerald-600 font-bold mt-1">${prop.totalCost.toLocaleString()} USD</div>
                    </div>
                    <button
                      id={`btn-delete-proposal-${prop.id}`}
                      onClick={() => onRemoveProposal(activeProject.id, prop.id)}
                      className="text-rose-400 hover:bg-rose-50 hover:text-rose-600 p-2 rounded-xl transition-colors shrink-0 cursor-pointer"
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
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 rounded-xl shadow-md shadow-sky-500/20 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-sky-500/30 hover:-translate-y-0.5"
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

      {/* ── Confirm Submit Comparative ── */}
      <ConfirmDialog
        isOpen={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        onConfirm={() => {
          if (activeProject) {
            onSubmitComparative(activeProject.id);
            onComparativeSubmitted();
          }
          setConfirmSubmit(false);
        }}
        title="Enviar Cuadro Comparativo"
        message={`¿Estás seguro de enviar el cuadro comparativo con ${activeProject?.proposals?.length ?? 0} propuestas a la Gerencia de Procura? Una vez enviado, Procura revisará las ofertas y procederá con la adjudicación.`}
        variant="info"
        confirmLabel="Enviar a Procura"
      />
    </>
  );
}
