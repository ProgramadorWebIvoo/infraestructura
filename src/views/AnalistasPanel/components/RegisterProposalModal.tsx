/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de registro de oferta — separado de AnalistasWorkspace/
 * ExpedienteWorkspaceModal: con la tabla de materiales completa (igual al
 * portal público del proveedor), embeber este formulario dentro del modal de
 * expediente (que ya trae el resumen comparativo + cuadro de propuestas)
 * forzaba demasiado scroll y sensación de aglomeración. Como modal propio,
 * cada tarea (registrar vs. revisar el cuadro) tiene su propia ventana.
 */

import { useState } from "react";
import type { Project, Contractor, Proposal, ProposalMaterialItem, ProposalDurationUnit } from "../../../types";
import { AlertTriangle, Loader2, LayoutList, MessageSquareWarning, Plus, Trash2, Users, Wallet } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import SelectModal from "../../../components/UI/SelectModal";
import NumericInput from "../../../components/UI/NumericInput";
import Select from "../../../components/UI/Select";
import Button from "../../../components/UI/Button";
import ConfirmDialog from "../../../components/UI/ConfirmDialog";
import { HelpHint, RequiredMark } from "../../../components/UI/HintSignals";
import Tabs from "../../../components/UI/Tabs";
import TabPanel from "../../../components/UI/TabPanel";
import { useMaxAdvancePercent } from "../../../hooks/useMaxAdvancePercent";
import { useToast } from "../../../components/UI/Toast";
import { formatCurrency, formatNumber } from "../../../utils";
import { useCurrencyConversion, formatBs } from "../../../hooks/useCurrencyConversion";
import BsAmount from "../../../components/UI/BsAmount";

export const DURATION_UNITS: { value: ProposalDurationUnit; label: string }[] = [
  { value: "dias", label: "Días" },
  { value: "semanas", label: "Semanas" },
  { value: "meses", label: "Meses" },
];

/** Convierte a semanas para deliveryWeeks (columna legada usada por ordenamientos existentes). */
function toDeliveryWeeks(value: number, unit: ProposalDurationUnit): number {
  if (unit === "dias") return Math.max(1, Math.ceil(value / 7));
  if (unit === "meses") return value * 4;
  return value;
}

const DURATION_UNIT_LABEL: Record<ProposalDurationUnit, string> = { dias: "días", semanas: "sem", meses: "meses" };

/** Muestra el plazo tal como fue cargado (días/semanas/meses); si la propuesta
 * es antigua y no tiene durationValue/durationUnit, cae a deliveryWeeks. */
export function formatProposalDuration(prop: { deliveryWeeks: number; durationValue?: number; durationUnit?: ProposalDurationUnit }): string {
  if (prop.durationValue && prop.durationUnit) {
    return `${prop.durationValue} ${DURATION_UNIT_LABEL[prop.durationUnit]}`;
  }
  return prop.deliveryWeeks > 0 ? `${prop.deliveryWeeks} sem` : "Sin dato";
}

interface MaterialItemRow extends ProposalMaterialItem {
  _id: string;
  isCustom: boolean;
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ImportResult {
  message: string;
  imported: number;
  skipped: number;
}

interface RegisterProposalModalProps {
  project: Project;
  contractors: Contractor[];
  onClose: () => void;
  onAddProposal: (projectId: string, proposal: Omit<Proposal, "id">) => void;
  onImportSupplierProposals?: (projectId: string) => Promise<ImportResult>;
}

export default function RegisterProposalModal({
  project,
  contractors,
  onClose,
  onAddProposal,
  onImportSupplierProposals,
}: RegisterProposalModalProps) {
  const { showToast } = useToast();
  const maxAdvancePercent = useMaxAdvancePercent();
  const { convert, hasRates, isLoading: isLoadingRates } = useCurrencyConversion();

  const [modalTab, setModalTab] = useState<"portal" | "manual">(onImportSupplierProposals ? "portal" : "manual");
  const [contractorCode, setContractorCode] = useState(contractors[0]?.code ?? "");
  const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);

  const buildMaterialRows = (): MaterialItemRow[] =>
    (project.materials ?? []).map((m) => ({
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
  const [laborCost, setLaborCost] = useState<number | "">(0);
  const [durationValue, setDurationValue] = useState<number | "">(2);
  const [durationUnit, setDurationUnit] = useState<ProposalDurationUnit>("semanas");
  const [advancePercent, setAdvancePercent] = useState<number | "">(30);
  const [description, setDescription] = useState("");
  const [fechaOferta, setFechaOferta] = useState(todayISODate());
  const [motivoAnticipoExcedido, setMotivoAnticipoExcedido] = useState("");
  const [pendingProposal, setPendingProposal] = useState<Omit<Proposal, "id"> | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const motivoRequired = advancePercent !== "" && advancePercent > maxAdvancePercent;
  const motivoFilled = motivoAnticipoExcedido.trim().length > 0;

  const contractorOptions = contractors.map(c => ({
    value: c.code,
    label: c.name,
    description: `${c.code} · ${c.specialty} · Rating: ${c.rating.toFixed(1)}`,
    raw: c,
  }));

  const materialCostTotal = materialRows.reduce((sum, r) => sum + r.totalPrice, 0);
  const newTotal = materialCostTotal + (Number(laborCost) || 0);
  const approvedBudget = project.approvedInvestmentAmount ?? 0;
  const exceedsBudget = approvedBudget > 0 && newTotal > approvedBudget;
  const budgetExcess = newTotal - approvedBudget;
  const exceedsAdvance = advancePercent !== "" && advancePercent > maxAdvancePercent;

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

  const commitProposal = (proposal: Omit<Proposal, "id">) => {
    onAddProposal(project.id, proposal);
    onClose();
  };

  const handleAddProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (motivoRequired && !motivoFilled) return;
    const contractor = contractors.find(c => c.code === contractorCode);
    if (!contractor) return;

    const laborCostNum = Number(laborCost || 0);
    const durationValueNum = Number(durationValue || 1);
    const materialItems = materialRows
      .filter((r) => !r.isCustom || r.materialName.trim() !== "")
      .map(({ _id: _unused, isCustom: _unusedCustom, ...item }) => item);

    const proposal: Omit<Proposal, "id"> = {
      contractorCode: contractor.code,
      contractorName: contractor.name,
      contractorRating: contractor.rating,
      materialCost: materialCostTotal,
      materialItems,
      laborCost: laborCostNum,
      totalCost: materialCostTotal + laborCostNum,
      deliveryWeeks: toDeliveryWeeks(durationValueNum, durationUnit),
      durationValue: durationValueNum,
      durationUnit,
      negotiatedAdvancePercent: Number(advancePercent || 0),
      description: description.trim() || `Propuesta para trabajos de ${project.title}. Incluye materiales e instalación certificada.`,
      origen: "MANUAL",
      fechaOferta,
      ...(motivoFilled ? { motivoAnticipoExcedido: motivoAnticipoExcedido.trim() } : {}),
    };

    if (exceedsBudget || exceedsAdvance) {
      setPendingProposal(proposal);
      return;
    }

    commitProposal(proposal);
  };

  const handleConfirmPending = () => {
    if (!pendingProposal) return;
    commitProposal(pendingProposal);
    setPendingProposal(null);
  };

  const handleImport = async () => {
    if (!onImportSupplierProposals) return;
    setIsImporting(true);
    try {
      const result = await onImportSupplierProposals(project.id);
      showToast(result.message, "success");
      onClose();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Error inesperado al importar propuestas.",
        "error",
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        maxWidth="max-w-4xl"
        icon={<Users className="h-5 w-5" />}
        iconColor="emerald"
        badge="Registrar Oferta"
        title={`Expediente ${project.id}`}
        infoLine={`${project.title} · ${project.location}`}
      >
        <div className="space-y-4">
          <Tabs
            ariaLabel="Método de carga de la oferta"
            activeKey={modalTab}
            onChange={(key) => setModalTab(key as typeof modalTab)}
            layoutId="analistas-modal-tabs"
            fullWidth
            tabs={[
              { key: "portal", label: "Traer del portal" },
              { key: "manual", label: "Carga manual" },
            ]}
          />

          <TabPanel activeKey={modalTab}>
            {modalTab === "portal" ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="p-3 bg-emerald-50 rounded-full border border-emerald-100">
                  <LayoutList className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-xs text-slate-500 font-medium max-w-sm">
                  Importa automáticamente las cotizaciones que los proveedores enviaron a través de su enlace público, sin necesidad de cargarlas manualmente.
                </p>
                <Button
                  onClick={handleImport}
                  disabled={isImporting || !onImportSupplierProposals}
                  variant="primary"
                  colorScheme="emerald"
                  icon={isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutList className="h-4 w-4" />}
                >
                  {isImporting ? "Importando..." : "Traer del portal"}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleAddProposal} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Proveedor / Contratista
                      <RequiredMark filled={!!contractorCode} />
                    </label>
                    <SelectModal
                      isOpen={isContractorModalOpen}
                      onClose={() => setIsContractorModalOpen(false)}
                      onOpen={() => setIsContractorModalOpen(true)}
                      onSelect={(opt) => setContractorCode(opt.value as string)}
                      onDeselect={() => setContractorCode("")}
                      options={contractorOptions}
                      selectedValue={contractorCode}
                      triggerLabel="Seleccionar proveedor..."
                      title="Seleccionar Proveedor"
                      infoLine={`${contractorOptions.length} proveedores disponibles`}
                      icon={<Users className="h-5 w-5" />}
                      iconColor="sky"
                      maxWidth="max-w-xl"
                      searchPlaceholder="Buscar por nombre, código, especialidad..."
                    />
                  </div>

                  <div>
                    <label htmlFor="analistas-fecha-oferta" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Fecha de la Oferta
                      <RequiredMark filled={fechaOferta.trim().length > 0} />
                    </label>
                    <input
                      id="analistas-fecha-oferta"
                      type="date"
                      value={fechaOferta}
                      onChange={(e) => setFechaOferta(e.target.value)}
                      max={todayISODate()}
                      className="w-full text-xs px-3.5 py-3 rounded-control border border-border-default outline-hidden focus:ring-2 focus:ring-brand-500 bg-surface font-mono font-bold text-text-secondary"
                    />
                  </div>
                </div>

                {/* Materiales — misma tabla que usa el proveedor en el enlace
                    público: los ítems del proyecto son la base editable, y
                    se pueden agregar líneas adicionales no contempladas. */}
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
                              Sin materiales base en el expediente. Agregue líneas manualmente.
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
                                    className="w-full min-w-[120px] rounded-lg border border-amber-200 px-2 py-1.5 text-[11px] font-semibold text-slate-800 outline-hidden focus:border-amber-400"
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
                                    className="!w-16 !px-2 !py-1.5 !text-center !text-[11px]"
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
                                  className="!w-24 !px-2 !py-1.5 !text-right !text-[11px]"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700 text-[11px]">
                                {row.totalPrice > 0 ? (
                                  <>
                                    {formatCurrency(row.totalPrice)}
                                    <BsAmount amount={row.totalPrice} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} className="text-emerald-500/80 font-normal" />
                                  </>
                                ) : "—"}
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
                          <td className="px-3 py-2 text-right font-mono text-xs font-black text-emerald-700">
                            {formatCurrency(materialCostTotal)}
                            <BsAmount amount={materialCostTotal} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} className="text-emerald-500/80 font-semibold" />
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="analistas-labor-cost" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Costo Mano de Obra ($)
                      <HelpHint content="Puede dejarse en 0 cuando el proveedor no cobra mano de obra por separado (ya incluida en materiales o autoinstalación)." />
                    </label>
                    <NumericInput id="analistas-labor-cost" value={laborCost} onChange={setLaborCost} min={0} placeholder="0.00" />
                    {hasRates && typeof laborCost === "number" && laborCost > 0 && (
                      <p className="mt-1.5 text-[10px] font-mono font-semibold text-slate-500">≈ Bs. {formatBs(convert(laborCost, "USD"))}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="analistas-duration-value" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Plazo de Ejecución
                      <RequiredMark filled={durationValue !== "" && durationValue > 0} />
                    </label>
                    <div className="flex gap-1.5">
                      <NumericInput id="analistas-duration-value" value={durationValue} onChange={setDurationValue} min={1} integer placeholder="0" className="!flex-1" />
                      <div className="w-28">
                        <Select value={durationUnit} onChange={(v) => setDurationUnit(v as ProposalDurationUnit)} options={DURATION_UNITS} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="analistas-advance" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Anticipo Negociado (%)
                      <RequiredMark filled={advancePercent !== "" && advancePercent >= 0} />
                      <HelpHint content={`El máximo permitido por CONFIG APP es ${maxAdvancePercent}%. Anticipos mayores requieren confirmación manual antes de cargarse.`} />
                    </label>
                    <NumericInput id="analistas-advance" value={advancePercent} onChange={setAdvancePercent} min={0} max={100} integer placeholder="0" />
                    {advancePercent !== "" && advancePercent > maxAdvancePercent && (
                      <p className="mt-1 flex items-center gap-1 text-[9px] font-bold text-amber-600">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        Supera el máximo permitido ({maxAdvancePercent}%)
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="analistas-bid-desc" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Alcance y Condiciones de la Oferta
                    <HelpHint content="Opcional. Si se deja vacío, se genera una descripción automática a partir del título del expediente." />
                  </label>
                  <input
                    id="analistas-bid-desc"
                    type="text"
                    placeholder="Ej. Suministro total de cables, incluye garantía y flete."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-slate-700 font-medium"
                  />
                </div>

                {exceedsBudget && (
                  <p className="flex items-center gap-1 text-[9px] font-bold text-amber-600">
                    <Wallet className="h-3 w-3 shrink-0" />
                    Supera la inversión autorizada (${formatNumber(approvedBudget)}) en ${formatNumber(budgetExcess)}
                    <BsAmount amount={budgetExcess} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} variant="inline" className="text-amber-600/70" />
                  </p>
                )}

                {motivoRequired && (
                  <div>
                    <label htmlFor="analistas-motivo-anticipo" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      <MessageSquareWarning className="h-3 w-3 shrink-0 text-warning-500" />
                      Motivo del exceso de anticipo
                      <RequiredMark filled={motivoFilled} />
                      <HelpHint content="Obligatorio: el anticipo negociado excede el máximo configurado en CONFIG APP — justifica esta excepción para auditoría." />
                    </label>
                    <textarea
                      id="analistas-motivo-anticipo"
                      value={motivoAnticipoExcedido}
                      onChange={(e) => setMotivoAnticipoExcedido(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="Ej. Proveedor exige anticipo mayor por escasez de materiales importados."
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-warning-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-warning-500 text-slate-700 font-medium resize-none"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-emerald-100/60">
                  <div className="text-xs font-bold text-slate-700">
                    Costo Total Oferta:{" "}
                    <span className={`font-mono text-sm font-black ${exceedsBudget ? "text-amber-700" : "text-emerald-700"}`}>
                      ${formatNumber(newTotal)}
                    </span>
                    <BsAmount amount={newTotal} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} variant="inline" />
                  </div>
                  <Button
                    id="btn-analistas-add-bid"
                    type="submit"
                    variant="primary"
                    colorScheme="emerald"
                    icon={<Plus className="h-4 w-4" />}
                    disabled={motivoRequired && !motivoFilled}
                  >
                    Agregar al Cuadro
                  </Button>
                </div>
              </form>
            )}
          </TabPanel>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!pendingProposal}
        onClose={() => setPendingProposal(null)}
        onConfirm={handleConfirmPending}
        title="¿Está seguro de cargar esta propuesta?"
        message={[
          exceedsBudget
            ? `El costo total (${formatNumber(newTotal)}) supera la inversión autorizada (${formatNumber(approvedBudget)}) en ${formatNumber(budgetExcess)}.`
            : null,
          exceedsAdvance
            ? `El anticipo negociado (${advancePercent}%) supera el máximo permitido en CONFIG APP (${maxAdvancePercent}%).`
            : null,
          "Puede continuar si esta condición fue negociada o autorizada de otra forma.",
        ].filter(Boolean).join(" ")}
        variant="warning"
        confirmLabel="Sí, cargar propuesta"
      />
    </>
  );
}
