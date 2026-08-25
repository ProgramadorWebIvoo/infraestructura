/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bandeja de alertas internas persistentes (Fase 1.2 del plan de 90 días).
 * Campana con contador de no leídas. En desktop (lg+) despliega un dropdown
 * flotante junto al botón; en mobile despliega un bottom sheet a pantalla
 * completa — un dropdown flotante dentro del drawer del sidebar mobile queda
 * recortado/mal posicionado (no hay espacio ni contexto de apilamiento fiable
 * ahí), así que mobile usa un patrón de overlay propio en vez de reusar el
 * posicionamiento absoluto del dropdown.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, X } from "lucide-react";
import { useNotifications } from "./NotificationsProvider";
import NotificationList from "./NotificationList";

interface NotificationBellProps {
  /** "dark" para topbars oscuras (mobile), "light" para superficies claras (desktop). */
  variant?: "dark" | "light";
  /**
   * Lado desde el que se despliega el dropdown desktop. "right" (default)
   * alinea el borde derecho del dropdown con el botón — úsalo en topbars.
   * "left-start" lo abre hacia la derecha del botón — úsalo en el sidebar
   * angosto, donde "right" haría que el dropdown se saliera por el borde
   * izquierdo de la pantalla. Sin efecto en mobile (usa el bottom sheet).
   */
  align?: "right" | "left-start";
}

export default function NotificationBell({ variant = "dark", align = "right" }: NotificationBellProps) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const buttonClass =
    variant === "dark"
      ? "text-slate-400 hover:text-white hover:bg-slate-800/50"
      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100";
  const ringClass = variant === "dark" ? "ring-surface-inverted" : "ring-white";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Bloquea el scroll del body solo mientras el bottom SHEET MOBILE está
  // abierto (viewport < lg, breakpoint de Tailwind en 1024px) — el dropdown
  // desktop es un popover flotante que no debe afectar el scroll de la página
  // detrás; bloquearlo incondicionalmente hacía desaparecer la scrollbar
  // lateral también en desktop al abrir notificaciones.
  useEffect(() => {
    if (!isOpen) return;
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) return;

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
        aria-expanded={isOpen}
        className={`relative p-2 rounded-xl transition-colors duration-200 cursor-pointer ${buttonClass}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ${ringClass}`}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Desktop: dropdown flotante junto al botón (lg+) ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: align === "right" ? "top right" : "top left" }}
            className={`hidden lg:flex lg:flex-col absolute top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            <NotificationList
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile: bottom sheet a pantalla completa ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 z-60 bg-slate-950/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-label="Notificaciones"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 flex flex-col max-h-[80vh] rounded-t-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center pt-2.5 pb-1 shrink-0">
                <div className="h-1.5 w-10 rounded-full bg-slate-200" />
              </div>

              <div className="flex items-center justify-between px-4 pb-1 shrink-0">
                <h2 className="text-base font-bold text-slate-800">Notificaciones</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Cerrar"
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <NotificationList
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkRead={markRead}
                onMarkAllRead={markAllRead}
                listClassName="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
