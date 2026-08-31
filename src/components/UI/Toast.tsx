import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from "react";
import { Bell, X } from "lucide-react";
import { ALERT_ICONS, ALERT_STYLES, type AlertType } from "./alertStyles";

type ToastType = AlertType;
type ToastPriority = "normal" | "high";
/** "notification": toast de alertas internas (useNotifications) — visualmente
 * distinto de success/error/warning/info para que el usuario reconozca de
 * un vistazo que es "algo pasó en el sistema/otro usuario", no feedback de
 * su propia acción. */
type ToastVariant = "default" | "notification";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ShowToastOptions = {
  action?: ToastAction;
  priority?: ToastPriority;
  variant?: ToastVariant;
};

type Toast = {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
  priority: ToastPriority;
  variant: ToastVariant;
};

type ToastContextType = {
  showToast: (message: string, type?: ToastType, options?: ShowToastOptions) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

let nextId = 0;
const MAX_TOASTS = 5;
const TOAST_DURATION_MS = 4000;
const HIGH_PRIORITY_DURATION_MS = 8000;
// Los toasts de notificación (variant="notification") avisan de algo que
// pasó fuera de la acción del propio usuario — con la duración normal (4s)
// pasan inadvertidos con facilidad. 7s les da más tiempo sin llegar a los
// 8s de priority="high" (reservado para casos realmente urgentes/bloqueantes).
const NOTIFICATION_DURATION_MS = 7000;
const EXIT_ANIMATION_MS = 250;

function getToastDuration(priority: ToastPriority, variant: ToastVariant): number {
  if (priority === "high") return HIGH_PRIORITY_DURATION_MS;
  if (variant === "notification") return NOTIFICATION_DURATION_MS;
  return TOAST_DURATION_MS;
}

// ── Configuration maps (compartidas con AlertBanner vía alertStyles.ts) ──

const ICONS = ALERT_ICONS;

type ToastStyle = {
  container: string;
  progress: string;
  icon: string;
  iconChip: string;
};

const STYLES: Record<ToastType, ToastStyle> = {
  success: {
    container: `${ALERT_STYLES.success.bg} ${ALERT_STYLES.success.border} text-emerald-900`,
    progress: "from-emerald-400 to-emerald-500",
    icon: "text-emerald-600",
    iconChip: "bg-emerald-100/80 ring-1 ring-emerald-500/15",
  },
  error: {
    container: `${ALERT_STYLES.error.bg} ${ALERT_STYLES.error.border} text-red-900`,
    progress: "from-red-400 to-red-500",
    icon: "text-red-600",
    iconChip: "bg-red-100/80 ring-1 ring-red-500/15",
  },
  warning: {
    container: `${ALERT_STYLES.warning.bg} ${ALERT_STYLES.warning.border} text-amber-900`,
    progress: "from-amber-400 to-amber-500",
    icon: "text-amber-600",
    iconChip: "bg-amber-100/80 ring-1 ring-amber-500/15",
  },
  info: {
    container: `${ALERT_STYLES.info.bg} ${ALERT_STYLES.info.border} text-sky-900`,
    progress: "from-sky-400 to-sky-500",
    icon: "text-sky-600",
    iconChip: "bg-sky-100/80 ring-1 ring-sky-500/15",
  },
  "action-required": {
    container: `${ALERT_STYLES["action-required"].bg} ${ALERT_STYLES["action-required"].border} text-violet-900`,
    progress: "from-violet-400 to-violet-500",
    icon: "text-violet-600",
    iconChip: "bg-violet-100/80 ring-1 ring-violet-500/15",
  },
  urgent: {
    container: `${ALERT_STYLES.urgent.bg} ${ALERT_STYLES.urgent.border} text-orange-900`,
    progress: "from-orange-400 to-orange-500",
    icon: "text-orange-600",
    iconChip: "bg-orange-100/80 ring-1 ring-orange-500/15",
  },
};

// Estilo fijo para toasts de alerta interna (variant="notification"), sin
// depender del `type` — siempre acento índigo + icono de campana, distinto
// de los 4 estilos de feedback de acción de arriba.
const NOTIFICATION_STYLE: ToastStyle = {
  container: "bg-indigo-50 border-indigo-200 text-indigo-900",
  progress: "from-indigo-400 to-indigo-500",
  icon: "text-indigo-600",
  iconChip: "bg-indigo-100/80 ring-1 ring-indigo-500/15",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const [exitingIds, setExitingIds] = useState<Set<number>>(new Set());

  // ── Dismiss (definido ANTES de showToast para evitar problemas de hoisting) ──
  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    // Marcar como "saliendo" para activar animate-slide-out-right
    setExitingIds(prev => new Set(prev).add(id));

    // Remover del DOM después de que termine la animación (250ms)
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      setExitingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, EXIT_ANIMATION_MS);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info", options?: ShowToastOptions) => {
    const id = ++nextId;
    const priority = options?.priority ?? "normal";
    const variant = options?.variant ?? "default";
    const duration = getToastDuration(priority, variant);

    setToasts(prev => {
      const next = [{ id, message, type, action: options?.action, priority, variant }, ...prev];
      if (next.length > MAX_TOASTS) {
        const removed = next.splice(0, next.length - MAX_TOASTS);
        removed.forEach(t => {
          const timer = timersRef.current.get(t.id);
          if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(t.id);
          }
        });
      }
      return next;
    });

    const timer = setTimeout(() => {
      dismiss(id);
    }, duration);

    timersRef.current.set(id, timer);
  }, [dismiss]);

  // Memoizado: value={{ showToast }} inline es un objeto nuevo en cada
  // render de ToastProvider (ej. cada vez que se muestra/oculta un toast) —
  // este Provider envuelve TODA la app, así que sin memo cualquier render
  // suyo se propaga como "cambio" a cada useToast() consumidor del árbol.
  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        role="region"
        aria-label="Notificaciones"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-[calc(100%-2rem)] sm:w-96 pointer-events-none"
      >
        {toasts.map(toast => {
          const isExiting = exitingIds.has(toast.id);
          const isNotification = toast.variant === "notification";
          const Icon = isNotification ? Bell : ICONS[toast.type];
          const style = isNotification ? NOTIFICATION_STYLE : STYLES[toast.type];
          const duration = getToastDuration(toast.priority, toast.variant);

          return (
            <div
              key={toast.id}
              className={`group pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-sm font-semibold backdrop-blur-xl transition-shadow duration-200 [box-shadow:0_1px_1px_rgba(0,0,0,0.04),0_8px_16px_-4px_rgba(0,0,0,0.08),0_24px_48px_-12px_rgba(0,0,0,0.14)] hover:[box-shadow:0_1px_1px_rgba(0,0,0,0.04),0_10px_20px_-4px_rgba(0,0,0,0.1),0_28px_56px_-12px_rgba(0,0,0,0.18)] ${
                isExiting ? "animate-slide-out-right" : "animate-slide-in-right"
              } ${style.container} ${toast.priority === "high" ? "ring-2 ring-offset-1 ring-current/25" : ""} ${
                isNotification ? "border-l-[3px] border-l-indigo-400" : ""
              }`}
              role={toast.type === "error" || toast.priority === "high" ? "alert" : "status"}
              aria-live={toast.type === "error" || toast.priority === "high" ? "assertive" : "polite"}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full animate-toast-icon-pop ${style.iconChip}`}
              >
                <Icon className={`h-4 w-4 ${style.icon} ${isNotification ? "fill-indigo-200" : ""}`} strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1 pt-1 leading-snug">
                <span>{toast.message}</span>
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action?.onClick();
                      dismiss(toast.id);
                    }}
                    className="mt-1.5 block cursor-pointer text-xs font-bold underline decoration-2 underline-offset-2 opacity-90 transition-opacity hover:opacity-100 hover:no-underline"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="mt-0.5 shrink-0 cursor-pointer self-start rounded-md p-0.5 text-current opacity-40 transition-all duration-150 hover:opacity-100 hover:bg-black/5 active:scale-90"
                aria-label="Cerrar notificación"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/[0.04]">
                <div
                  className={`h-full rounded-full bg-gradient-to-r opacity-70 animate-toast-progress ${style.progress}`}
                  style={{ animationDuration: `${duration}ms` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
