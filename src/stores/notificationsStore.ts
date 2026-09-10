/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Store Zustand de la bandeja de notificaciones — reemplaza al Context de
 * NotificationsProvider.tsx. Motivo: unreadCount cambia en cada push por
 * WebSocket, y con Context cualquier cambio de campo re-renderiza a TODOS
 * los consumidores (NotificationBell, listas, etc.), aunque solo les
 * interese un campo puntual. Con selectores de Zustand cada consumidor
 * solo re-renderiza si el slice que lee cambió.
 *
 * authToken vive en el store (seteado por load()) para que las acciones
 * (markRead, deleteNotification, etc.) no necesiten recibirlo como
 * argumento en cada llamada — mismo comportamiento que el closure sobre
 * authToken de la versión basada en Context/useState.
 *
 * El fetch inicial y la suscripción WebSocket siguen viviendo en un hook de
 * efecto (ver components/UI/NotificationsProvider.tsx) montado UNA sola vez
 * en App.tsx — este store solo contiene el estado y las acciones puras.
 */

import { create } from "zustand";
import type { AppNotification } from "../types";
import { apiFetch } from "../services/api";

interface NotificationsState {
  authToken: string;
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  load: (authToken: string) => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  pushFromSocket: (notification: AppNotification) => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  authToken: "",
  notifications: [],
  unreadCount: 0,
  isLoading: true,

  load: async (authToken) => {
    set({ authToken });
    if (!authToken) {
      // Sin sesión (logout, o antes del primer login): limpiar cualquier
      // dato que hubiera quedado de una sesión anterior — sin esto la
      // bandeja podía seguir mostrando notificaciones del usuario previo.
      set({ notifications: [], unreadCount: 0, isLoading: false });
      return;
    }
    try {
      // apiFetch desenvuelve "data" automáticamente (convención Laravel).
      const [list, count] = await Promise.all([
        apiFetch<AppNotification[]>("/notifications?per_page=20", { token: authToken }),
        apiFetch<{ count: number }>("/notifications/unread-count", { token: authToken }),
      ]);
      set({ notifications: list, unreadCount: count.count, isLoading: false });
    } catch {
      // Silencioso: la bandeja no es crítica para el flujo principal.
      set({ isLoading: false });
    }
  },

  pushFromSocket: (notification) =>
    set((s) => ({ notifications: [notification, ...s.notifications], unreadCount: s.unreadCount + 1 })),

  markRead: async (id) => {
    const { authToken } = get();
    if (!authToken) return;
    const target = get().notifications.find((n) => n.id === id);
    if (!target || target.read_at != null) return;

    // Optimista: la UI refleja el cambio de inmediato; si la request falla,
    // se revierte al snapshot previo en vez de esperar el round-trip.
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));

    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH", token: authToken });
    } catch (err) {
      set((s) => ({
        notifications: s.notifications.map((n) => (n.id === id ? { ...n, read_at: target.read_at } : n)),
        unreadCount: s.unreadCount + 1,
      }));
      throw err;
    }
  },

  markAllRead: async () => {
    const { authToken } = get();
    if (!authToken) return;
    const snapshot = get().notifications;

    set({
      notifications: snapshot.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
      unreadCount: 0,
    });

    try {
      await apiFetch("/notifications/read-all", { method: "PATCH", token: authToken });
    } catch (err) {
      set({ notifications: snapshot, unreadCount: snapshot.filter((n) => n.read_at == null).length });
      throw err;
    }
  },

  deleteNotification: async (id) => {
    const { authToken } = get();
    if (!authToken) return;
    const snapshot = get().notifications;
    const target = snapshot.find((n) => n.id === id);
    const wasUnread = target?.read_at == null;

    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
      unreadCount: wasUnread ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
    }));

    try {
      await apiFetch(`/notifications/${id}`, { method: "DELETE", token: authToken });
    } catch (err) {
      set((s) => ({
        notifications: snapshot,
        unreadCount: wasUnread ? s.unreadCount + 1 : s.unreadCount,
      }));
      throw err;
    }
  },

  deleteAllNotifications: async () => {
    const { authToken } = get();
    if (!authToken) return;
    const snapshot = get().notifications;

    set({ notifications: [], unreadCount: 0 });

    try {
      await apiFetch("/notifications", { method: "DELETE", token: authToken });
    } catch (err) {
      set({ notifications: snapshot, unreadCount: snapshot.filter((n) => n.read_at == null).length });
      throw err;
    }
  },
}));
