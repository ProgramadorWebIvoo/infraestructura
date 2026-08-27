/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vista de solo lectura del detalle completo de una propuesta, para Procura
 * en el cuadro comparativo — el detalle de materiales, historial de
 * renegociación y motivos ya no cabe en una fila de tabla sin saturarla
 * (mismo problema ya resuelto en el modal de carga de Analistas), así que se
 * abre bajo demanda vía el botón "Inspeccionar" en vez de agregar columnas.
 */

import { ArrowRight, FileSearch, MessageSquareWarning, Package } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import type { Project, Proposal } from "../../../types";
import { formatCurrency } from "../../../utils";
import { formatProposalDuration } from "../../AnalistasPanel/components/RegisterProposalModal";

interface InspectProposalModalProps {
  project: Project;
  proposal: Proposal;
  onClose: () => void;
}

export default function InspectProposalModal({ project, proposal, onClose }: InspectProposalModalProps) {
  const materialItems = proposal.materialItems ?? [];
  const isRenegotiation = proposal.origen === "RENEGOCIACION";

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="max-w-3xl"
      icon={<FileSearch className="h-5 w-5" />}
      iconColor="emerald"
      badge="Detalle de la Propuesta"
      title={`${proposal.contractorName} · ${proposal.contractorCode}`}
      infoLine={`Expediente ${project.id} — oferta ${proposal.id}`}
    >
      <div className="space-y-4">
        {/* Resumen de costos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryStat label="Materiales" value={formatCurrency(proposal.materialCost)} />
          <SummaryStat label="Mano de Obra" value={formatCurrency(proposal.laborCost)} />
          <SummaryStat label="Total" value={formatCurrency(proposal.totalCost)} emphasize />
          <SummaryStat label="Plazo" value={formatProposalDuration(proposal)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SummaryStat label="Anticipo Pactado" value={`${proposal.negotiatedAdvancePercent}%`} />
          <SummaryStat label="Fecha de la Oferta" value={proposal.fechaOferta} />
        </div>

        {/* Historial de renegociación, si aplica */}
        {isRenegotiation && (
          <div className="rounded-lg border border-warning-200 bg-warning-50/50 p-3.5 space-y-2">
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-warning-700 uppercase tracking-wider">
              <ArrowRight className="h-3 w-3" />
              Origen: Renegociación
            </span>
            <div className="grid grid-cols-3 gap-3">
              <SummaryStat label="Precio Anterior" value={proposal.precioAnterior != null ? formatCurrency(proposal.precioAnterior) : "—"} compact />
              <SummaryStat label="Precio Nuevo" value={proposal.precioNuevo != null ? formatCurrency(proposal.precioNuevo) : "—"} compact />
              <SummaryStat
                label="Diferencia"
                value={proposal.diferencia != null ? `${proposal.diferencia > 0 ? "+" : ""}${formatCurrency(proposal.diferencia)}` : "—"}
                compact
                tone={proposal.diferencia != null ? (proposal.diferencia > 0 ? "danger" : "success") : undefined}
              />
            </div>
            {proposal.motivo && (
              <div>
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Motivo de la renegociación</span>
                <p className="text-xs text-slate-700 font-medium">{proposal.motivo}</p>
              </div>
            )}
          </div>
        )}

        {proposal.motivoAnticipoExcedido && (
          <div className="rounded-lg border border-warning-200 bg-warning-50/50 p-3.5">
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-warning-700 uppercase tracking-wider mb-1">
              <MessageSquareWarning className="h-3 w-3" />
              Motivo del exceso de anticipo
            </span>
            <p className="text-xs text-slate-700 font-medium">{proposal.motivoAnticipoExcedido}</p>
          </div>
        )}

        {/* Detalle de materiales cotizados */}
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Detalle de Materiales Cotizados</span>
          </div>
          {materialItems.length === 0 ? (
            <p className="px-3.5 py-4 text-center text-[10px] text-slate-400 italic">Sin detalle línea por línea para esta propuesta.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-100 bg-white text-[8px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2 text-center">Cant.</th>
                    <th className="px-3 py-2">Unidad</th>
                    <th className="px-3 py-2 text-right">Precio unit.</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {materialItems.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <span className="font-semibold text-slate-700 text-[11px]">{item.materialName}</span>
                        {item.notes && <span className="block text-[9px] text-slate-400 mt-0.5">{item.notes}</span>}
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-slate-600 text-[11px]">{item.quantity}</td>
                      <td className="px-3 py-2 text-slate-500 font-medium text-[11px]">{item.unit}</td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-600">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700 text-[11px]">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td colSpan={4} className="px-3 py-2 text-right text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Total materiales:
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs font-black text-emerald-700">{formatCurrency(proposal.materialCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Descripción / alcance */}
        <div>
          <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alcance y Condiciones de la Oferta</span>
          <p className="text-xs text-slate-700 font-medium">{proposal.description || "—"}</p>
        </div>
      </div>
    </Modal>
  );
}

function SummaryStat({
  label,
  value,
  emphasize = false,
  compact = false,
  tone,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  compact?: boolean;
  tone?: "success" | "danger";
}) {
  const toneClass = tone === "success" ? "text-success-700" : tone === "danger" ? "text-danger-700" : emphasize ? "text-emerald-700" : "text-slate-700";
  return (
    <div className={`rounded-lg border border-slate-100 bg-slate-50 ${compact ? "px-2.5 py-2" : "px-3 py-2.5"}`}>
      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</span>
      <span className={`font-mono font-black ${emphasize ? "text-sm" : "text-xs"} ${toneClass}`}>{value}</span>
    </div>
  );
}
