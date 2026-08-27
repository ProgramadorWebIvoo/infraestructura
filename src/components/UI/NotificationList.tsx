/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido compartido entre el dropdown flotante (desktop) y el bottom sheet
 * (mobile) de NotificationBell — header con "Marcar todas" + lista de
 * notificaciones. Sin wrapper de posicionamiento propio: cada shell decide
 * cómo encuadrarlo (dropdown flotante vs. sheet a pantalla completa).
 */

import { AnimatePresence, motion } from "motion/react";
import { Check, CheckCheck, Trash2, X } from "lucide-react";
import type { AppNotification } from "../../types";
import { ALERT_ICONS, BACKEND_NOTIFICATION_TYPE_MAP } from "./alertStyles";

const TYPE_ICON_CLASS: Record<string, string> = {
  success: "text-emerald-500",
  error: "text-rose-500",
  warning: "text-amber-500",
  info: "text-sky-500",
  "action-required": "text-violet-500",
  urgent: "text-orange-500",
};

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
  onDelete: (id: number) => void;
  onDeleteAll: () => void;
  /** Clase para el contenedor scrolleable de la lista — cada shell define su propia altura máxima. */
  listClassName?: string;
}

export default function NotificationList({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onDeleteAll,
  // .light-scrollbar: thumb delgado (6px) con track transparente en vez de
  // la barra nativa del SO — evita el salto de ancho al aparecer/desaparecer
  // overflow (igual razón que antes con scrollbar-gutter:stable) sin dejar
  // la franja en blanco que ese gutter reservaba junto a filas con fondo
  // tintado (no leídas).
  listClassName = "max-h-96 overflow-y-auto light-scrollbar",
}: NotificationListProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 shrink-0">
        <span className="text-sm font-bold text-slate-700 shrink-0">Notificaciones</span>
        <div className="flex items-center gap-3">
          <AnimatePresence initial={false}>
            {unreadCount > 0 && (
              <motion.button
                key="mark-all"
                layout
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8, transition: { duration: 0.12 } }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                onClick={onMarkAllRead}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </motion.button>
            )}
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {notifications.length > 0 && (
              <motion.button
                key="delete-all"
                layout
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8, transition: { duration: 0.12 } }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                onClick={onDeleteAll}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                aria-label="Vaciar todas las notificaciones"
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Vaciar todas
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className={listClassName}>
        <AnimatePresence>
          {notifications.length === 0 && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.3 } }}
              exit={{ opacity: 0 }}
              className="px-4 py-8 text-center text-sm text-slate-400"
            >
              Sin notificaciones
            </motion.p>
          )}
        </AnimatePresence>
        <AnimatePresence initial={false} mode="popLayout">
          {notifications.map((n, index) => {
            const alertType = BACKEND_NOTIFICATION_TYPE_MAP[n.type] ?? "info";
            const TypeIcon = ALERT_ICONS[alertType];
            return (
              <motion.div
                key={n.id}
                layout
                custom={index}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
                exit={{
                  opacity: 0,
                  height: 0,
                  marginTop: 0,
                  marginBottom: 0,
                  transition: {
                    // Stagger de salida en cascada al vaciar todas: cada fila
                    // se retrasa un poco según su posición, en vez de que las
                    // N filas desaparezcan exactamente al mismo tiempo — se
                    // percibe como una animación intencional, no un flash.
                    opacity: { duration: 0.15, delay: index * 0.035 },
                    height: { duration: 0.22, delay: index * 0.035 + 0.05, ease: "easeIn" },
                  },
                }}
                transition={{ layout: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }}
                className="overflow-hidden"
              >
                {/* La transición de color (leída/no leída) vive en su propio
                    elemento con `transition-colors` de CSS, no en el
                    `motion.div` que también anima `layout`/exit — mezclar
                    animate={{ backgroundColor }} con layout en el mismo nodo
                    hacía que Framer recalculara ambos a la vez y se viera
                    con saltos/tirones. */}
                <div
                  className={`group/item relative flex items-start gap-2 px-4 py-3 border-b border-slate-50 last:border-0 transition-colors duration-500 ${
                    n.read_at ? "bg-white" : "bg-sky-50/60"
                  }`}
                >
                  {/* Halo de confirmación: un flash sutil que barre el fondo
                      cuando la notificación pasa a leída — se dispara una
                      sola vez (key cambia de unread→read) gracias a
                      AnimatePresence + key condicional, en vez de reusar
                      animate (que repetiría el flash en cada re-render). */}
                  <AnimatePresence>
                    {n.read_at && (
                      <motion.div
                        key="read-flash"
                        initial={{ opacity: 0.35 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="absolute inset-0 bg-emerald-200 pointer-events-none"
                      />
                    )}
                  </AnimatePresence>

                  <div className="relative mt-0.5 shrink-0">
                    <TypeIcon className={`h-3.5 w-3.5 ${TYPE_ICON_CLASS[alertType]}`} aria-hidden="true" />
                    {/* Punto de "no leída" — hace pop-out (scale a 0 con un
                        leve overshoot) al marcar como leída, en vez de
                        simplemente desaparecer con el resto del layout. */}
                    <AnimatePresence>
                      {!n.read_at && (
                        <motion.span
                          key="unread-dot"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0, transition: { duration: 0.2, ease: "backIn" } }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                          className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-sky-500"
                        />
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative flex-1 min-w-0">
                    {n.project_title_snapshot && (
                      <p className="text-xs font-bold text-slate-700 truncate">{n.project_title_snapshot}</p>
                    )}
                    <p className="text-xs text-slate-600 leading-snug">{n.action}</p>
                    {n.details && <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{n.details}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>

                  <div className="relative flex items-center gap-0.5 shrink-0">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {!n.read_at && (
                        <motion.button
                          key="mark-read"
                          layout
                          initial={{ opacity: 0, scale: 0.4, rotate: -45 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.15 } }}
                          transition={{ type: "spring", stiffness: 500, damping: 22 }}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => onMarkRead(n.id)}
                          aria-label="Marcar como leída"
                          className="p-1 text-slate-300 hover:text-sky-600 cursor-pointer"
                        >
                          <Check className="h-4 w-4" />
                        </motion.button>
                      )}
                    </AnimatePresence>
                    <motion.button
                      layout
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => onDelete(n.id)}
                      aria-label="Eliminar notificación"
                      className="p-1 text-slate-300 opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 hover:text-rose-500 cursor-pointer transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}
