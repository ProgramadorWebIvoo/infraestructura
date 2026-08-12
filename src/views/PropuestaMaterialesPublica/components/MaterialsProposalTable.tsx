/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tabla de materiales del proyecto + materiales adicionales del proveedor —
 * extraída de PropuestaMaterialesPublica.
 */

import { Plus, Trash2 } from "lucide-react";
import NumericInput from "../../../components/UI/NumericInput";
import { sanitize, type ItemRow } from "../types";

interface MaterialsProposalTableProps {
  items: ItemRow[];
  onUpdateItem: (index: number, field: keyof ItemRow, value: string | number) => void;
  onAddCustomItem: () => void;
  onRemoveItem: (index: number) => void;
}

export default function MaterialsProposalTable({ items, onUpdateItem, onAddCustomItem, onRemoveItem }: MaterialsProposalTableProps) {
  const grandTotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
  const projectItems = items.filter((i) => !i.isCustom);
  const customItems = items.filter((i) => i.isCustom);

  return (
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
                    <NumericInput
                      value={item.unitPrice === 0 ? "" : item.unitPrice}
                      onChange={(v) => onUpdateItem(index, "unitPrice", v)}
                      placeholder="0.00"
                      className="!w-28 !px-2.5 !py-1.5 !text-right !text-sm"
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
                      onChange={(e) => onUpdateItem(index, "notes", sanitize(e.target.value))}
                      placeholder="Marca, plazo entrega..."
                      maxLength={500}
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
                    onClick={onAddCustomItem}
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
                        onChange={(e) => onUpdateItem(index, "materialName", sanitize(e.target.value))}
                        placeholder="Nombre del material *"
                        maxLength={220}
                        className="w-full min-w-[140px] rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <NumericInput
                        value={item.quantity === 0 ? "" : item.quantity}
                        onChange={(v) => onUpdateItem(index, "quantity", v)}
                        placeholder="0"
                        className="!w-16 !px-2 !py-1.5 !text-center"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => onUpdateItem(index, "unit", sanitize(e.target.value))}
                        placeholder="Und."
                        maxLength={60}
                        className="w-20 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <NumericInput
                        value={item.unitPrice === 0 ? "" : item.unitPrice}
                        onChange={(v) => onUpdateItem(index, "unitPrice", v)}
                        placeholder="0.00"
                        className="!w-28 !px-2.5 !py-1.5 !text-right !text-sm"
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
                        onChange={(e) => onUpdateItem(index, "notes", sanitize(e.target.value))}
                        placeholder="Notas..."
                        maxLength={500}
                        className="w-40 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(index)}
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
  );
}
