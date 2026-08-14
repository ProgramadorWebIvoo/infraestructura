/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Definición de columnas de la tabla de materiales — extraída de
 * MaterialConfigPanel.
 */

import { CheckCircle, Pencil, ToggleLeft, ToggleRight, XCircle } from "lucide-react";
import type { Column } from "../../components/UI/Table";
import IconActionButton from "../../components/UI/IconActionButton";
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
          <IconActionButton
            label={`Editar ${m.name}`}
            tooltip="Editar material"
            onClick={() => onEdit(m)}
            tone="sky"
            icon={<Pencil className="h-3.5 w-3.5" />}
          />
          <IconActionButton
            label={`${m.isActive ? "Desactivar" : "Activar"} ${m.name}`}
            tooltip={m.isActive ? "Desactivar material" : "Activar material"}
            onClick={() => onRequestToggle(m.id)}
            isBusy={togglingId === m.id}
            tone={m.isActive ? "rose" : "emerald"}
            icon={m.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
          />
        </div>
      ),
    },
  ];
}
