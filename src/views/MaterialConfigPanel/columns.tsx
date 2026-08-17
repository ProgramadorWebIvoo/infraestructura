/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Definición de columnas de la tabla de materiales — extraída de
 * MaterialConfigPanel.
 */

import { Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import type { Column } from "../../components/UI/Table";
import IconActionButton from "../../components/UI/IconActionButton";
import ActiveBadge from "../../components/UI/ActiveBadge";
import { SEMANTIC_COLOR_MAP } from "../../components/UI/colorTokens";
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
        <span className="rounded-control border border-border-default bg-surface-sunken/80 px-2 py-0.5 font-mono text-[10px] font-bold text-text-secondary">
          #{m.id}
        </span>
      ),
    },
    {
      key: "name",
      label: "Nombre",
      sortable: true,
      render: (m) => <span className="font-bold text-text-primary">{m.name}</span>,
    },
    {
      key: "unit",
      label: "Unidad",
      sortable: true,
      render: (m) => (
        <span className="rounded-control bg-surface-sunken px-2.5 py-1 font-semibold text-text-secondary">
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
        <span className={`font-mono text-sm font-black ${SEMANTIC_COLOR_MAP.success.text600}`}>
          ${m.estimatedUnitPrice.toFixed(2)}
        </span>
      ),
    },
    {
      key: "isActive",
      label: "Estado",
      sortable: true,
      render: (m) => <ActiveBadge isActive={m.isActive} />,
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
