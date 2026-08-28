/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vista de solo lectura del detalle completo de una propuesta de materiales
 * de proveedor — dispara desde un click en la fila de SupplierProposalsList
 * en vez de un acordeón inline, mismo criterio que InspectProposalModal de
 * Procura: el detalle completo (materiales línea por línea, condiciones de
 * entrega, notas) no cabe en una fila expandida sin saturar la lista.
 */

import { Clock, FileSearch, HandCoins, Mail } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import { Table } from "../../../components/UI/Table";
import type { SupplierMaterialProposal } from "../../../types";

interface InspectSupplierProposalModalProps {
  proposal: SupplierMaterialProposal;
  onClose: () => void;
}

const proposalTotal = (p: SupplierMaterialProposal) =>
  p.items.reduce((sum, i) => sum + i.totalPrice, 0);

export default function InspectSupplierProposalModal({ proposal, onClose }: InspectSupplierProposalModalProps) {
  const total = proposalTotal(proposal);

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="max-w-3xl"
      icon={<FileSearch className="h-5 w-5" />}
      iconColor="indigo"
      badge="Detalle de la Propuesta"
      title={proposal.supplierCompany ? `${proposal.supplierName} · ${proposal.supplierCompany}` : proposal.supplierName}
      infoLine={`${proposal.projectTitleSnapshot} — propuesta ${proposal.id}`}
    >
      <div className="space-y-4">
        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryStat label="Total Oferta" value={`$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} emphasize />
          <SummaryStat label="Materiales" value={String(proposal.items.length)} />
          <SummaryStat label="Enviado" value={proposal.submittedAt} />
          <SummaryStat label="Obra" value={proposal.projectId} />
        </div>

        <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3.5 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="block text-[9px] font-bold text-indigo-500 uppercase tracking-wider mb-1">Proveedor</span>
              <p className="font-semibold text-slate-700">{proposal.supplierName}</p>
              {proposal.supplierCompany && <p className="text-slate-500">{proposal.supplierCompany}</p>}
            </div>
            <div>
              <span className="block text-[9px] font-bold text-indigo-500 uppercase tracking-wider mb-1">Contacto</span>
              <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                {proposal.supplierContact}
              </p>
            </div>
          </div>

          {(proposal.estimatedDays != null || proposal.advancePercent != null) && (
            <div className="pt-2 border-t border-indigo-100 flex flex-wrap items-center gap-x-6 gap-y-2">
              {proposal.estimatedDays != null && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase text-indigo-500">Tiempo estimado:</span>
                  <span className="font-black text-slate-700 text-xs">
                    {proposal.estimatedDays} {proposal.durationUnit ?? "dias"}
                  </span>
                </div>
              )}
              {proposal.advancePercent != null && (
                <div className="flex items-center gap-2">
                  <HandCoins className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase text-indigo-500">Anticipo solicitado:</span>
                  <span className="font-black text-slate-700 text-xs">{proposal.advancePercent}%</span>
                </div>
              )}
            </div>
          )}

          {proposal.generalNotes && (
            <div className="pt-2 border-t border-indigo-100">
              <span className="block text-[9px] font-bold text-indigo-500 uppercase tracking-wider mb-1">Observaciones generales</span>
              <p className="text-xs text-slate-600">{proposal.generalNotes}</p>
            </div>
          )}
        </div>

        {/* Detalle de materiales cotizados */}
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Detalle de Materiales Cotizados</span>
          </div>
          <div className="max-h-80 overflow-y-auto overflow-x-auto">
            <Table
              columns={[
                { key: "materialName", label: "Material", render: (item) => <span className="font-semibold text-slate-800 text-[11px]">{item.materialName}</span> },
                { key: "quantity", label: "Cantidad", align: "center", render: (item) => <span className="font-mono font-bold text-slate-600 text-[11px]">{item.quantity}</span> },
                { key: "unit", label: "Unidad", render: (item) => <span className="text-slate-500 text-[11px]">{item.unit}</span> },
                { key: "unitPrice", label: "PROP (USD)", align: "right", render: (item) => <span className="font-mono font-bold text-slate-700 text-[11px]">${item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span> },
                // EST: Precio estimado (si está disponible)
                ...(proposal.items.some(i => i.estimatedPriceDisplay) ? [{
                  key: "estimatedPrice",
                  label: "EST (USD)",
                  align: "right" as const,
                  render: (item: any) => <span className="font-mono font-bold text-slate-700 text-[11px]">{item.estimatedPriceDisplay || "—"}</span>
                }] : []),
                // VAR%: Variación con color badge
                ...(proposal.items.some(i => i.variationLabel) ? [{
                  key: "variation",
                  label: "VAR%",
                  align: "right" as const,
                  render: (item: any) => (
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="font-mono font-bold text-slate-700 text-[11px]">{item.variationLabel || "—"}</span>
                      {item.variationBadgeColor && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                          item.variationBadgeColor === 'danger' ? 'bg-red-100 text-red-700' :
                          item.variationBadgeColor === 'success' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {item.variationDirection === 'increase' ? '↑' : item.variationDirection === 'decrease' ? '↓' : '—'}
                        </span>
                      )}
                    </div>
                  )
                }] : []),
                { key: "totalPrice", label: "Total", align: "right", render: (item) => <span className="font-mono font-black text-indigo-700 text-[11px]">${item.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span> },
                { key: "notes", label: "Notas", render: (item) => <span className="text-slate-400 italic text-[11px]">{item.notes || "—"}</span> },
              ]}
              data={proposal.items}
              rowKey={(item) => `${item.materialName}-${item.unit}`}
              pageSize={20}
              footer={
                <tr className="border-t-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white">
                  <td colSpan={4} className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-600">Total propuesta:</td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-black text-indigo-700">${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                  <td />
                </tr>
              }
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SummaryStat({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</span>
      <span className={`font-mono font-black ${emphasize ? "text-sm text-indigo-700" : "text-xs text-slate-700"}`}>{value}</span>
    </div>
  );
}
