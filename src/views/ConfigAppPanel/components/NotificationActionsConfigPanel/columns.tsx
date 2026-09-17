/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Definición de columnas de la tabla de acciones notificables — mismo
 * patrón que RolesConfigPanel/columns.tsx.
 */

import { Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import type { Column } from "@/components/UI/Table";
import IconActionButton from "@/components/UI/IconActionButton";
import ActiveBadge from "@/components/UI/ActiveBadge";
import type { ConfigNotificationAction } from "./types";

interface GetNotificationActionColumnsArgs {
  togglingId: number | null;
  onEdit: (a: ConfigNotificationAction) => void;
  onRequestToggle: (id: number) => void;
}

export function getNotificationActionColumns({ togglingId, onEdit, onRequestToggle }: GetNotificationActionColumnsArgs): Column<ConfigNotificationAction>[] {
  return [
    {
      key: "key",
      label: "Acción",
      sortable: true,
      render: (a) => (
        <div className="min-w-0">
          <span className="block font-bold text-text-primary truncate">{a.label ?? a.key}</span>
          <span className="block font-mono text-[10px] text-text-tertiary truncate">{a.key}</span>
        </div>
      ),
    },
    {
      key: "group",
      label: "Grupo",
      sortable: true,
      render: (a) => (
        <span className="rounded-control bg-surface-sunken px-2.5 py-1 text-xs font-semibold text-text-secondary">
          {a.group}
        </span>
      ),
    },
    {
      key: "scope",
      label: "Alcance",
      sortable: true,
      render: (a) => <span className="text-xs text-text-secondary">{a.scope === "project" ? "De proyecto" : "Global"}</span>,
    },
    {
      key: "critical",
      label: "Crítica",
      align: "center",
      sortable: true,
      render: (a) => (
        <span className={`text-xs font-bold ${a.critical ? "text-danger-600" : "text-text-tertiary"}`}>
          {a.critical ? "Sí" : "No"}
        </span>
      ),
    },
    {
      key: "isActive",
      label: "Estado",
      sortable: true,
      render: (a) => <ActiveBadge isActive={a.isActive} />,
    },
    {
      key: "actions",
      label: "Acciones",
      align: "center",
      render: (a) => (
        <div className="flex items-center justify-center gap-1.5">
          <IconActionButton
            label={`Editar ${a.label ?? a.key}`}
            tooltip="Editar acción"
            onClick={() => onEdit(a)}
            tone="sky"
            icon={<Pencil className="h-3.5 w-3.5" />}
          />
          <IconActionButton
            label={`${a.isActive ? "Desactivar" : "Activar"} ${a.label ?? a.key}`}
            tooltip={a.isActive ? "Desactivar acción" : "Activar acción"}
            onClick={() => onRequestToggle(a.id)}
            isBusy={togglingId === a.id}
            tone={a.isActive ? "rose" : "emerald"}
            icon={a.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
          />
        </div>
      ),
    },
  ];
}
