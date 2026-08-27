/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Renegociar una propuesta ya cargada — a diferencia de una carga normal, NO
 * es una oferta independiente: reemplaza una propuesta existente. El precio
 * anterior se toma directamente de esa propuesta (nunca se tipea a mano, para
 * que no quede desincronizado por error), y la propuesta original se
 * conserva intacta en el historial auditable (nunca se borra ni se
 * sobrescribe) — base para el futuro análisis inflacionario de productos.
 */

import { useState } from "react";
import type { Project, Proposal, ProposalMaterialItem, ProposalDurationUnit } from "../../../types";
import { AlertTriangle, ArrowRight, MessageSquareWarning, Plus, Trash2, Wallet } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import NumericInput from "../../../components/UI/NumericInput";
import Select from "../../../components/UI/Select";
import Button from "../../../components/UI/Button";
import { HelpHint, RequiredMark } from "../../../components/UI/HintSignals";
import { useMaxAdvancePercent } from "../../../hooks/useMaxAdvancePercent";
import { formatCurrency, formatNumber } from "../../../utils";
import { DURATION_UNITS } from "./RegisterProposalModal";

interface MaterialItemRow extends ProposalMaterialItem {
  _id: string;
  isCustom: boolean;
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

type RenegotiationPayload = Omit<Proposal, "id" | "contractorCode" | "contractorName" | "contractorRating" | "origen" | "precioAnterior" | "precioNuevo" | "diferencia">;

interface RenegotiateProposalModalProps {
  project: Project;
  proposal: Proposal;
  onClose: () => void;
  onRenegotiateProposal: (projectId: string, proposalId: string, renegotiation: RenegotiationPayload) => Promise<void>;
}

export default function RenegotiateProposalModal({ project, proposal, onClose, onRenegotiateProposal }: RenegotiateProposalModalProps) {
  const maxAdvancePercent = useMaxAdvancePercent();

  const buildMaterialRows = (): MaterialItemRow[] =>
    (proposal.materialItems ?? []).length > 0
      ? proposal.materialItems!.map((m, i) => ({ _id: `existing-${i}`, ...m, isCustom: false }))
      : (project.materials ?? []).map((m) => ({
          _id: String(m.id ?? m.name),
          materialName: m.name,
          quantity: m.quantity,
          unit: m.unit,
          unitPrice: 0,
          totalPrice: 0,
          notes: "",
          isCustom: false,
        }));

  const [materialRows, setMaterialRows] = useState<MaterialItemRow[]>(buildMaterialRows);
  const [laborCost, setLaborCost] = useState<number | "">(proposal.laborCost);
  const [durationValue, setDurationValue] = useState<number | "">(proposal.durationValue ?? proposal.deliveryWeeks);
  const [durationUnit, setDurationUnit] = useState<ProposalDurationUnit>(proposal.durationUnit ?? "semanas");
  const [advancePercent, setAdvancePercent] = useState<number | "">(proposal.negotiatedAdvancePercent);
  const [description, setDescription] = useState(proposal.description);
  const [fechaOferta, setFechaOferta] = useState(todayISODate());
  const [motivo, setMotivo] = useState("");
  const [motivoAnticipoExcedido, setMotivoAnticipoExcedido] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const motivoFilled = motivo.trim().length > 0;
  const materialCostTotal = materialRows.reduce((sum, r) => sum + r.totalPrice, 0);
  const newTotal = materialCostTotal + (Number(laborCost) || 0);
  const approvedBudget = project.approvedInvestmentAmount ?? 0;
  const exceedsBudget = approvedBudget > 0 && newTotal > approvedBudget;
  const budgetExcess = newTotal - approvedBudget;
  const diferencia = newTotal - proposal.totalCost;
  const minFechaOferta = proposal.fechaOferta;
  const exceedsAdvance = advancePercent !== "" && advancePercent > maxAdvancePercent;
  const motivoAnticipoRequired = exceedsAdvance;
  const motivoAnticipoFilled = motivoAnticipoExcedido.trim().length > 0;
  const canSubmit = motivoFilled && (!motivoAnticipoRequired || motivoAnticipoFilled);

  const updateMaterialRow = (index: number, field: keyof MaterialItemRow, value: string | number) => {
    setMaterialRows((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: value } as MaterialItemRow;
      if (field === "unitPrice" || field === "quantity") {
        row.totalPrice = parseFloat(((Number(row.unitPrice) || 0) * (Number(row.quantity) || 0)).toFixed(2));
      }
      next[index] = row;
      return next;
    });
  };

  const addCustomMaterialRow = () => {
    setMaterialRows((prev) => [
      ...prev,
      { _id: `custom-${Date.now()}`, materialName: "", quantity: 1, unit: "", unitPrice: 0, totalPrice: 0, notes: "", isCustom: true },
    ]);
  };

  const removeMaterialRow = (index: number) => {
    setMaterialRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    const laborCostNum = Number(laborCost || 0);
    const durationValueNum = Number(durationValue || 1);
    const materialItems = materialRows
      .filter((r) => !r.isCustom || r.materialName.trim() !== "")
      .map(({ _id: _unused, isCustom: _unusedCustom, ...item }) => item);
    const deliveryWeeks = durationUnit === "dias" ? Math.max(1, Math.ceil(durationValueNum / 7)) : durationUnit === "meses" ? durationValueNum * 4 : durationValueNum;

    setIsSubmitting(true);
    try {
      await onRenegotiateProposal(project.id, proposal.id, {
        materialCost: materialCostTotal,
        materialItems,
        laborCost: laborCostNum,
        totalCost: newTotal,
        deliveryWeeks,
        durationValue: durationValueNum,
        durationUnit,
        negotiatedAdvancePercent: Number(advancePercent || 0),
        description: description.trim() || proposal.description,
        fechaOferta,
        motivo: motivo.trim(),
        ...(motivoAnticipoFilled ? { motivoAnticipoExcedido: motivoAnticipoExcedido.trim() } : {}),
      });
      onClose();
    } catch {
      // el toast de error ya lo muestra el handler
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="max-w-4xl"
      icon={<ArrowRight className="h-5 w-5" />}
      iconColor="warning"
      badge="Renegociar Oferta"
      title={`${proposal.contractorName} · ${proposal.contractorCode}`}
      infoLine={`Expediente ${project.id} — reemplaza la propuesta ${proposal.id}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Precio anterior — solo lectura, tomado directamente del registro que se reemplaza */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-lg bg-warning-50/50 border border-warning-100">
          <div>
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Precio Anterior</span>
            <div className="w-full text-xs px-3.5 py-3 rounded-control border border-warning-200 bg-white font-mono font-bold text-slate-600">
              {formatCurrency(proposal.totalCost)}
            </div>
          </div>
          <div>
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Precio Nuevo</span>
            <div className="w-full text-xs px-3.5 py-3 rounded-control border border-warning-200 bg-white font-mono font-bold text-slate-700">
              {formatCurrency(newTotal)}
            </div>
          </div>
          <div>
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Diferencia</span>
            <div className="w-full text-xs px-3.5 py-3 rounded-control border border-warning-200 bg-white font-mono font-bold flex items-center gap-1.5">
              <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${diferencia <= 0 ? "text-success-500 -rotate-45" : "text-danger-500 rotate-45"}`} />
              <span className={diferencia <= 0 ? "text-success-700" : "text-danger-700"}>{formatCurrency(Math.abs(diferencia))}</span>
              <span className="text-[9px] text-slate-400 normal-case font-medium">{diferencia <= 0 ? "ahorro" : "aumento"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Materiales</span>
            <button
              type="button"
              onClick={addCustomMaterialRow}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-1 text-[9px] font-black text-white transition hover:bg-emerald-600 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              Agregar material
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-100 bg-white text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2">Material</th>
                  <th className="px-3 py-2 text-center">Cant.</th>
                  <th className="px-3 py-2">Unidad</th>
                  <th className="px-3 py-2 text-right">Precio unit. ($)</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {materialRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-3 text-center text-[10px] text-slate-400 italic">
                      Sin materiales. Agregue líneas manualmente.
                    </td>
                  </tr>
                ) : (
                  materialRows.map((row, index) => (
                    <tr key={row._id} className={row.isCustom ? "bg-amber-50/30" : ""}>
                      <td className="px-3 py-2">
                        {row.isCustom ? (
                          <input
                            type="text"
                            value={row.materialName}
                            onChange={(e) => updateMaterialRow(index, "materialName", e.target.value)}
                            placeholder="Nombre del material"
                            maxLength={220}
                            className="w-full min-w-30 rounded-lg border border-amber-200 px-2 py-1.5 text-[11px] font-semibold text-slate-800 outline-hidden focus:border-amber-400"
                          />
                        ) : (
                          <span className="font-semibold text-slate-700 text-[11px]">{row.materialName}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.isCustom ? (
                          <NumericInput
                            value={row.quantity === 0 ? "" : row.quantity}
                            onChange={(v) => updateMaterialRow(index, "quantity", v === "" ? 0 : v)}
                            placeholder="0"
                            integer
                            className="w-16! px-2! py-1.5! text-center! text-[11px]!"
                          />
                        ) : (
                          <span className="font-mono font-bold text-slate-600 text-[11px]" title="Cantidad auditada en Cierre de Obra — no editable">
                            {row.quantity}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.isCustom ? (
                          <input
                            type="text"
                            value={row.unit}
                            onChange={(e) => updateMaterialRow(index, "unit", e.target.value)}
                            placeholder="Und."
                            maxLength={60}
                            className="w-16 rounded-lg border border-amber-200 px-2 py-1.5 text-[11px] font-medium text-slate-700 outline-hidden focus:border-amber-400"
                          />
                        ) : (
                          <span className="text-slate-500 font-medium text-[11px]">{row.unit}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <NumericInput
                          value={row.unitPrice === 0 ? "" : row.unitPrice}
                          onChange={(v) => updateMaterialRow(index, "unitPrice", v === "" ? 0 : v)}
                          placeholder="0.00"
                          className="w-24! px-2! py-1.5! text-right! text-[11px]!"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700 text-[11px]">
                        {row.totalPrice > 0 ? formatCurrency(row.totalPrice) : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.isCustom && (
                          <button
                            type="button"
                            onClick={() => removeMaterialRow(index)}
                            className="rounded-lg p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500 cursor-pointer"
                            aria-label="Eliminar material"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 sticky bottom-0">
                  <td colSpan={4} className="px-3 py-2 text-right text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Total materiales:
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs font-black text-emerald-700">{formatCurrency(materialCostTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label htmlFor="renegotiate-labor-cost" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Costo Mano de Obra ($)
            </label>
            <NumericInput id="renegotiate-labor-cost" value={laborCost} onChange={setLaborCost} min={0} placeholder="0.00" />
          </div>

          <div>
            <label htmlFor="renegotiate-duration-value" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Plazo de Ejecución
              <RequiredMark filled={durationValue !== "" && durationValue > 0} />
            </label>
            <div className="flex gap-1.5">
              <NumericInput id="renegotiate-duration-value" value={durationValue} onChange={setDurationValue} min={1} integer placeholder="0" className="flex-1!" />
              <div className="w-28">
                <Select value={durationUnit} onChange={(v) => setDurationUnit(v as ProposalDurationUnit)} options={DURATION_UNITS} />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="renegotiate-advance" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Anticipo Negociado (%)
              <HelpHint content={`El máximo permitido por CONFIG APP es ${maxAdvancePercent}%.`} />
            </label>
            <NumericInput id="renegotiate-advance" value={advancePercent} onChange={setAdvancePercent} min={0} max={100} integer placeholder="0" />
            {advancePercent !== "" && advancePercent > maxAdvancePercent && (
              <p className="mt-1 flex items-center gap-1 text-[9px] font-bold text-amber-600">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Supera el máximo permitido ({maxAdvancePercent}%)
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="renegotiate-fecha-oferta" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Fecha de la Renegociación
            <RequiredMark filled={fechaOferta.trim().length > 0} />
            <HelpHint content={`Debe ser igual o posterior a la fecha de la oferta original (${minFechaOferta}).`} />
          </label>
          <input
            id="renegotiate-fecha-oferta"
            type="date"
            value={fechaOferta}
            onChange={(e) => setFechaOferta(e.target.value)}
            min={minFechaOferta}
            max={todayISODate()}
            className="w-full text-xs px-3.5 py-3 rounded-control border border-border-default outline-hidden focus:ring-2 focus:ring-brand-500 bg-surface font-mono font-bold text-text-secondary"
          />
        </div>

        <div>
          <label htmlFor="renegotiate-desc" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Alcance y Condiciones de la Oferta
          </label>
          <input
            id="renegotiate-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-slate-700 font-medium"
          />
        </div>

        {exceedsBudget && (
          <p className="flex items-center gap-1 text-[9px] font-bold text-amber-600">
            <Wallet className="h-3 w-3 shrink-0" />
            Supera la inversión autorizada (${formatNumber(approvedBudget)}) en ${formatNumber(budgetExcess)}
          </p>
        )}

        <div>
          <label htmlFor="renegotiate-motivo" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            <MessageSquareWarning className="h-3 w-3 shrink-0 text-warning-500" />
            Motivo
            <RequiredMark filled={motivoFilled} />
            <HelpHint content="Obligatorio: explica por qué se renegoció esta oferta, para dejar trazabilidad de la excepción." />
          </label>
          <textarea
            id="renegotiate-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Ej. El contratista bajó el precio tras revisar cantidades."
            className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-warning-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-warning-500 text-slate-700 font-medium resize-none"
          />
        </div>

        {motivoAnticipoRequired && (
          <div>
            <label htmlFor="renegotiate-motivo-anticipo" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              <MessageSquareWarning className="h-3 w-3 shrink-0 text-warning-500" />
              Motivo del exceso de anticipo
              <RequiredMark filled={motivoAnticipoFilled} />
              <HelpHint content="Obligatorio: el anticipo negociado excede el máximo configurado en CONFIG APP — es un motivo distinto al de la renegociación, ambos quedan auditados por separado." />
            </label>
            <textarea
              id="renegotiate-motivo-anticipo"
              value={motivoAnticipoExcedido}
              onChange={(e) => setMotivoAnticipoExcedido(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Ej. Proveedor exige anticipo mayor por escasez de materiales importados."
              className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-warning-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-warning-500 text-slate-700 font-medium resize-none"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-emerald-100/60">
          <Button
            id="btn-renegotiate-submit"
            type="submit"
            variant="primary"
            colorScheme="emerald"
            icon={<ArrowRight className="h-4 w-4" />}
            disabled={!canSubmit || isSubmitting}
            isLoading={isSubmitting}
          >
            {isSubmitting ? "Renegociando..." : "Confirmar Renegociación"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
