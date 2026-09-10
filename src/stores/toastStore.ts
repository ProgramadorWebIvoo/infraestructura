/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Store Zustand de toasts — reemplaza al Context de Toast.tsx. showToast()
 * es un God Node (23 edges en graphify-out/COMPASS.md): con Context solo
 * era invocable desde un componente dentro de <ToastProvider>. Como store
 * global, también es invocable fuera de React (ej. un interceptor de
 * errores en services/api.ts) via useToastStore.getState().showToast(...).
 */

import { create } from "zustand";
import type { AlertType } from "@/components/UI/alertStyles";

export type ToastType = AlertType;
export type ToastPriority = "normal" | "high";
/** "notification": toast de alertas internas (useNotifications) — visualmente
 * distinto de success/error/warning/info para que el usuario reconozca de
 * un vistazo que es "algo pasó en el sistema/otro usuario", no feedback de
 * su propia acción. */
export type ToastVariant = "default" | "notification";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ShowToastOptions = {
  action?: ToastAction;
  priority?: ToastPriority;
  variant?: ToastVariant;
};

export type Toast = {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
  priority: ToastPriority;
  variant: ToastVariant;
};

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

export function getToastDuration(priority: ToastPriority, variant: ToastVariant): number {
  if (priority === "high") return HIGH_PRIORITY_DURATION_MS;
  if (variant === "notification") return NOTIFICATION_DURATION_MS;
  return TOAST_DURATION_MS;
}

interface ToastState {
  toasts: Toast[];
  exitingIds: Set<number>;
  showToast: (message: string, type?: ToastType, options?: ShowToastOptions) => void;
  dismiss: (id: number) => void;
  /** Solo para tests: limpia estado y timers pendientes entre casos. */
  __reset: () => void;
}

const timers = new Map<number, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  exitingIds: new Set(),

  showToast: (message, type = "info", options) => {
    const id = ++nextId;
    const priority = options?.priority ?? "normal";
    const variant = options?.variant ?? "default";
    const duration = getToastDuration(priority, variant);

    set((s) => {
      const next = [{ id, message, type, action: options?.action, priority, variant }, ...s.toasts];
      if (next.length > MAX_TOASTS) {
        const removed = next.splice(0, next.length - MAX_TOASTS);
        removed.forEach((t) => {
          const timer = timers.get(t.id);
          if (timer) {
            clearTimeout(timer);
            timers.delete(t.id);
          }
        });
      }
      return { toasts: next };
    });

    const timer = setTimeout(() => get().dismiss(id), duration);
    timers.set(id, timer);
  },

  dismiss: (id) => {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }

    // Marcar como "saliendo" para activar animate-slide-out-right.
    set((s) => ({ exitingIds: new Set(s.exitingIds).add(id) }));

    // Remover del estado después de que termine la animación (250ms).
    setTimeout(() => {
      set((s) => {
        const nextExiting = new Set(s.exitingIds);
        nextExiting.delete(id);
        return { toasts: s.toasts.filter((t) => t.id !== id), exitingIds: nextExiting };
      });
    }, EXIT_ANIMATION_MS);
  },

  __reset: () => {
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
    set({ toasts: [], exitingIds: new Set() });
  },
}));
