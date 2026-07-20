/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useToast } from "../components/UI/Toast";
import {
  Building2,
  CheckCircle,
  Clock,
  Mail,
  MapPin,
  Package,
  Plus,
  Send,
  ShieldCheck,
  Loader2,
  Trash2,
} from "lucide-react";
import { SupplierMaterialProposalItem } from "../types";
import { apiFetch } from "../services/api";

interface ProjectPublicData {
  id: string;
  title: string;
  location: string;
  type: string;
  description: string;
  materials: { id: string; name: string; quantity: number; unit: string; estimatedUnitPrice: number }[];
}

interface InvitationPublicInfo {
  supplierName: string;
  supplierCompany?: string;
  supplierContact: string;
  project: ProjectPublicData;
}

interface ItemRow extends Omit<SupplierMaterialProposalItem, 'unitPrice' | 'quantity'> {
  _id: string;
  isCustom: boolean;
  unitPrice: number | "";
  quantity: number | "";
}

type DurationUnit = "dias" | "semanas" | "meses";

export default function PropuestaMaterialesPublica() {
  const { showToast } = useToast();
  const { token } = useParams<{ token: string }>();

  const [invitation, setInvitation] = useState<InvitationPublicInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [items, setItems] = useState<ItemRow[]>([]);
  const [estimatedDays, setEstimatedDays] = useState<number | "">("");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("dias");
  const [generalNotes, setGeneralNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState("");

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        const data = await apiFetch<InvitationPublicInfo>(`/public/invitations/${token}`);
        setInvitation(data);
        setItems(
          data.project.materials.map((m) => ({
            _id: m.id,
            materialName: m.name,
            quantity: m.quantity,
            unit: m.unit,
            unitPrice: 0,
            totalPrice: 0,
            notes: "",
            isCustom: false,
          }))
        );
      } catch {
        setLoadError("No se pudo conectar con el servidor.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [token]);

  const updateItem = (index: number, field: keyof ItemRow, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: value };
      if (field === "unitPrice" || field === "quantity") {
        const uPrice = row.unitPrice === "" ? 0 : Number(row.unitPrice);
        const qty = row.quantity === "" ? 0 : Number(row.quantity);
        row.totalPrice = parseFloat((uPrice * qty).toFixed(2));
      }
      next[index] = row;
      return next;
    });
  };

  const addCustomItem = () => {
    setItems((prev) => [
      ...prev,
      {
        _id: `custom-${Date.now()}`,
        materialName: "",
        quantity: 1,
        unit: "",
        unitPrice: 0,
        totalPrice: 0,
        notes: "",
        isCustom: true,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Strip incomplete custom rows silently
    const validItems = items.filter((i) => !i.isCustom || i.materialName.trim() !== "");

    const hasAnyPrice = validItems.some((i) => Number(i.unitPrice) > 0);
    if (!hasAnyPrice) {
      showToast("Ingresa precio unitario para al menos un material.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiFetch<{ id: string }>(`/public/invitations/${token}/proposal`, {
        method: "POST",
        body: JSON.stringify({
          estimatedDays: estimatedDays !== "" ? Number(estimatedDays) : null,
          durationUnit: estimatedDays !== "" ? durationUnit : null,
          items: validItems.map(({ _id: _u, isCustom: _c, unitPrice, quantity, ...rest }) => ({
            ...rest,
            unitPrice: unitPrice === "" ? 0 : unitPrice,
            quantity: quantity === "" ? 0 : quantity,
          })),
          generalNotes: generalNotes.trim() || null,
        }),
      });
      setSubmittedId(result.id);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo enviar la propuesta.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  if (loadError || !invitation) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Package className="h-12 w-12 text-slate-600 mx-auto" />
          <h2 className="text-xl font-black text-slate-300">{loadError || "Enlace no disponible"}</h2>
          <p className="text-sm text-slate-500">Verifique el enlace recibido o contacte a IVOO.</p>
        </div>
      </div>
    );
  }

  const { project } = invitation;
  const grandTotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
  const projectItems = items.filter((i) => !i.isCustom);
  const customItems = items.filter((i) => i.isCustom);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans antialiased">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/90 sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500 shadow-lg shadow-sky-500/20">
              <Building2 className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight">IVOO — Propuesta de Materiales</h1>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Portal publico de cotizacion</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-200 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Envio seguro
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">

        {/* Supplier identity */}
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 flex flex-wrap items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
            <Mail className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5">Este enlace fue generado para</div>
            <div className="font-black text-white text-sm">{invitation.supplierName}</div>
            {invitation.supplierCompany && (
              <div className="text-xs text-indigo-300 font-semibold">{invitation.supplierCompany}</div>
            )}
            <div className="text-[11px] text-indigo-300/70 font-mono mt-0.5">{invitation.supplierContact}</div>
          </div>
        </div>

        {/* Project info */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-3">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-sky-300">
                  {project.id}
                </span>
                <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-[10px] font-bold text-slate-300">
                  {project.type}
                </span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-white">{project.title}</h2>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400 font-medium">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {project.location}
              </div>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{project.description}</p>
            </div>
          </div>
        </div>

        {submittedId ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center space-y-3">
            <CheckCircle className="h-14 w-14 text-emerald-400 mx-auto" />
            <h3 className="text-xl font-black text-emerald-300">Propuesta enviada exitosamente</h3>
            <p className="text-sm text-emerald-200/80">
              Su cotizacion fue registrada con el codigo{" "}
              <span className="font-mono font-bold text-emerald-300">{submittedId}</span>.
            </p>
            <p className="text-xs text-slate-400">El equipo de IVOO revisara su propuesta y se comunicara con usted.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── Materials table ── */}
            <div className="rounded-2xl border border-white/10 bg-white text-slate-900 shadow-xl shadow-slate-950/30 overflow-hidden">

              {/* Section: project materials */}
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Materiales requeridos por el proyecto</h3>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  Ingrese el precio unitario que puede ofrecer para cada item. Puede dejar en 0 los que no provee.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Material</th>
                      <th className="px-4 py-3 text-center">Cant.</th>
                      <th className="px-4 py-3">Unidad</th>
                      <th className="px-4 py-3 text-right">Precio unitario (USD) *</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3">Notas</th>
                      <th className="px-4 py-3 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">

                    {/* Project-defined rows (read-only name/qty/unit) */}
                    {projectItems.map((item) => {
                      const index = items.indexOf(item);
                      return (
                        <tr key={item._id} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-3 font-semibold text-slate-800 min-w-[160px]">{item.materialName}</td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-slate-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-slate-500 font-medium">{item.unit}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice === 0 ? "" : item.unitPrice}
                                onChange={(e) => { const v = e.target.value.replace(/[eE]/g, ''); updateItem(index, "unitPrice", v === "" ? "" : Math.max(0, parseFloat(v) || 0)); }}
                              onKeyDown={(e) => { if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === 'Subtract') e.preventDefault(); }}
                              onPaste={(e) => { e.preventDefault(); const v = e.clipboardData.getData('text/plain').replace(/[eE]/g, ''); updateItem(index, "unitPrice", v === "" ? "" : Math.max(0, parseFloat(v) || 0)); }}
                              placeholder="0.00"
                              className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-right font-mono text-sm font-bold text-slate-800 outline-hidden focus:border-sky-400 focus:ring-1 focus:ring-sky-200 ml-auto block"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">
                            {item.totalPrice > 0
                              ? `$${item.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.notes ?? ""}
                              onChange={(e) => updateItem(index, "notes", e.target.value)}
                              placeholder="Marca, plazo entrega..."
                              className="w-40 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-hidden focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
                            />
                          </td>
                          <td className="px-4 py-3" />
                        </tr>
                      );
                    })}

                    {/* Divider + heading for supplier-added materials */}
                    <tr>
                      <td colSpan={7} className="px-4 py-2 bg-amber-50 border-y border-amber-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                            Materiales adicionales — agregados por el proveedor
                          </span>
                          <button
                            type="button"
                            onClick={addCustomItem}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-2.5 py-1 text-[10px] font-black text-white transition hover:bg-amber-600"
                          >
                            <Plus className="h-3 w-3" />
                            Agregar material
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Supplier-added rows (all fields editable) */}
                    {customItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 text-center text-xs text-slate-400 italic bg-amber-50/40">
                          Haga clic en "Agregar material" para incluir items adicionales que pueda proveer.
                        </td>
                      </tr>
                    ) : (
                      customItems.map((item) => {
                        const index = items.indexOf(item);
                        return (
                          <tr key={item._id} className="bg-amber-50/40 hover:bg-amber-50/70 transition">
                            <td className="px-4 py-2.5">
                              <input
                                type="text"
                                value={item.materialName}
                                onChange={(e) => updateItem(index, "materialName", e.target.value)}
                                placeholder="Nombre del material *"
                                className="w-full min-w-[140px] rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.quantity === 0 ? "" : item.quantity}
                                onChange={(e) => { const v = e.target.value.replace(/[eE]/g, ''); updateItem(index, "quantity", v === "" ? "" : Math.max(0, parseFloat(v) || 0)); }}
                                onKeyDown={(e) => { if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === 'Subtract') e.preventDefault(); }}
                                onPaste={(e) => { e.preventDefault(); const v = e.clipboardData.getData('text/plain').replace(/[eE]/g, ''); updateItem(index, "quantity", v === "" ? "" : Math.max(0, parseFloat(v) || 0)); }}
                                placeholder="0"
                                className="w-16 rounded-lg border border-amber-200 px-2 py-1.5 text-center font-mono text-xs font-bold text-slate-800 outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => updateItem(index, "unit", e.target.value)}
                                placeholder="Und."
                                className="w-20 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice === 0 ? "" : item.unitPrice}
                              onChange={(e) => { const v = e.target.value.replace(/[eE]/g, ''); updateItem(index, "unitPrice", v === "" ? "" : Math.max(0, parseFloat(v) || 0)); }}
                              onKeyDown={(e) => { if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === 'Subtract') e.preventDefault(); }}
                              onPaste={(e) => { e.preventDefault(); const v = e.clipboardData.getData('text/plain').replace(/[eE]/g, ''); updateItem(index, "unitPrice", v === "" ? "" : Math.max(0, parseFloat(v) || 0)); }}
                                placeholder="0.00"
                                className="w-28 rounded-lg border border-amber-200 px-2.5 py-1.5 text-right font-mono text-sm font-bold text-slate-800 outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-100 ml-auto block"
                              />
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-700">
                              {item.totalPrice > 0
                                ? `$${item.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                                : "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              <input
                                type="text"
                                value={item.notes ?? ""}
                                onChange={(e) => updateItem(index, "notes", e.target.value)}
                                placeholder="Notas..."
                                className="w-40 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                              />
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="rounded-lg p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                                title="Eliminar fila"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td colSpan={4} className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-600">
                        Total estimado propuesta:
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-black text-sky-700">
                        ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Estimated duration */}
            <div className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-xl shadow-slate-950/30">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                <Clock className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Tiempo estimado de ejecucion</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium mb-4">
                Indique cuanto tiempo estima que tomaria completar esta obra desde el inicio de los trabajos.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={estimatedDays}
                    onChange={(e) => { const v = e.target.value.replace(/[eE]/g, ''); setEstimatedDays(v === "" ? "" : Math.max(0, parseInt(v) || 0) || ""); }}
                    onKeyDown={(e) => { if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === 'Subtract') e.preventDefault(); }}
                    onPaste={(e) => { e.preventDefault(); const v = e.clipboardData.getData('text/plain').replace(/[eE]/g, ''); setEstimatedDays(v === "" ? "" : Math.max(0, parseInt(v) || 0) || ""); }}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-bold text-slate-800 outline-hidden transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
                <div className="w-36">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Unidad</label>
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-semibold text-slate-700 outline-hidden transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="dias">Dias</option>
                    <option value="semanas">Semanas</option>
                    <option value="meses">Meses</option>
                  </select>
                </div>
              </div>
            </div>

            {/* General notes */}
            <div className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-xl shadow-slate-950/30">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Observaciones generales (opcional)
              </label>
              <textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                rows={3}
                placeholder="Condiciones de pago, garantias, disponibilidad, etc."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-800 outline-hidden transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-4 text-sm font-black text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Enviando propuesta..." : "Enviar propuesta de materiales"}
            </button>
          </form>
        )}
      </main>

      <footer className="border-t border-white/10 py-6 mt-10 text-center text-xs text-slate-600 font-medium">
        IVOO Gestion de Infraestructura &copy; {new Date().getFullYear()} — Portal de Cotizacion de Materiales
      </footer>
    </div>
  );
}
