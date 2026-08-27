/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tabla de materiales del proyecto + materiales adicionales del proveedor —
 * extraída de PropuestaMaterialesPublica.
 */

import { useEffect, useRef } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { Plus, Trash2 } from "lucide-react";
import NumericInput from "../../../components/UI/NumericInput";
import { itemVariants, springs } from "../../../animations";
import { sanitize, type ItemRow } from "../types";

interface MaterialsProposalTableProps {
  items: ItemRow[];
  onUpdateItem: (index: number, field: keyof ItemRow, value: string | number) => void;
  onAddCustomItem: () => void;
  onRemoveItem: (index: number) => void;
}

function AnimatedTotal({ value }: { value: number }) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (v) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  const previousValue = useRef(value);

  useEffect(() => {
    if (previousValue.current === value) return;
    const controls = animate(motionValue, value, { duration: 0.4, ease: [0.16, 1, 0.3, 1] });
    previousValue.current = value;
    return () => controls.stop();
  }, [value, motionValue]);

  return <motion.span>{rounded}</motion.span>;
}

export default function MaterialsProposalTable({ items, onUpdateItem, onAddCustomItem, onRemoveItem }: MaterialsProposalTableProps) {
  const grandTotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
  const projectItems = items.filter((i) => !i.isCustom);
  const customItems = items.filter((i) => i.isCustom);

  return (
    <motion.div
      variants={itemVariants}
      className="overflow-hidden rounded-2xl border border-white/10 bg-white text-slate-900 shadow-xl shadow-slate-950/30"
    >
      {/* Section: project materials */}
      <div className="border-b border-slate-100 p-5">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Materiales requeridos por el proyecto</h3>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Ingrese el precio unitario que puede ofrecer para cada ítem. Puede dejar en 0 los que no provee.
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
            {projectItems.map((item, i) => {
              const index = items.indexOf(item);
              return (
                <motion.tr
                  key={item._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.025, 0.3), ease: "easeOut" }}
                  className="transition-colors hover:bg-slate-50/60"
                >
                  <td className="min-w-[160px] px-4 py-3 font-semibold text-slate-800">{item.materialName}</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-slate-600">{item.quantity}</td>
                  <td className="px-4 py-3 font-medium text-slate-500">{item.unit}</td>
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
                      className="w-40 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-hidden transition-shadow duration-150 focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
                    />
                  </td>
                  <td className="px-4 py-3" />
                </motion.tr>
              );
            })}

            {/* Divider + heading for supplier-added materials */}
            <tr>
              <td colSpan={7} className="border-y border-amber-100 bg-amber-50 px-4 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                    Materiales adicionales — agregados por el proveedor
                  </span>
                  <motion.button
                    type="button"
                    onClick={onAddCustomItem}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.94 }}
                    transition={springs.snappy}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-500 px-2.5 py-1 text-[10px] font-black text-white transition-colors hover:bg-amber-600"
                  >
                    <Plus className="h-3 w-3" />
                    Agregar material
                  </motion.button>
                </div>
              </td>
            </tr>

            {/* Supplier-added rows (all fields editable) */}
            <AnimatePresence initial={false}>
              {customItems.length === 0 ? (
                <motion.tr key="empty-custom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={7} className="bg-amber-50/40 px-4 py-4 text-center text-xs italic text-slate-400">
                    Haga clic en "Agregar material" para incluir ítems adicionales que pueda proveer.
                  </td>
                </motion.tr>
              ) : (
                customItems.map((item) => {
                  const index = items.indexOf(item);
                  return (
                    <motion.tr
                      key={item._id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="bg-amber-50/40 transition-colors hover:bg-amber-50/70"
                    >
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={item.materialName}
                          onChange={(e) => onUpdateItem(index, "materialName", sanitize(e.target.value))}
                          placeholder="Nombre del material *"
                          maxLength={220}
                          className="w-full min-w-[140px] rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-hidden transition-shadow duration-150 focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
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
                          className="w-20 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-hidden transition-shadow duration-150 focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
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
                          className="w-40 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-hidden transition-shadow duration-150 focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <motion.button
                          type="button"
                          onClick={() => onRemoveItem(index)}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.85 }}
                          className="cursor-pointer rounded-lg p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                          aria-label="Eliminar fila"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </motion.button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td colSpan={4} className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-600">
                Total estimado propuesta:
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm font-black text-sky-700">
                <AnimatedTotal value={grandTotal} />
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </motion.div>
  );
}
