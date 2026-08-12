/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Definición de columnas de la tabla de materiales — extraída de
 * MaterialConfigPanel.
 */

import { CheckCircle, Loader2, Pencil, ToggleLeft, ToggleRight, XCircle } from "lucide-react";
import type { Column } from "../../components/UI/Table";
import type { ConfigMaterial } from "./types";

interface GetMaterialColumnsArgs {
  togglingId: number | null;
  onEdit: (m: ConfigMaterial) => void;
  onRequestToggle: (id: number) => void;
}

export function getMaterialColumns({ togglingId, onEdit, onRequestToggle }: GetMaterialColumnsArgs): Column<ConfigMaterial>[] {
  return [
    {
      key: "id",
      label: "ID",
      width: "5rem",
      render: (m) => (
        <span className="rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500">
          #{m.id}
        </span>
      ),
    },
    {
      key: "name",
      label: "Nombre",
      sortable: true,
      render: (m) => <span className="font-bold text-slate-800">{m.name}</span>,
    },
    {
      key: "unit",
      label: "Unidad",
      sortable: true,
      render: (m) => (
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
          {m.unit}
        </span>
      ),
    },
    {
      key: "estimatedUnitPrice",
      label: "Precio est.",
      align: "right",
      sortable: true,
      render: (m) => (
        <span className="font-mono text-sm font-black text-emerald-600">
          ${m.estimatedUnitPrice.toFixed(2)}
        </span>
      ),
    },
    {
      key: "isActive",
      label: "Estado",
      sortable: true,
      render: (m) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
            m.isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-100 text-slate-500"
          }`}
        >
          {m.isActive ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          {m.isActive ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      align: "center",
      render: (m) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => onEdit(m)}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition-all duration-200 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 hover:shadow-md"
            aria-label={`Editar ${m.name}`}
            title="Editar material"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onRequestToggle(m.id)}
            disabled={togglingId === m.id}
            className={`cursor-pointer rounded-lg border p-1.5 transition-all duration-200 hover:shadow-md ${
              m.isActive
                ? "border-red-200 bg-white text-red-400 hover:bg-red-50 hover:text-red-600"
                : "border-emerald-200 bg-white text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
            } disabled:cursor-not-allowed disabled:opacity-50`}
            aria-label={`${m.isActive ? "Desactivar" : "Activar"} ${m.name}`}
            title={m.isActive ? "Desactivar material" : "Activar material"}
          >
            {togglingId === m.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : m.isActive ? (
              <ToggleRight className="h-3.5 w-3.5" />
            ) : (
              <ToggleLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      ),
    },
  ];
}
