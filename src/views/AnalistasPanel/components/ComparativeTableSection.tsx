/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 2 de Analistas: cuadro comparativo digital — extraída de
 * AnalistasPanel.
 */

import { useMemo, useState } from "react";
import type { Project } from "../../../types";
import { useToast } from "../../../components/UI/Toast";
import { AlertTriangle, Award, FileSpreadsheet, LayoutList, Loader2, Send, Trash2, Trophy } from "lucide-react";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import Button from "../../../components/UI/Button";
import EmptyState from "../../../components/UI/EmptyState";
import ConfirmDialog from "../../../components/UI/ConfirmDialog";
import { useMaxAdvancePercent } from "../../../hooks/useMaxAdvancePercent";
import { formatNumber } from "../../../utils";

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
  const maxAdvancePercent = useMaxAdvancePercent();
  const [isImporting, setIsImporting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const proposals = useMemo(() => activeProject?.proposals ?? [], [activeProject]);
  const techo = activeProject?.approvedInvestmentAmount ?? 0;
  const best = proposals.reduce((a, b) => (b.totalCost < a.totalCost ? b : a), proposals[0]);

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
      <Card hoverable={false} className="border-l-4 border-l-sky-400 h-full flex flex-col">
        <SectionHeader
          icon={<Award className="h-5 w-5" />}
          title="Cuadro Comparativo Digital"
          description="Consolide y compare las ofertas recibidas por expediente."
          color="sky"
        />

        {!activeProject ? (
          <div className="flex-1 flex items-center">
            <EmptyState
              className="w-full"
              icon={<Award className="h-8 w-8" />}
              message="Seleccione un expediente en el panel izquierdo para ver su cuadro comparativo."
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-4">
            {/* Techo de inversión + stats del cuadro */}
            <div className="p-4 bg-gradient-to-br from-sky-50/50 to-white rounded-xl border border-sky-100/60 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sky-900 text-xs">Techo de Inversión Aprobado:</span>
                <span className="font-mono font-black text-sky-700 text-base">
                  ${techo.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Definido por la Gerencia de Procura según ficha técnica de Cierre de Obra.</p>

              {proposals.length > 0 && (
                <div className="pt-2 border-t border-sky-100/60">
                  <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-2.5">
                    <div className="flex items-center gap-1 text-emerald-600 text-[9px] font-black uppercase tracking-wider">
                      <Trophy className="h-3 w-3" /> Mejor Oferta
                    </div>
                    <div className="font-mono font-black text-emerald-700 text-sm mt-0.5">${formatNumber(best?.totalCost ?? 0)}</div>
                    <div className="text-[9px] text-slate-500 font-medium truncate" title={best?.contractorName}>{best?.contractorName}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Propuestas Ingresadas ({proposals.length}):
                </span>
                <Button
                  onClick={handleImport}
                  disabled={isImporting}
                  variant="secondary"
                  size="sm"
                  className="text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300"
                  title="Importar propuestas recibidas desde el portal de proveedores"
                  icon={isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LayoutList className="h-3.5 w-3.5" />}
                >
                  {isImporting ? "Importando..." : "Traer del portal"}
                </Button>
              </div>
              <div
                className="space-y-2.5 max-h-[185px] overflow-y-auto pr-1 pb-1 scroll-smooth scroll-pb-1"
              >
                {proposals.map((prop) => {
                  const isBest = prop.id === best?.id && proposals.length > 1;
                  return (
                    <div
                      key={prop.id}
                      className={`p-3.5 border bg-white rounded-xl flex items-center justify-between gap-3 shadow-xs transition-all duration-200 ${
                        isBest ? "border-emerald-300 ring-1 ring-emerald-100" : "border-slate-100 hover:border-emerald-200 hover:shadow-sm"
                      }`}
                      style={{ contentVisibility: "auto", contain: "layout style paint" }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 text-xs truncate">{prop.contractorName}</span>
                          {isBest && (
                            <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md border border-emerald-200 shrink-0">
                              Mejor
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1 flex-wrap">
                          Plazo: {prop.deliveryWeeks > 0 ? `${prop.deliveryWeeks} sem` : "Sin dato"} | Anticipo:{" "}
                          <span className={prop.negotiatedAdvancePercent > maxAdvancePercent ? "text-amber-600 font-bold inline-flex items-center gap-0.5" : undefined}>
                            {prop.negotiatedAdvancePercent > maxAdvancePercent && <AlertTriangle className="h-2.5 w-2.5" />}
                            {prop.negotiatedAdvancePercent}%
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-emerald-600 font-bold mt-1">${prop.totalCost.toLocaleString()} USD</div>
                      </div>
                      <button
                        id={`btn-delete-proposal-${prop.id}`}
                        onClick={() => onRemoveProposal(activeProject.id, prop.id)}
                        className="text-rose-400 hover:bg-rose-50 hover:text-rose-600 p-2 rounded-xl transition-colors shrink-0 cursor-pointer"
                        aria-label={`Eliminar propuesta de ${prop.contractorName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}

                {proposals.length === 0 && (
                  <EmptyState
                    icon={<FileSpreadsheet className="h-6 w-6" />}
                    message="Ninguna oferta registrada. Use el formulario en el panel izquierdo o importe desde el portal de proveedores."
                  />
                )}
              </div>
            </div>

            {proposals.length > 0 && (
              <div className="mt-auto border-t border-slate-100 pt-5 space-y-3">
                <Button
                  id="btn-analistas-submit-comparative"
                  onClick={handleSubmit}
                  variant="primary"
                  colorScheme="sky"
                  size="md"
                  className="w-full"
                  icon={<Send className="h-4 w-4" />}
                >
                  Enviar Cuadro de Comparación a Gerencia Procura
                </Button>
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
        message={`¿Estás seguro de enviar el cuadro comparativo con ${proposals.length} propuestas a la Gerencia de Procura? Una vez enviado, Procura revisará las ofertas y procederá con la adjudicación.`}
        variant="info"
        confirmLabel="Enviar a Procura"
      />
    </>
  );
}