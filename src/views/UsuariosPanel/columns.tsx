/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Definición de columnas de la tabla de usuarios — sigue el patrón de
 * ProveedoresConfigPanel/columns.tsx.
 */

import { Pencil, RotateCcw, Send, UserX } from "lucide-react";
import type { Column } from "../../components/UI/Table";
import IconActionButton from "../../components/UI/IconActionButton";
import StatusBadge from "../../components/UI/StatusBadge";
import { SEMANTIC_COLOR_MAP } from "../../components/UI/colorTokens";
import { getUserInitials } from "../../utils";
import type { UserRecord } from "../../hooks/useUsuarios";

interface GetUserColumnsArgs {
  roleLabel: (value: string) => string;
  togglingId: number | string | null;
  sendingId: number | string | null;
  onEdit: (user: UserRecord) => void;
  onToggleStatus: (user: UserRecord) => void;
  onSendReset: (user: UserRecord) => void;
}

export function getUserColumns({
  roleLabel,
  togglingId,
  sendingId,
  onEdit,
  onToggleStatus,
  onSendReset,
}: GetUserColumnsArgs): Column<UserRecord>[] {
  return [
    {
      key: "name",
      label: "Usuario",
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-[11px] font-black text-white shadow-xs ring-1 ring-white/10">
            {getUserInitials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary truncate">{user.name}</p>
            <p className="text-[11px] text-text-muted font-medium font-mono truncate">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Rol",
      sortable: true,
      render: (user) => <StatusBadge code={user.role} label={roleLabel(user.role)} isRole />,
    },
    {
      key: "status",
      label: "Estado",
      align: "center",
      sortable: true,
      render: (user) => {
        const isInactive = user.status === "Inactive";
        const semantic = isInactive ? SEMANTIC_COLOR_MAP.neutral : SEMANTIC_COLOR_MAP.success;
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono border ${semantic.bg50} ${semantic.text700} ${semantic.border100}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isInactive ? "bg-neutral-400" : "bg-success-500"}`} />
            {isInactive ? "Inactivo" : "Activo"}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Acciones",
      align: "center",
      render: (user) => {
        const isInactive = user.status === "Inactive";
        return (
          <div className="flex items-center justify-center gap-1.5">
            <IconActionButton
              label={`Editar ${user.name}`}
              tooltip="Editar usuario"
              onClick={() => onEdit(user)}
              tone="sky"
              icon={<Pencil className="h-3.5 w-3.5" />}
            />
            <IconActionButton
              label={isInactive ? `Activar ${user.name}` : `Desactivar ${user.name}`}
              tooltip={isInactive ? "Activar usuario" : "Desactivar usuario"}
              onClick={() => onToggleStatus(user)}
              isBusy={togglingId === user.id}
              tone="amber"
              icon={isInactive ? <RotateCcw className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
            />
            <IconActionButton
              label={`Enviar restablecimiento de contraseña a ${user.name}`}
              tooltip="Enviar link de restablecimiento de contraseña"
              onClick={() => onSendReset(user)}
              disabled={isInactive}
              isBusy={sendingId === user.id}
              tone="indigo"
              icon={<Send className="h-3.5 w-3.5" />}
            />
          </div>
        );
      },
    },
  ];
}
