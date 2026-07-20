/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de inspección de proyecto — línea de tiempo completa del workflow.
 * Renderiza createPortal a document.body para evitar roturas de z-index/position:fixed.
 */

import { createPortal } from "react-dom";
import { X, MapPin, Calendar, CheckCircle } from "lucide-react";
import type { Project } from "../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InspectProjectModalProps {
  project: Project;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function InspectProjectModal({ project, onClose }: InspectProjectModalProps) {
  return createPortal(
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">Expediente de Obra</span>
            <h3 className="text-md font-bold font-sans">{project.title}</h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{project.id} &bull; {project.type}</p>
          </div>
          <button
            id="btn-close-inspect-modal"
            onClick={onClose}
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
              <span className="text-slate-400 block font-medium">Ubicaci&oacute;n f&iacute;sica:</span>
              <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {project.location}
              </div>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Fecha de Apertura:</span>
              <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {project.createdDate}
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
                  <p className="text-[11px] text-slate-500 mt-0.5">Registro t&eacute;cnico de requerimientos de insumos.</p>
                  <div className="mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600">
                    <strong>Descripci&oacute;n:</strong> {project.description}
                    <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 font-mono font-medium text-slate-500">
                      Presupuesto Estimado Inicial: ${project.estimatedTotal.toLocaleString()} USD
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Cierre de Obra */}
              <div className="flex gap-3 relative">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white z-10 shrink-0 shadow-xs ${
                  project.cierreObraNotes ? "bg-blue-600" : "bg-slate-200"
                }`}>
                  2
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Revisi&oacute;n T&eacute;cnica Cierre de Obra</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">C&aacute;lculos de inversi&oacute;n, volumen de material y planimetr&iacute;a.</p>
                  {project.cierreObraNotes ? (
                    <div className="mt-1 bg-blue-50/40 p-2.5 rounded-lg border border-blue-100 text-[11px] text-slate-600">
                      <strong>Notas Cierre de Obra:</strong> {project.cierreObraNotes}
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-blue-700 font-mono font-semibold">
                        <span>&bull; Planos: {project.blueprintsCount || 0}</span>
                        <span>&bull; C&aacute;lculos: {project.calculationsAdded ? "Adjuntados" : "No"}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic mt-0.5">Paso pendiente de revisi&oacute;n t&eacute;cnica.</p>
                  )}
                </div>
              </div>

              {/* Step 3: Procura Approved Investment */}
              <div className="flex gap-3 relative">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white z-10 shrink-0 shadow-xs ${
                  project.approvedInvestmentAmount ? "bg-purple-600" : "bg-slate-200"
                }`}>
                  3
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Aprobaci&oacute;n Presupuestaria Procura</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Autorizaci&oacute;n de inversi&oacute;n m&aacute;xima autorizada para licitaci&oacute;n.</p>
                  {project.approvedInvestmentAmount ? (
                    <div className="mt-1 bg-purple-50/40 p-2.5 rounded-lg border border-purple-100 text-[11px] text-slate-600">
                      <strong>Tope Presupuestario:</strong> ${project.approvedInvestmentAmount.toLocaleString()} USD
                      <p className="mt-1 text-slate-500"><strong>Nota Procura:</strong> {project.procuraReviewNotes}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic mt-0.5">Pendiente de tope presupuestario.</p>
                  )}
                </div>
              </div>

              {/* Step 4: Analyst & Contractor bidding */}
              <div className="flex gap-3 relative">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white z-10 shrink-0 shadow-xs ${
                  project.proposals && project.proposals.length > 0 ? "bg-emerald-600" : "bg-slate-200"
                }`}>
                  4
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Licitaci&oacute;n &amp; Cuadro Comparativo Analistas</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Carga de propuestas f&iacute;sicas y consolidaci&oacute;n de terna.</p>
                  {project.proposals && project.proposals.length > 0 ? (
                    <div className="mt-1 space-y-1 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100 text-[11px]">
                      <span className="font-bold text-emerald-800 uppercase text-[9px] tracking-wider">Ofertas recibidas:</span>
                      <ul className="space-y-1 text-slate-600">
                        {project.proposals.map(pr => (
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
                  project.selectedContractorCode ? "bg-indigo-600" : "bg-slate-200"
                }`}>
                  5
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Adjudicaci&oacute;n por Procura</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Adjudicaci&oacute;n del contratista final de la base de datos.</p>
                  {project.selectedContractorCode ? (
                    <div className="mt-1 bg-indigo-50/40 p-2.5 rounded-lg border border-indigo-100 text-[11px] text-slate-700 font-semibold">
                      Proveedor Adjudicado: {project.selectedContractorCode}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic mt-0.5">Pendiente de adjudicar ganador.</p>
                  )}
                </div>
              </div>

              {/* Step 6: Finanzas payment of advance */}
              <div className="flex gap-3 relative">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white z-10 shrink-0 shadow-xs ${
                  project.advancePaidAmount ? "bg-rose-600" : "bg-slate-200"
                }`}>
                  6
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Anticipo Finanzas (Inicio de Obra)</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Liberaci&oacute;n bancaria del anticipo para el arranque.</p>
                  {project.advancePaidAmount ? (
                    <div className="mt-1 bg-rose-50/40 p-2.5 rounded-lg border border-rose-100 text-[11px] text-slate-600">
                      <strong>Anticipo Transferido:</strong> ${project.advancePaidAmount.toLocaleString()} USD
                      <div className="text-[9px] text-slate-400 mt-0.5 font-mono">Fecha Valor: {project.advancePaidDate}</div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic mt-0.5">Arranque pendiente de pago de anticipo.</p>
                  )}
                </div>
              </div>

              {/* Step 7: Quality and final verification */}
              <div className="flex gap-3 relative">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white z-10 shrink-0 shadow-xs ${
                  project.qualityVerified ? "bg-green-600" : "bg-slate-200"
                }`}>
                  7
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Auditor&iacute;a &amp; Calidad Cierre de Obra</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Inspecci&oacute;n final f&iacute;sica de la infraestructura completada.</p>
                  {project.qualityVerified ? (
                    <div className="mt-1 bg-green-50/40 p-2.5 rounded-lg border border-green-100 text-[11px] text-slate-600 flex items-center gap-1.5 font-semibold text-green-800">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Obra certificada con est&aacute;ndares &oacute;ptimos el {project.completionVerifiedDate}.
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic mt-0.5">Pendiente de verificaci&oacute;n t&eacute;cnica final de calidad.</p>
                  )}
                </div>
              </div>

              {/* Step 8: Final payment */}
              <div className="flex gap-3 relative">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white z-10 shrink-0 shadow-xs ${
                  project.finalPaidAmount ? "bg-green-700" : "bg-slate-200"
                }`}>
                  8
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Liquidaci&oacute;n Final Finanzas</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Pago de liquidaci&oacute;n del saldo restante y cierre de cuenta.</p>
                  {project.finalPaidAmount ? (
                    <div className="mt-1 bg-green-950 text-white p-2.5 rounded-lg text-[11px] font-semibold">
                      Liquidaci&oacute;n Final de ${project.finalPaidAmount.toLocaleString()} USD Transferida el {project.finalPaidDate}.
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic mt-0.5">Pendiente de liquidaci&oacute;n bancaria.</p>
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
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>,
    document.body,
  );
}
