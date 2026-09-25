/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Table columns of the registered-locations panel — same pattern as
 * ProjectTypeConfigPanel/columns.tsx.
 */

import { Pencil, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import type { Column } from "@/components/UI/Table";
import IconActionButton from "@/components/UI/IconActionButton";
import ActiveBadge from "@/components/UI/ActiveBadge";
import { LOCALIZATION_TYPE_LABELS } from "@/constants/localizations";
import type { ConfigLocalization } from "./types";

interface GetLocalizationColumnsArgs {
  togglingId: number | null;
  onEdit: (l: ConfigLocalization) => void;
  onRequestToggle: (id: number) => void;
  onRequestDelete: (id: number) => void;
}

export function getLocalizationColumns({ togglingId, onEdit, onRequestToggle, onRequestDelete }: GetLocalizationColumnsArgs): Column<ConfigLocalization>[] {
  return [
    {
      key: "title",
      label: "Ubicación",
      sortable: true,
      render: (l) => (
        <div>
          <p className="font-bold text-text-primary">{l.title}</p>
          <p className="text-[11px] font-medium text-text-tertiary">{[l.city, l.region].filter(Boolean).join(", ")}</p>
        </div>
      ),
    },
    {
      key: "type",
      label: "Tipo",
      sortable: true,
      render: (l) => <span className="text-xs font-semibold text-text-secondary">{LOCALIZATION_TYPE_LABELS[l.type]}</span>,
    },
    {
      key: "residentName",
      label: "Residente",
      sortable: true,
      render: (l) => <span className="text-xs font-semibold text-text-secondary">{l.residentName ?? "—"}</span>,
    },
    {
      key: "projectsCount",
      label: "Obras",
      align: "right",
      sortable: true,
      render: (l) => <span className="font-mono text-sm text-text-secondary">{l.projectsCount ?? 0}</span>,
    },
    {
      key: "isActive",
      label: "Estado",
      sortable: true,
      render: (l) => <ActiveBadge isActive={l.isActive} />,
    },
    {
      key: "actions",
      label: "Acciones",
      align: "center",
      render: (l) => (
        <div className="flex items-center justify-center gap-1.5">
          <IconActionButton label={`Editar ${l.title}`} tooltip="Editar ubicación" onClick={() => onEdit(l)} tone="sky" icon={<Pencil className="h-3.5 w-3.5" />} />
          <IconActionButton
            label={`${l.isActive ? "Desactivar" : "Activar"} ${l.title}`}
            tooltip={l.isActive ? "Desactivar ubicación" : "Activar ubicación"}
            onClick={() => onRequestToggle(l.id)}
            isBusy={togglingId === l.id}
            tone={l.isActive ? "rose" : "emerald"}
            icon={l.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
          />
          {(l.projectsCount ?? 0) === 0 && (
            <IconActionButton label={`Eliminar ${l.title}`} tooltip="Eliminar (solo sin obras)" onClick={() => onRequestDelete(l.id)} tone="rose" icon={<Trash2 className="h-3.5 w-3.5" />} />
          )}
        </div>
      ),
    },
  ];
}
