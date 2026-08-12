/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido compartido entre el dropdown flotante (desktop) y el bottom sheet
 * (mobile) de NotificationBell — header con "Marcar todas" + lista de
 * notificaciones. Sin wrapper de posicionamiento propio: cada shell decide
 * cómo encuadrarlo (dropdown flotante vs. sheet a pantalla completa).
 */

import { Check, CheckCheck } from "lucide-react";
import type { AppNotification } from "../../types";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

interface NotificationListProps {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  /** Clase para el contenedor scrolleable de la lista — cada shell define su propia altura máxima. */
  listClassName?: string;
}

export default function NotificationList({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  listClassName = "max-h-96 overflow-y-auto",
}: NotificationListProps) {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
        <span className="text-sm font-bold text-slate-700">Notificaciones</span>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas
          </button>
        )}
      </div>

      <div className={listClassName}>
        {notifications.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Sin notificaciones</p>
        )}
        {notifications.map(n => (
          <div
            key={n.id}
            className={`flex items-start gap-2 px-4 py-3 border-b border-slate-50 last:border-0 ${
              n.read_at ? "bg-white" : "bg-sky-50/50"
            }`}
          >
            <div className="flex-1 min-w-0">
              {n.project_title_snapshot && (
                <p className="text-xs font-bold text-slate-700 truncate">{n.project_title_snapshot}</p>
              )}
              <p className="text-xs text-slate-600 leading-snug">{n.action}</p>
              {n.details && <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{n.details}</p>}
              <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
            </div>
            {!n.read_at && (
              <button
                onClick={() => onMarkRead(n.id)}
                aria-label="Marcar como leída"
                className="p-1 text-slate-300 hover:text-sky-600 shrink-0 cursor-pointer"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
