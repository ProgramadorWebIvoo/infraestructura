/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Migrado de Context a Zustand (stores/toastStore.ts). showToast es un God
 * Node (23 edges en graphify-out/COMPASS.md) — como store global también es
 * invocable fuera de React vía useToastStore.getState().showToast(...) (ej.
 * un interceptor de errores en services/api.ts), algo imposible con Context
 * porque exigía estar dentro del árbol de <ToastProvider>.
 *
 * <ToastProvider> ahora solo renderiza el contenedor visual de toasts +
 * children; el estado vive en el store, compartido sin necesidad de
 * envolver nada (se deja el componente por compatibilidad con App.tsx y
 * porque acá vive el JSX del contenedor fixed top-right).
 */

import { useCallback, type ReactNode } from "react";
import { Bell, X } from "lucide-react";
import { ALERT_ICONS, ALERT_STYLES, type AlertType } from "./alertStyles";
import {
  useToastStore,
  getToastDuration,
  type ToastType as StoreToastType,
  type ShowToastOptions as StoreShowToastOptions,
  type ToastAction as StoreToastAction,
} from "../../stores/toastStore";

type ToastType = AlertType;
export type ToastAction = StoreToastAction;
export type ShowToastOptions = StoreShowToastOptions;

type ToastContextType = {
  showToast: (message: string, type?: ToastType, options?: ShowToastOptions) => void;
};

// ── Configuration maps (compartidas con AlertBanner vía alertStyles.ts) ──

const ICONS = ALERT_ICONS;

type ToastStyle = {
  container: string;
  progress: string;
  icon: string;
  iconChip: string;
};

const STYLES: Record<StoreToastType, ToastStyle> = {
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
  const toasts = useToastStore(s => s.toasts);
  const exitingIds = useToastStore(s => s.exitingIds);
  const dismiss = useToastStore(s => s.dismiss);

  return (
    <>
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
    </>
  );
}

export function useToast(): ToastContextType {
  const showToastAction = useToastStore(s => s.showToast);
  const showToast = useCallback(
    (message: string, type?: ToastType, options?: ShowToastOptions) => showToastAction(message, type, options),
    [showToastAction],
  );
  return { showToast };
}
