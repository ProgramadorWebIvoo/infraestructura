/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Portal público de RENEGOCIACIÓN — lo que ve el proveedor externo al abrir
 * el enlace de un solo uso enviado por correo desde AnalistasPanel
 * (RenegotiateProposalModal → botón "Enviar enlace público"). Mismos campos
 * exactos que el formulario manual (ver RenegotiateProposalModal.tsx /
 * RenegotiateProposalRequest::baseRules()), con el lenguaje visual de los
 * demás enlaces públicos (fondo con orbes, TopBar, entrada en cascada) — ver
 * PropuestaMaterialesPublica/index.tsx, de donde se duplica el BackgroundDecor
 * (cada portal público vive en su propio módulo lazy-loaded, sin razón para
 * acoplarse a otro solo por ~30 líneas de JSX decorativo).
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { useToast } from "@/components/UI/Toast";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, MessageSquareWarning, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { formatCurrency } from "@ivoo/shared";
import { apiFetch } from "@/services/api";
import { containerVariants, itemVariants, springs } from "@/animations";
import NumericInput from "@/components/UI/NumericInput";
import Select from "@/components/UI/Select";
import DatePicker from "@/components/UI/DatePicker";
import Button from "@/components/UI/Button";
import {
  RENEGOTIATION_DURATION_UNITS,
  type RenegotiationDurationUnit,
  type RenegotiationInvitationPublicInfo,
  type RenegotiationMaterialRow,
} from "./types";

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function BackgroundDecor() {
  const reduceMotion = useReducedMotion();
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(155deg,#020617_0%,#0b1220_38%,#0c1e3d_62%,#020617_100%)]" />
      <motion.div
        className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-amber-500/20 blur-[110px]"
        animate={reduceMotion ? undefined : { x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-48 -right-32 h-[34rem] w-[34rem] rounded-full bg-indigo-500/15 blur-[120px]"
        animate={reduceMotion ? undefined : { x: [0, -40, 0], y: [0, -26, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 21, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(2,6,23,0.55)_100%)]" />
    </div>
  );
}

function TopBar() {
  const reduceMotion = useReducedMotion();
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: -8 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/25 ring-1 ring-white/12 ring-inset">
            <ArrowRight className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight">IVOO — Renegociación de Oferta</h1>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Portal público de renegociación</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-200 shadow-[0_0_12px_-4px_#34d399] sm:flex">
          <ShieldCheck className="h-3.5 w-3.5" />
          Envío seguro
        </div>
      </motion.div>
    </header>
  );
}

export default function RenegociacionPublica() {
  const { showToast } = useToast();
  const { token } = useParams<{ token: string }>();

  const [invitation, setInvitation] = useState<RenegotiationInvitationPublicInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [materialRows, setMaterialRows] = useState<RenegotiationMaterialRow[]>([]);
  const [laborCost, setLaborCost] = useState<number | "">("");
  const [durationValue, setDurationValue] = useState<number | "">("");
  const [durationUnit, setDurationUnit] = useState<RenegotiationDurationUnit>("semanas");
  const [advancePercent, setAdvancePercent] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [fechaOferta, setFechaOferta] = useState(todayISODate());
  const [quoteCurrency, setQuoteCurrency] = useState("USD");
  const [motivo, setMotivo] = useState("");
  const [motivoAnticipoExcedido, setMotivoAnticipoExcedido] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState("");

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        const data = await apiFetch<RenegotiationInvitationPublicInfo>(`/public/renegotiations/${token}`);
        setInvitation(data);
        const { proposal } = data;

        setMaterialRows(
          (proposal.materialItems ?? []).length > 0
            ? proposal.materialItems!.map((m, i) => ({ _id: `existing-${i}`, ...m, isCustom: false }))
            : proposal.materials.map((m) => ({
                _id: String(m.id ?? m.name),
                materialName: m.name,
                quantity: m.quantity,
                unit: m.unit,
                unitPrice: 0,
                totalPrice: 0,
                notes: "",
                isCustom: false,
              })),
        );
        setLaborCost(proposal.laborCost);
        setDurationValue(proposal.durationValue ?? proposal.deliveryWeeks);
        setDurationUnit(proposal.durationUnit ?? "semanas");
        setAdvancePercent(proposal.negotiatedAdvancePercent);
        setDescription(proposal.description);
        setQuoteCurrency(proposal.quoteCurrency || "USD");
      } catch {
        setLoadError("No se pudo conectar con el servidor.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [token]);

  const proposal = invitation?.proposal;
  const maxAdvancePercent = invitation?.maxAdvancePercent ?? 100;

  const motivoFilled = motivo.trim().length > 0;
  const materialCostTotal = materialRows.reduce((sum, r) => sum + r.totalPrice, 0);
  const newTotal = materialCostTotal + (Number(laborCost) || 0);
  const diferencia = newTotal - (proposal?.totalCostOriginal ?? 0);

  const minFechaOferta = proposal?.fechaOferta;
  const exceedsAdvance = advancePercent !== "" && advancePercent > maxAdvancePercent;
  const motivoAnticipoRequired = exceedsAdvance;
  const motivoAnticipoFilled = motivoAnticipoExcedido.trim().length > 0;
  const canSubmit = motivoFilled && (!motivoAnticipoRequired || motivoAnticipoFilled);

  const updateMaterialRow = (index: number, field: keyof RenegotiationMaterialRow, value: string | number) => {
    setMaterialRows((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: value } as RenegotiationMaterialRow;
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
    if (!canSubmit || isSubmitting || !proposal) return;

    const laborCostNum = Number(laborCost || 0);
    const durationValueNum = Number(durationValue || 1);
    const materialItems = materialRows
      .filter((r) => !r.isCustom || r.materialName.trim() !== "")
      .map(({ _id: _unused, isCustom: _unusedCustom, ...item }) => item);
    const deliveryWeeks = durationUnit === "dias" ? Math.max(1, Math.ceil(durationValueNum / 7)) : durationUnit === "meses" ? durationValueNum * 4 : durationValueNum;

    setIsSubmitting(true);
    try {
      const result = await apiFetch<{ id: string }>(`/public/renegotiations/${token}/proposal`, {
        method: "POST",
        body: JSON.stringify({
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
          quoteCurrency,
        }),
      });
      setSubmittedId(result.id);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo enviar la renegociación.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
        <BackgroundDecor />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 flex flex-col items-center gap-3 text-slate-400"
        >
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-widest">Cargando renegociación…</span>
        </motion.div>
      </div>
    );
  }

  if (loadError || !invitation || !proposal) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6 text-white">
        <BackgroundDecor />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 space-y-3 text-center"
        >
          <motion.span
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...springs.snappy, delay: 0.1 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-500"
          >
            <AlertTriangle className="h-7 w-7" />
          </motion.span>
          <h2 className="text-xl font-black text-slate-300">{loadError || "Enlace no disponible"}</h2>
          <p className="text-sm text-slate-500">Verifique el enlace recibido o contacte a IVOO.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans text-white antialiased">
      <BackgroundDecor />

      <div className="relative z-10">
        <TopBar />

        <motion.main variants={containerVariants} initial="hidden" animate="visible" className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
          <motion.div variants={itemVariants} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Expediente {proposal.id} — {invitation.contractorName}</p>
            <h2 className="mt-1 text-lg font-black text-white">{invitation.project.title}</h2>
            <p className="text-sm text-slate-400">{invitation.project.location}</p>
          </motion.div>

          {submittedId ? (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-8 text-center"
            >
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...springs.snappy, delay: 0.15 }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-400"
              >
                <CheckCircle2 className="h-9 w-9" strokeWidth={2.25} />
              </motion.span>
              <motion.h3 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }} className="text-xl font-black text-emerald-300">
                Renegociación enviada exitosamente
              </motion.h3>
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38, duration: 0.3 }} className="text-sm text-emerald-200/80">
                Su nueva oferta fue registrada con el código <span className="font-mono font-bold text-emerald-300">{submittedId}</span>.
              </motion.p>
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46, duration: 0.3 }} className="text-xs text-slate-400">
                El equipo de IVOO revisará su renegociación y se comunicará con usted.
              </motion.p>
            </motion.div>
          ) : (
            <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 sm:grid-cols-3">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Precio Anterior {proposal.quoteCurrency && <span className="text-slate-500 font-normal">({proposal.quoteCurrency})</span>}
                  </span>
                  <div className="rounded-lg border border-amber-400/20 bg-white/5 px-3.5 py-3 font-mono text-xs font-bold text-slate-200">
                    {formatCurrency(proposal.totalCostOriginal, proposal.quoteCurrency)}
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Precio Nuevo {quoteCurrency && <span className="text-slate-500 font-normal">({quoteCurrency})</span>}
                  </span>
                  <div className="rounded-lg border border-amber-400/20 bg-white/5 px-3.5 py-3 font-mono text-xs font-bold text-white">
                    {formatCurrency(newTotal, quoteCurrency)}
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Diferencia</span>
                  <div className="flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-white/5 px-3.5 py-3 font-mono text-xs font-bold">
                    <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${diferencia <= 0 ? "text-emerald-400 -rotate-45" : "text-rose-400 rotate-45"}`} />
                    <span className={diferencia <= 0 ? "text-emerald-300" : "text-rose-300"}>{formatCurrency(Math.abs(diferencia), "USD")}</span>
                    <span className="text-[9px] font-medium normal-case text-slate-500">{diferencia <= 0 ? "ahorro" : "aumento"}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3.5 py-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Materiales</span>
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
                    <thead className="sticky top-0 z-10 bg-slate-950">
                      <tr className="border-b border-white/10 text-[8px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-2">Material</th>
                        <th className="px-3 py-2 text-center">Cant.</th>
                        <th className="px-3 py-2">Unidad</th>
                        <th className="px-3 py-2 text-right">Precio unit. ($)</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {materialRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-3 text-center text-[10px] italic text-slate-500">
                            Sin materiales. Agregue líneas manualmente.
                          </td>
                        </tr>
                      ) : (
                        materialRows.map((row, index) => (
                          <tr key={row._id} className={row.isCustom ? "bg-amber-400/5" : ""}>
                            <td className="px-3 py-2">
                              {row.isCustom ? (
                                <input
                                  type="text"
                                  value={row.materialName}
                                  onChange={(e) => updateMaterialRow(index, "materialName", e.target.value)}
                                  placeholder="Nombre del material"
                                  maxLength={220}
                                  className="w-full min-w-30 rounded-lg border border-amber-400/30 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white outline-hidden focus:border-amber-400"
                                />
                              ) : (
                                <span className="text-[11px] font-semibold text-slate-200">{row.materialName}</span>
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
                                <span className="font-mono text-[11px] font-bold text-slate-300">{row.quantity}</span>
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
                                  className="w-16 rounded-lg border border-amber-400/30 bg-white/5 px-2 py-1.5 text-[11px] font-medium text-slate-200 outline-hidden focus:border-amber-400"
                                />
                              ) : (
                                <span className="text-[11px] font-medium text-slate-400">{row.unit}</span>
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
                            <td className="px-3 py-2 text-right font-mono text-[11px] font-bold text-emerald-400">
                              {row.totalPrice > 0 ? formatCurrency(row.totalPrice) : "—"}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {row.isCustom && (
                                <button
                                  type="button"
                                  onClick={() => removeMaterialRow(index)}
                                  className="rounded-lg p-1 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer"
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
                      <tr className="border-t-2 border-white/10 bg-white/5">
                        <td colSpan={4} className="px-3 py-2 text-right text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Total materiales:
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs font-black text-emerald-400">{formatCurrency(materialCostTotal, quoteCurrency)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label htmlFor="rn-labor-cost" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Costo Mano de Obra ($)
                  </label>
                  <NumericInput id="rn-labor-cost" value={laborCost} onChange={setLaborCost} min={0} placeholder="0.00" accent="warning" />
                </div>

                <div>
                  <label htmlFor="rn-duration-value" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Plazo de Ejecución
                  </label>
                  <div className="flex gap-1.5">
                    <NumericInput id="rn-duration-value" value={durationValue} onChange={setDurationValue} min={1} integer placeholder="0" className="flex-1!" accent="warning" />
                    <div className="w-28">
                      <Select value={durationUnit} onChange={(v) => setDurationUnit(v as RenegotiationDurationUnit)} options={RENEGOTIATION_DURATION_UNITS} />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="rn-advance" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Anticipo Negociado (%)
                  </label>
                  <NumericInput id="rn-advance" value={advancePercent} onChange={setAdvancePercent} min={0} max={100} integer placeholder="0" accent="warning" />
                  {advancePercent !== "" && advancePercent > maxAdvancePercent && (
                    <p className="mt-1 flex items-center gap-1 text-[9px] font-bold text-amber-400">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      Supera el máximo permitido ({maxAdvancePercent}%)
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label htmlFor="rn-fecha-oferta" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Fecha de la Renegociación
                  </label>
                  <DatePicker id="rn-fecha-oferta" value={fechaOferta} onChange={setFechaOferta} min={minFechaOferta} max={todayISODate()} accent="warning" />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Moneda Cotización</label>
                  <Select
                    value={quoteCurrency}
                    onChange={setQuoteCurrency}
                    options={[
                      { value: "USD", label: "USD ($)" },
                      { value: "EUR", label: "EUR (€)" },
                    ]}
                    size="md"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="rn-desc" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Alcance y Condiciones de la Oferta
                </label>
                <input
                  id="rn-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-slate-200 outline-hidden focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <label htmlFor="rn-motivo" className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <MessageSquareWarning className="h-3 w-3 shrink-0 text-amber-400" />
                  Motivo
                </label>
                <textarea
                  id="rn-motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Ej. Bajamos el precio tras revisar cantidades."
                  className="w-full resize-none rounded-lg border border-amber-400/30 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-slate-200 outline-hidden focus:ring-1 focus:ring-amber-400"
                />
              </div>

              {motivoAnticipoRequired && (
                <div>
                  <label htmlFor="rn-motivo-anticipo" className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <MessageSquareWarning className="h-3 w-3 shrink-0 text-amber-400" />
                    Motivo del exceso de anticipo
                  </label>
                  <textarea
                    id="rn-motivo-anticipo"
                    value={motivoAnticipoExcedido}
                    onChange={(e) => setMotivoAnticipoExcedido(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Ej. Se exige anticipo mayor por escasez de materiales importados."
                    className="w-full resize-none rounded-lg border border-amber-400/30 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-slate-200 outline-hidden focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              )}

              <div className="flex justify-end border-t border-white/10 pt-4">
                <Button
                  id="btn-public-renegotiate-submit"
                  type="submit"
                  variant="primary"
                  colorScheme="emerald"
                  icon={<ArrowRight className="h-4 w-4" />}
                  disabled={!canSubmit || isSubmitting}
                  isLoading={isSubmitting}
                >
                  {isSubmitting ? "Enviando..." : "Confirmar Renegociación"}
                </Button>
              </div>
            </motion.form>
          )}
        </motion.main>

        <footer className="mt-10 border-t border-white/10 py-6 text-center text-xs font-medium text-slate-600">
          IVOO Gestión de Infraestructura &copy; {new Date().getFullYear()} — Portal de Renegociación
        </footer>
      </div>
    </div>
  );
}
