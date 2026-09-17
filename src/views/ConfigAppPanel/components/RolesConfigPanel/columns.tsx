/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Definición de columnas de la tabla de roles — mismo patrón que
 * ProjectTypeConfigPanel/columns.tsx.
 */

import { Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import type { Column } from "@/components/UI/Table";
import IconActionButton from "@/components/UI/IconActionButton";
import ActiveBadge from "@/components/UI/ActiveBadge";
import type { ConfigRole } from "./types";

interface GetRoleColumnsArgs {
  togglingId: number | null;
  onEdit: (r: ConfigRole) => void;
  onRequestToggle: (id: number) => void;
}

export function getRoleColumns({ togglingId, onEdit, onRequestToggle }: GetRoleColumnsArgs): Column<ConfigRole>[] {
  return [
    {
      key: "key",
      label: "Clave",
      sortable: true,
      render: (r) => (
        <span className="rounded-control border border-border-default bg-surface-sunken/80 px-2 py-0.5 font-mono text-[10px] font-bold text-text-secondary">
          {r.key}
        </span>
      ),
    },
    {
      key: "label",
      label: "Etiqueta",
      sortable: true,
      render: (r) => <span className="font-bold text-text-primary">{r.label}</span>,
    },
    {
      key: "sortOrder",
      label: "Orden",
      align: "right",
      sortable: true,
      render: (r) => <span className="font-mono text-sm text-text-secondary">{r.sortOrder}</span>,
    },
    {
      key: "isActive",
      label: "Estado",
      sortable: true,
      render: (r) => <ActiveBadge isActive={r.isActive} />,
    },
    {
      key: "actions",
      label: "Acciones",
      align: "center",
      render: (r) => (
        <div className="flex items-center justify-center gap-1.5">
          <IconActionButton
            label={`Editar ${r.label}`}
            tooltip="Editar rol"
            onClick={() => onEdit(r)}
            tone="sky"
            icon={<Pencil className="h-3.5 w-3.5" />}
          />
          <IconActionButton
            label={`${r.isActive ? "Desactivar" : "Activar"} ${r.label}`}
            tooltip={r.isActive ? "Desactivar rol" : "Activar rol"}
            onClick={() => onRequestToggle(r.id)}
            isBusy={togglingId === r.id}
            tone={r.isActive ? "rose" : "emerald"}
            icon={r.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
          />
        </div>
      ),
    },
  ];
}
