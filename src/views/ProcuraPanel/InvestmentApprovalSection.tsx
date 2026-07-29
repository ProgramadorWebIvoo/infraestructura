/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 1 de Procura: autorización de inversión inicial — extraída de
 * ProcuraPanel.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Button from "../../components/UI/Button";
import { CheckSquare, Download, FileSpreadsheet, Map, MapPin, TrendingUp } from "lucide-react";
import { useToast } from "../../components/UI/Toast";
import { apiDownload } from "../../services/api";
import Card from "../../components/UI/Card";
import SectionHeader from "../../components/UI/SectionHeader";
import NumericInput from "../../components/UI/NumericInput";
import EmptyState from "../../components/UI/EmptyState";
import { formatNumber } from "../../utils";
import { ProjectStatus } from "../../types";
import type { Project, ProjectDocument } from "../../types";

/** Renderiza documentos adjuntos (planos + hojas de cálculo) de un proyecto */
function ProjectDocuments({ project, onDownload }: { project: Project; onDownload: (project: Project, doc: ProjectDocument) => void }) {
  const docs = project.documents ?? [];
  const planos = docs.filter(d => d.documentType === "PLANO");
  const calcs = docs.filter(d => d.documentType === "CALC");
  if (docs.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <Map className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">
            Planos de Ingeniería ({planos.length})
          </span>
        </div>
        {planos.length === 0 ? (
          <p className="text-[10px] text-slate-400 italic font-medium">Sin planos adjuntos.</p>
        ) : (
          <ul className="space-y-1">
            {planos.map(doc => (
              <li key={doc.id} className="flex items-center justify-between gap-2 bg-white border border-indigo-100 rounded-lg px-2.5 py-1.5">
                <span className="text-[11px] font-bold text-indigo-800 truncate" title={doc.originalName}>{doc.originalName}</span>
                <button
                  type="button"
                  onClick={() => onDownload(project, doc)}
                  className="shrink-0 text-indigo-400 hover:text-indigo-700 transition-colors cursor-pointer"
                  title="Descargar"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <FileSpreadsheet className="h-3.5 w-3.5 text-sky-500 shrink-0" />
          <span className="text-[10px] font-black text-sky-700 uppercase tracking-wider">
            Hojas de Cálculo ({calcs.length})
          </span>
        </div>
        {calcs.length === 0 ? (
          <p className="text-[10px] text-slate-400 italic font-medium">Sin hojas de cálculo adjuntas.</p>
        ) : (
          <ul className="space-y-1">
            {calcs.map(doc => (
              <li key={doc.id} className="flex items-center justify-between gap-2 bg-white border border-sky-100 rounded-lg px-2.5 py-1.5">
                <span className="text-[11px] font-bold text-sky-800 truncate" title={doc.originalName}>{doc.originalName}</span>
                <button
                  type="button"
                  onClick={() => onDownload(project, doc)}
                  className="shrink-0 text-sky-400 hover:text-sky-700 transition-colors cursor-pointer"
                  title="Descargar"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface InvestmentApprovalSectionProps {
  projects: Project[];
  authToken: string;
  onApproveInvestment: (projectId: string, notes: string, approvedAmount: number) => void;
}

export default function InvestmentApprovalSection({ projects, authToken, onApproveInvestment }: InvestmentApprovalSectionProps) {
  const { showToast } = useToast();
  const [selectedReviewId, setSelectedReviewId] = useState("");
  const [procuraNotes, setProcuraNotes] = useState("");
  const [approvedAmount, setApprovedAmount] = useState<number | "">("");

  const pendingInvestmentApproval = projects.filter(p => p.status === ProjectStatus.REVISADO_CIERRE);
  const activeReviewProject = pendingInvestmentApproval.find(p => p.id === selectedReviewId);

  const handleDownload = async (project: Project, doc: ProjectDocument) => {
    try {
      const blob = await apiDownload(`/projects/${project.id}/documents/${doc.id}/download`, { token: authToken });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("No se pudo descargar el archivo.", "error");
    }
  };

  const handleApproveInvestmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewId) return;
    const amountNum = approvedAmount === "" ? 0 : approvedAmount;
    if (amountNum <= 0) {
      showToast("Introduce un monto de inversión autorizado válido.", "warning");
      return;
    }
    onApproveInvestment(selectedReviewId, procuraNotes, amountNum);
    setSelectedReviewId("");
    setProcuraNotes("");
    setApprovedAmount(0);
  };

  return (
    <Card className="border-l-4 border-l-purple-400">
      <SectionHeader
        icon={<TrendingUp className="h-5 w-5" />}
        title="Gerencia de Procura: Autorización de Inversión Inicial"
        description="Autorice el envío de expedientes de obra para la ronda de licitación. Fije los límites presupuestarios según las cubicaciones corregidas."
        color="purple"
      />

      {pendingInvestmentApproval.length === 0 ? (
        <EmptyState message="No hay nuevas peticiones aprobadas por Cierre de Obra esperando tope presupuestario." />
      ) : (
        <div className="space-y-5">
          <div className="space-y-2.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Peticiones Listas para Procura:</label>
            <div
              className="flex flex-wrap gap-2 max-h-88 overflow-y-auto pr-2 -mr-2 scroll-smooth"
            >
              {pendingInvestmentApproval.map((p) => (
                <button
                  id={`procura-review-select-${p.id}`}
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedReviewId(p.id);
                    setApprovedAmount(p.estimatedTotal);
                    setProcuraNotes(`Presupuesto aprobado de $${p.estimatedTotal} para licitación directa. Cierre de Obra validó planos correspondientes.`);
                  }}
                  style={{ contentVisibility: "auto", contain: "layout style paint" }}
                  className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all duration-200 text-left cursor-pointer ${
                    selectedReviewId === p.id
                      ? "border-purple-500 bg-gradient-to-br from-purple-50 to-white text-purple-950 ring-2 ring-purple-100 shadow-sm"
                      : "border-slate-200 bg-white hover:border-purple-400 hover:bg-slate-50/50 hover:shadow-sm"
                  }`}
                >
                  <div className="font-mono text-[9px] text-purple-600 font-bold mb-0.5">{p.id}</div>
                  <div className="line-clamp-1">{p.title}</div>
                  <div className="text-[9px] text-slate-400 font-medium mt-1">{p.location}</div>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {activeReviewProject && (
              <motion.form
                key="review-form"
                onSubmit={handleApproveInvestmentSubmit}
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="border-t border-slate-100 pt-5 space-y-5 overflow-hidden"
              >
              <div className="p-4 bg-gradient-to-br from-purple-50/40 to-white rounded-xl text-xs space-y-2 border border-purple-100/60 font-medium">
                <div className="flex justify-between items-center">
                  <strong className="font-bold text-slate-400">Estimado de Materiales (Cierre Obra):</strong>
                  <span className="font-mono font-bold text-purple-700">${formatNumber(activeReviewProject.estimatedTotal)}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {activeReviewProject.location}
                </div>
                <div className="text-slate-500 italic leading-relaxed pt-2 border-t border-purple-100/60">
                  <span className="font-bold not-italic text-slate-600">Nota Cierre de Obra: </span>
                  {activeReviewProject.cierreObraNotes}
                </div>
              </div>

              <ProjectDocuments project={activeReviewProject} onDownload={handleDownload} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Inversión Aprobada Autorizada ($)
                  </label>
                  <NumericInput
                    id="procura-approved-amount"
                    value={approvedAmount}
                    onChange={setApprovedAmount}
                    placeholder="0.00"
                    className="focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Notas de Aprobación de Presupuesto
                  </label>
                  <input
                    id="procura-notes"
                    type="text"
                    placeholder="Ej. Proyecto urgente de climatización, habilitar licitaciones prioritarias."
                    value={procuraNotes}
                    onChange={(e) => setProcuraNotes(e.target.value)}
                    className="w-full text-xs px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500 bg-white font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  id="btn-procura-approve-investment"
                  type="submit"
                  variant="primary"
                  colorScheme="purple"
                  icon={<CheckSquare className="h-4 w-4" />}
                >
                  Autorizar Presupuesto y Enviar a Licitación
                </Button>
              </div>
            </motion.form>
          )}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}
