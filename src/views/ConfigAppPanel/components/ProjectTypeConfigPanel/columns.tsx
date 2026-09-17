/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Definición de columnas de la tabla de tipos de proyecto — extraída de
 * ProjectTypeConfigPanel, mismo patrón que MaterialConfigPanel/columns.tsx.
 */

import { Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import type { Column } from "@/components/UI/Table";
import IconActionButton from "@/components/UI/IconActionButton";
import ActiveBadge from "@/components/UI/ActiveBadge";
import type { ConfigProjectType } from "./types";

interface GetProjectTypeColumnsArgs {
  togglingId: number | null;
  onEdit: (t: ConfigProjectType) => void;
  onRequestToggle: (id: number) => void;
}

export function getProjectTypeColumns({ togglingId, onEdit, onRequestToggle }: GetProjectTypeColumnsArgs): Column<ConfigProjectType>[] {
  return [
    {
      key: "key",
      label: "Clave",
      sortable: true,
      render: (t) => (
        <span className="rounded-control border border-border-default bg-surface-sunken/80 px-2 py-0.5 font-mono text-[10px] font-bold text-text-secondary">
          {t.key}
        </span>
      ),
    },
    {
      key: "label",
      label: "Etiqueta",
      sortable: true,
      render: (t) => <span className="font-bold text-text-primary">{t.label}</span>,
    },
    {
      key: "sortOrder",
      label: "Orden",
      align: "right",
      sortable: true,
      render: (t) => <span className="font-mono text-sm text-text-secondary">{t.sortOrder}</span>,
    },
    {
      key: "isActive",
      label: "Estado",
      sortable: true,
      render: (t) => <ActiveBadge isActive={t.isActive} />,
    },
    {
      key: "actions",
      label: "Acciones",
      align: "center",
      render: (t) => (
        <div className="flex items-center justify-center gap-1.5">
          <IconActionButton
            label={`Editar ${t.label}`}
            tooltip="Editar tipo de proyecto"
            onClick={() => onEdit(t)}
            tone="sky"
            icon={<Pencil className="h-3.5 w-3.5" />}
          />
          <IconActionButton
            label={`${t.isActive ? "Desactivar" : "Activar"} ${t.label}`}
            tooltip={t.isActive ? "Desactivar tipo" : "Activar tipo"}
            onClick={() => onRequestToggle(t.id)}
            isBusy={togglingId === t.id}
            tone={t.isActive ? "rose" : "emerald"}
            icon={t.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
          />
        </div>
      ),
    },
  ];
}
