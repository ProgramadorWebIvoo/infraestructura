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

type BellGesture = "ring" | "settle" | null;

/**
 * Gestos de una sola vez de la campana — implementados como `key`+`animate`
 * declarativo (no `useAnimationControls`): cada disparo remonta el nodo con
 * una nueva key, así que Framer siempre corre la animación desde el inicio
 * hasta el final declarado, sin depender de que un `.start()` imperativo
 * termine de resolver antes del próximo re-render. Con `useAnimationControls`
 * un cambio de props a mitad del bandazo podía re-renderizar el componente
 * mientras el control seguía "en vuelo", dejando la rotación congelada en un
 * keyframe intermedio en vez de volver a 0.
 *
 * "ring": bandazo de campana sonando (llegó algo nuevo) — rotación
 * alternada con amplitud decreciente, como un péndulo que se frena.
 * "settle": asentimiento breve (scale down/up) al vaciar todo el contador —
 * comunica "resuelto", gesto distinto al de "algo nuevo llegó".
 */
const GESTURE_ANIMATE: Record<Exclude<BellGesture, null>, Record<string, number[]>> = {
  ring: { rotate: [0, -16, 12, -8, 5, -2, 0] },
  settle: { scale: [1, 0.82, 1.08, 1] },
};
const GESTURE_TRANSITION: Record<Exclude<BellGesture, null>, object> = {
  ring: { duration: 0.7, ease: [0.36, 0.07, 0.19, 0.97], times: [0, 0.15, 0.34, 0.53, 0.7, 0.85, 1] },
  settle: { duration: 0.45, ease: "easeOut" },
};

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

/**
 * Sin `memo()` a propósito: sus props (variant/align) son literales estáticas,
 * así que memoizar no evita ningún re-render real — el único que importa
 * viene del contexto de notificaciones, que `memo` no bloquea de todos modos.
 * A cambio sí rompía los tests que mockean `useNotifications` (con props
 * iguales, memo omite el render y el componente nunca ve el mock nuevo).
 */
export default function NotificationBell({ variant = "dark", align = "right" }: NotificationBellProps) {
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification, deleteAllNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevUnreadCountRef = useRef(unreadCount);
  // gestureId cambia en cada disparo — es la `key` del nodo animado, así
  // que dos gestos seguidos (ej. dos rings encimados) siempre reinician la
  // animación desde el inicio en vez de intentar interpolar sobre un
  // gesto anterior que quedó a mitad de camino.
  const [gesture, setGesture] = useState<{ id: number; type: BellGesture }>({ id: 0, type: null });

  const buttonClass =
    variant === "dark"
      ? "text-slate-400 hover:text-white hover:bg-slate-800/50"
      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100";
  const ringClass = variant === "dark" ? "ring-surface-inverted" : "ring-white";

  // Dispara el gesto correspondiente según hacia dónde se mueve el contador,
  // nunca en el montaje inicial (prevUnreadCountRef arranca igual a
  // unreadCount, así que el primer render no anima nada — evita el bandazo
  // en cada carga de página aunque ya haya no leídas pendientes).
  useEffect(() => {
    const prev = prevUnreadCountRef.current;
    if (unreadCount > prev) {
      setGesture(g => ({ id: g.id + 1, type: "ring" }));
    } else if (unreadCount === 0 && prev > 0) {
      setGesture(g => ({ id: g.id + 1, type: "settle" }));
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

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
        <motion.span
          key={gesture.type ? gesture.id : "idle"}
          animate={gesture.type ? GESTURE_ANIMATE[gesture.type] : undefined}
          transition={gesture.type ? GESTURE_TRANSITION[gesture.type] : undefined}
          className="block"
          style={{ transformOrigin: "50% 0%" }}
        >
          <Bell className="h-5 w-5" />
        </motion.span>
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="unread-badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ${ringClass}`}
            >
              {/* key=unreadCount: cada cambio de valor remonta el texto y
                  dispara un pop propio (spring), en vez de que el número
                  simplemente "salte" al nuevo valor sin transición. */}
              <motion.span
                key={unreadCount}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            </motion.span>
          )}
        </AnimatePresence>
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
              onDelete={deleteNotification}
              onDeleteAll={deleteAllNotifications}
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
                onDelete={deleteNotification}
                onDeleteAll={deleteAllNotifications}
                listClassName="flex-1 overflow-y-auto light-scrollbar pb-[env(safe-area-inset-bottom)]"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

