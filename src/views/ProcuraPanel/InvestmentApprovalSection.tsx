/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 1 de Procura: autorización de inversión inicial — extraída de
 * ProcuraPanel.
 *
 * La autorización se realiza en un modal tipo wizard (Revisar → Autorizar)
 * para no expandir el layout de la página al abrir el formulario.
 */

import { Fragment, useMemo, useState } from "react";
import { ArrowRight, Calculator, CheckSquare, Download, FileSpreadsheet, Map, MapPin, TrendingUp } from "lucide-react";
import Button from "../../components/UI/Button";
import { useToast } from "../../components/UI/Toast";
import { apiDownload } from "../../services/api";
import Card from "../../components/UI/Card";
import SectionHeader from "../../components/UI/SectionHeader";
import NumericInput from "../../components/UI/NumericInput";
import EmptyState from "../../components/UI/EmptyState";
import Modal from "../../components/UI/Modal";
import { formatNumber } from "../../utils";
import { ProjectStatus } from "../../types";
import type { Project, ProjectDocument } from "../../types";

const WIZARD_STEPS = [
  { key: 1, label: "Revisar", icon: Calculator },
  { key: 2, label: "Autorizar", icon: CheckSquare },
] as const;

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
  const [step, setStep] = useState(1);
  const [procuraNotes, setProcuraNotes] = useState("");
  const [approvedAmount, setApprovedAmount] = useState<number | "">("");

  const pendingInvestmentApproval = useMemo(
    () => projects.filter(p => p.status === ProjectStatus.REVISADO_CIERRE),
    [projects],
  );
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

  const openReview = (p: Project) => {
    setSelectedReviewId(p.id);
    setStep(1);
    setApprovedAmount(p.estimatedTotal);
    setProcuraNotes(`Presupuesto aprobado de $${p.estimatedTotal} para licitación directa. Cierre de Obra validó planos correspondientes.`);
  };

  const closeReview = () => {
    setSelectedReviewId("");
    setStep(1);
    setProcuraNotes("");
    setApprovedAmount("");
  };

  const handleApproveInvestmentSubmit = () => {
    if (!activeReviewProject) return;
    const amountNum = approvedAmount === "" ? 0 : approvedAmount;
    if (amountNum <= 0) {
      showToast("Introduce un monto de inversión autorizado válido.", "warning");
      return;
    }
    onApproveInvestment(activeReviewProject.id, procuraNotes, amountNum);
    setSelectedReviewId("");
    setStep(1);
    setProcuraNotes("");
    setApprovedAmount("");
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
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Peticiones Listas para Procura:
            </label>
            <span className="text-[10px] font-mono font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-lg">
              {pendingInvestmentApproval.length} pendiente{pendingInvestmentApproval.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-88 overflow-y-auto pr-2 -mr-2 pb-2 scroll-smooth scroll-pb-2"
          >
            {pendingInvestmentApproval.map((p) => {
              const isSelected = selectedReviewId === p.id;
              return (
                <button
                  id={`procura-review-select-${p.id}`}
                  key={p.id}
                  type="button"
                  onClick={() => openReview(p)}
                  style={{ contentVisibility: "auto", contain: "layout style paint" }}
                  className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border-purple-500 bg-gradient-to-br from-purple-50 to-white text-purple-950 ring-2 ring-purple-100 shadow-sm"
                      : "border-slate-200 bg-white hover:border-purple-400 hover:bg-slate-50/50 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-[9px] font-bold text-purple-600">{p.id}</span>
                    <span className="text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-lg border whitespace-nowrap bg-slate-100 text-slate-700 border-slate-200">
                      {p.type === "INFRAESTRUCTURA" ? "INFRA" : "MANT"}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 line-clamp-1">{p.title}</div>
                  <div className="text-[10px] text-slate-500 mt-1.5 font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {p.location}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{p.createdDate}</span>
                    <span className="font-mono font-bold text-purple-700">${formatNumber(p.estimatedTotal)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Wizard de autorización ── */}
      <Modal
        isOpen={!!activeReviewProject}
        onClose={closeReview}
        maxWidth="max-w-2xl"
        icon={<TrendingUp className="h-5 w-5" />}
        iconColor="purple"
        badge="Autorización de Inversión"
        title={activeReviewProject ? `Expediente ${activeReviewProject.id}` : ""}
        infoLine={activeReviewProject ? `${activeReviewProject.title} · ${activeReviewProject.location}` : ""}
        footer={
          activeReviewProject ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
                {step === 1 ? "Revisa el expediente y la documentación de Cierre de Obra" : "Confirma el monto autorizado para licitación"}
              </span>
              <div className="flex items-center gap-2">
                {step > 1 && (
                  <Button variant="secondary" onClick={() => setStep(s => s - 1)}>
                    Atrás
                  </Button>
                )}
                {step < 2 ? (
                  <Button
                    variant="primary"
                    colorScheme="purple"
                    onClick={() => setStep(2)}
                    icon={<ArrowRight className="h-4 w-4" />}
                  >
                    Continuar
                  </Button>
                ) : (
                  <Button
                    id="btn-procura-approve-investment"
                    variant="primary"
                    colorScheme="purple"
                    onClick={handleApproveInvestmentSubmit}
                    icon={<CheckSquare className="h-4 w-4" />}
                  >
                    Autorizar Presupuesto y Enviar a Licitación
                  </Button>
                )}
              </div>
            </div>
          ) : undefined
        }
      >
        {activeReviewProject && (
          <div className="space-y-6">
            {/* Stepper del wizard */}
            <div className="flex items-center gap-1.5" role="group" aria-label="Progreso de autorización">
              {WIZARD_STEPS.map((s, i) => {
                const Icon = s.icon;
                const isActive = step === s.key;
                const isDone = step > s.key;
                return (
                  <Fragment key={s.key}>
                    {i > 0 && (
                      <div className={`h-0.5 flex-1 rounded-full ${step > i ? "bg-purple-400" : "bg-slate-200"}`} />
                    )}
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold whitespace-nowrap transition-all duration-200 ${
                        isActive
                          ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm"
                          : isDone
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      <span className={isActive ? "text-purple-500" : isDone ? "text-emerald-500" : "text-slate-300"}>
                        <Icon className="h-3 w-3" />
                      </span>
                      {s.label}
                    </div>
                  </Fragment>
                );
              })}
            </div>

            {/* Paso 1: Revisar expediente */}
            {step === 1 && (
              <div className="space-y-5">
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
              </div>
            )}

            {/* Paso 2: Autorizar presupuesto */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[9px]">Expediente</span>
                    <span className="font-mono font-black text-slate-800">{activeReviewProject.id}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[9px]">Estimado Cierre de Obra</span>
                    <span className="font-mono font-black text-purple-700">${formatNumber(activeReviewProject.estimatedTotal)}</span>
                  </div>
                </div>

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
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}