/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Definición de columnas de la tabla de proveedores — extraída de
 * ProveedoresConfigPanel.
 */

import { CheckCircle, Eye, Loader2, Pencil, ToggleLeft, ToggleRight, XCircle } from "lucide-react";
import type { Column } from "../../components/UI/Table";
import IconActionButton from "../../components/UI/IconActionButton";
import { SEMANTIC_COLOR_MAP } from "../../components/UI/colorTokens";
import { STATUS_BADGE, type ConfigContractor } from "./types";

interface GetContractorColumnsArgs {
  togglingCode: string | null;
  onEdit: (c: ConfigContractor) => void;
  onRequestToggle: (code: string) => void;
  onViewDetail: (c: ConfigContractor) => void;
}

/**
 * Columnas "first-hand" — lo necesario para escanear/filtrar la lista de un
 * vistazo (Nombre, Especialidad, Rating, Estado). Código, Email, Teléfono y
 * Origen se mueven a `ContractorDetailModal` (drill-down) para que la tabla
 * no aprieta columnas hasta cortar contenido (ej. el Código quedaba truncado
 * con 8 columnas + Acciones).
 */
export function getContractorColumns({ togglingCode, onEdit, onRequestToggle, onViewDetail }: GetContractorColumnsArgs): Column<ConfigContractor>[] {
  return [
    {
      key: "name",
      label: "Nombre",
      sortable: true,
      render: (c) => <span className="font-bold text-text-primary">{c.name}</span>,
    },
    {
      key: "specialty",
      label: "Especialidad",
      sortable: true,
      render: (c) => (
        <span className="rounded-control bg-surface-sunken px-2.5 py-1 font-semibold text-text-secondary">
          {c.specialty}
        </span>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      align: "center",
      sortable: true,
      render: (c) => (
        <span className={`font-mono text-sm font-black ${SEMANTIC_COLOR_MAP.warning.text600}`}>{c.rating.toFixed(1)}</span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      sortable: true,
      render: (c) => {
        const s = STATUS_BADGE[c.status] ?? STATUS_BADGE.PENDING_REVIEW;
        const semantic = SEMANTIC_COLOR_MAP[s.role];
        return (
          <span className={`inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-[10px] font-bold ${semantic.border100} ${semantic.bg50} ${semantic.text700}`}>
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
            label={`Ver detalle de ${c.name}`}
            tooltip="Ver detalle"
            onClick={() => onViewDetail(c)}
            tone="slate"
            icon={<Eye className="h-3.5 w-3.5" />}
          />
          <IconActionButton
            label={`Editar ${c.name}`}
            tooltip="Editar proveedor"
            onClick={() => onEdit(c)}
            tone="indigo"
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
