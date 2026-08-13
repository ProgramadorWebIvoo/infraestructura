import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
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
  /** Rol destinatario informativo (para bandeja/registro); no filtra la UI local. */
  targetRole?: string;
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

const STYLES: Record<ToastType, { container: string; progress: string; icon: string }> = {
  success: {
    container: `${ALERT_STYLES.success.bg} ${ALERT_STYLES.success.border} text-emerald-800`,
    progress: "bg-emerald-400",
    icon: "text-emerald-500",
  },
  error: {
    container: `${ALERT_STYLES.error.bg} ${ALERT_STYLES.error.border} text-red-800`,
    progress: "bg-red-400",
    icon: "text-red-500",
  },
  warning: {
    container: `${ALERT_STYLES.warning.bg} ${ALERT_STYLES.warning.border} text-amber-800`,
    progress: "bg-amber-400",
    icon: "text-amber-500",
  },
  info: {
    container: `${ALERT_STYLES.info.bg} ${ALERT_STYLES.info.border} text-sky-800`,
    progress: "bg-sky-400",
    icon: "text-sky-500",
  },
};

// Estilo fijo para toasts de alerta interna (variant="notification"), sin
// depender del `type` — siempre acento índigo + icono de campana, distinto
// de los 4 estilos de feedback de acción de arriba.
const NOTIFICATION_STYLE = {
  container: "bg-indigo-50 border-indigo-200 text-indigo-900",
  progress: "bg-indigo-400",
  icon: "text-indigo-500",
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

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div
        role="region"
        aria-label="Notificaciones"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-[calc(100%-2rem)] sm:w-96 pointer-events-none"
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
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 pb-3.5 rounded-xl border text-sm font-semibold shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)] overflow-hidden relative ${
                isExiting ? "animate-slide-out-right" : "animate-slide-in-right"
              } ${style.container} ${toast.priority === "high" ? "ring-2 ring-offset-1 ring-current/30" : ""} ${
                isNotification ? "border-l-4 border-l-indigo-400" : ""
              }`}
              role={toast.type === "error" || toast.priority === "high" ? "alert" : "status"}
              aria-live={toast.type === "error" || toast.priority === "high" ? "assertive" : "polite"}
            >
              <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${style.icon} ${isNotification ? "fill-indigo-100" : ""}`} />
              <div className="flex-1 leading-snug min-w-0">
                <span>{toast.message}</span>
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action?.onClick();
                      dismiss(toast.id);
                    }}
                    className="block mt-1 text-xs font-bold underline underline-offset-2 hover:no-underline cursor-pointer"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="cursor-pointer text-current opacity-50 hover:opacity-100 p-0.5 rounded-md hover:bg-black/5 transition-all shrink-0 self-start"
                aria-label="Cerrar notificación"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5">
                <div
                  className={`h-full rounded-full animate-toast-progress ${style.progress}`}
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
