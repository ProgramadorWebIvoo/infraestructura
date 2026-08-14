/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Definición de columnas de la tabla de proveedores — extraída de
 * ProveedoresConfigPanel.
 */

import { CheckCircle, Loader2, Pencil, ToggleLeft, ToggleRight, XCircle } from "lucide-react";
import type { Column } from "../../components/UI/Table";
import IconActionButton from "../../components/UI/IconActionButton";
import { SOURCE_BADGE, STATUS_BADGE, type ConfigContractor } from "./types";

interface GetContractorColumnsArgs {
  togglingCode: string | null;
  onEdit: (c: ConfigContractor) => void;
  onRequestToggle: (code: string) => void;
}

export function getContractorColumns({ togglingCode, onEdit, onRequestToggle }: GetContractorColumnsArgs): Column<ConfigContractor>[] {
  return [
    {
      key: "code",
      label: "Código",
      render: (c) => (
        <span className="rounded-lg border border-sky-100 bg-sky-50/80 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-600">
          {c.code}
        </span>
      ),
    },
    {
      key: "name",
      label: "Nombre",
      sortable: true,
      render: (c) => <span className="font-bold text-slate-800">{c.name}</span>,
    },
    {
      key: "specialty",
      label: "Especialidad",
      sortable: true,
      render: (c) => (
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
          {c.specialty}
        </span>
      ),
    },
    {
      key: "contact",
      label: "Contacto",
      render: (c) => (
        <span className="font-mono text-xs font-semibold text-slate-500">{c.contact}</span>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      align: "center",
      sortable: true,
      render: (c) => (
        <span className="font-mono text-sm font-black text-amber-600">{c.rating.toFixed(1)}</span>
      ),
    },
    {
      key: "registrationSource",
      label: "Origen",
      render: (c) => {
        const s = SOURCE_BADGE[c.registrationSource] ?? SOURCE_BADGE.INTERNAL;
        return (
          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${s.class}`}>
            {s.label}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Estado",
      sortable: true,
      render: (c) => {
        const s = STATUS_BADGE[c.status] ?? STATUS_BADGE.PENDING_REVIEW;
        return (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${s.class}`}>
            {c.status === "ACTIVE" ? (
              <CheckCircle className="h-3 w-3" />
            ) : c.status === "INACTIVE" ? (
              <XCircle className="h-3 w-3" />
            ) : (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {s.label}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Acciones",
      align: "center",
      render: (c) => (
        <div className="flex items-center justify-center gap-1.5">
          <IconActionButton
            label={`Editar ${c.name}`}
            tooltip="Editar proveedor"
            onClick={() => onEdit(c)}
            tone="sky"
            icon={<Pencil className="h-3.5 w-3.5" />}
          />
          <IconActionButton
            label={`Cambiar estado de ${c.name}`}
            tooltip={
              c.status === "ACTIVE"
                ? "Desactivar proveedor"
                : c.status === "INACTIVE"
                  ? "Activar proveedor"
                  : "Aprobar proveedor"
            }
            onClick={() => onRequestToggle(c.code)}
            isBusy={togglingCode === c.code}
            tone={c.status === "ACTIVE" ? "rose" : c.status === "INACTIVE" ? "emerald" : "amber"}
            icon={c.status === "ACTIVE" ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
          />
        </div>
      ),
    },
  ];
}
