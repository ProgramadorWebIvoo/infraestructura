/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tabla de materiales ya agregados a la petición, con acciones de editar
 * detalles/eliminar — extraída de MaterialAdderSection.tsx (división por SRP).
 *
 * Materiales cuyas características (condición, garantía, etc.) nunca se
 * revisaron en el modal de edición muestran un indicador sutil (punto ámbar
 * + acento en el botón de editar) — no bloquea el avance del wizard, solo
 * hace notorio que existe un paso opcional-pero-recomendado sin completar.
 */

import { Pencil, Trash2 } from "lucide-react";
import type { MaterialItem } from "../../../types";
import { Table } from "../../../components/UI/Table";
import { formatCurrency } from "../../../utils";

interface AddedMaterialsTableProps {
  materials: Omit<MaterialItem, "id">[];
  onRemove: (index: number) => void;
  onEditRequest: (index: number) => void;
  reviewedIndexes: Set<number>;
  subtotal: number;
}

export default function AddedMaterialsTable({ materials, onRemove, onEditRequest, reviewedIndexes, subtotal }: AddedMaterialsTableProps) {
  return (
    <div className="mt-5 border border-slate-100 rounded-xl overflow-hidden shadow-xs bg-white">
      <Table
        columns={[
          {
            key: "name",
            label: "Material / Servicio",
            render: (m, index) => (
              <span className="inline-flex items-center gap-1.5">
                {!reviewedIndexes.has(index) && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
                    title="Características sin revisar (condición, garantía, etc.)"
                  />
                )}
                <span className="text-slate-800 font-bold">{m.name}</span>
              </span>
            ),
          },
          { key: "quantity", label: "Cantidad", align: "center", render: (m) => <span className="text-slate-600 font-medium">{m.quantity} {m.unit}</span> },
          { key: "estimatedUnitPrice", label: "Precio Unit. (Est)", align: "right", render: (m) => <span className="font-mono text-slate-500 font-semibold">{formatCurrency(m.estimatedUnitPrice)}</span> },
          { key: "total", label: "Total (Est)", align: "right", render: (m) => <span className="font-mono font-bold text-slate-900">{formatCurrency(m.quantity * m.estimatedUnitPrice)}</span> },
          {
            key: "actions",
            label: "Acciones",
            align: "center",
            render: (_m, index) => (
              <div className="flex items-center justify-center gap-1">
                <button
                  id={`btn-edit-mat-${index}`}
                  type="button"
                  onClick={() => onEditRequest(index)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    reviewedIndexes.has(index)
                      ? "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                      : "text-amber-500 hover:text-amber-600 hover:bg-amber-50 ring-1 ring-amber-200"
                  }`}
                  title="Editar detalles"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  id={`btn-remove-mat-${index}`}
                  type="button"
                  onClick={() => onRemove(index)}
                  className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
        data={materials}
        rowKey={(_m, index) => index}
        rowHoverClass="hover:bg-emerald-50/40 transition-colors"
        emptyMessage="No se han agregado materiales. Agregue elementos arriba."
        pageSize={5}
        footer={materials.length > 0 ? (
          <tr>
            <td colSpan={3} className="py-3.5 px-4 text-right text-slate-500 uppercase tracking-wider text-[9px] font-bold">Costo Estimado Materiales:</td>
            <td className="py-3.5 px-4 text-right font-mono text-emerald-700 text-sm font-black">{formatCurrency(subtotal)}</td>
            <td />
          </tr>
        ) : undefined}
      />
    </div>
  );
}
