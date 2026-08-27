/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bandeja de alertas internas persistentes: carga inicial vía GET
 * /notifications + /notifications/unread-count, luego se mantiene al día por
 * WebSocket (Laravel Reverb) — cada AppNotification nueva llega por el canal
 * privado App.Models.User.{id} apenas NotificationDispatcher la crea en el
 * backend, sin volver a preguntar.
 *
 * Vive en components/UI/ (no en hooks/) siguiendo el mismo patrón que
 * Toast.tsx: expone un componente <Provider> con JSX (createContext +
 * .Provider), así que pertenece junto al resto de contextos de la app,
 * no en hooks/ (que son funciones puras sin JSX).
 *
 * Dispara un toast por cada notificación que llega por el canal — antes la
 * bandeja se actualizaba silenciosamente y el usuario solo se enteraba si
 * abría la campana.
 *
 * IMPORTANTE — instancia única: NotificationBell se monta dos veces en el
 * layout (MobileTopBar + SidebarNav, una oculta por CSS según breakpoint,
 * pero ambas presentes en el DOM). Si cada una abriera su propia conexión
 * WebSocket, habría dos suscripciones y dos toasts duplicados por cada
 * notificación nueva. Por eso la lógica real vive en useNotificationsSource()
 * y se instancia UNA sola vez en <NotificationsProvider> (ver App.tsx); todo
 * consumidor (NotificationBell, etc.) usa useNotifications(), que solo lee
 * el contexto ya compartido.
 *
 * Cada notificación nueva también intenta disparar la Notification API
 * nativa del navegador (notifyBrowser) — solo si el permiso ya fue concedido
 * (pedido al login, ver useAuth) y solo si la pestaña está en background
 * (document.hidden); con la pestaña visible el toast en pantalla ya avisa,
 * duplicar con el widget nativo sería ruido. A diferencia del toast, esto
 * NUNCA se usa para el feedback local de acción (success/error/warning/info)
 * — es exclusivo de alertas del backend. Con WS puro esto ya no depende de
 * que un poll siga corriendo en background (a diferencia del polling
 * anterior, que necesitaba seguir activo con la pestaña oculta solo para
 * que esta detección siguiera funcionando).
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Channel } from "pusher-js";
import type { AppNotification } from "../../types";
import { apiFetch } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { createEchoClient } from "../../services/echo";
import { useToast } from "./Toast";
import { BACKEND_NOTIFICATION_TYPE_MAP } from "./alertStyles";
import { notifyBrowser } from "../../services/browserNotifications";

export interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  refresh: () => void;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
}

function useNotificationsSource(): UseNotificationsResult {
  const { authToken, authUser } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!authToken) return;
    try {
      // apiFetch desenvuelve "data" automáticamente (convención Laravel):
      // el endpoint paginado responde {data: [...], links, meta} -> aquí ya llega el array.
      const [list, count] = await Promise.all([
        apiFetch<AppNotification[]>("/notifications?per_page=20", { token: authToken }),
        apiFetch<{ count: number }>("/notifications/unread-count", { token: authToken }),
      ]);

      setNotifications(list);
      setUnreadCount(count.count);
    } catch {
      // Silencioso: la bandeja no es crítica para el flujo principal.
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    load();
  }, [load]);

  // Suscripción WebSocket al canal privado del usuario — reemplaza el
  // polling: cada AppNotification nueva llega apenas
  // NotificationDispatcher::notify() la crea en el backend (ver
  // app/Events/NotificationCreated.php).
  useEffect(() => {
    if (!authToken || !authUser?.id) return;

    const echo = createEchoClient();
    const channelName = `App.Models.User.${authUser.id}`;
    const channel = echo.private(channelName);

    // El punto inicial en ".notification.created" le indica a Echo que no
    // anteponga el namespace default de eventos — el evento define
    // broadcastAs() explícito en el backend, sin namespace.
    channel.listen(".notification.created", (payload: AppNotification) => {
      setNotifications(prev => [payload, ...prev]);
      setUnreadCount(prev => prev + 1);

      const title = payload.project_title_snapshot ?? "IVOO Gestión";
      const message = payload.project_title_snapshot
        ? `${payload.project_title_snapshot} — ${payload.action}`
        : payload.action;
      const alertType = BACKEND_NOTIFICATION_TYPE_MAP[payload.type] ?? "info";

      showToast(message, alertType, { variant: "notification" });
      notifyBrowser(title, payload.action);
    });

    return () => {
      echo.leave(channelName);
      echo.disconnect();
    };
  }, [authToken, authUser?.id, showToast]);

  const markRead = useCallback(
    async (id: number) => {
      if (!authToken) return;
      const target = notifications.find(n => n.id === id);
      if (!target || target.read_at != null) return;

      // Optimista: la UI refleja el cambio de inmediato; si la request falla,
      // se revierte al snapshot previo en vez de esperar el round-trip.
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));

      try {
        await apiFetch(`/notifications/${id}/read`, { method: "PATCH", token: authToken });
      } catch (err) {
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read_at: target.read_at } : n)));
        setUnreadCount(prev => prev + 1);
        throw err;
      }
    },
    [authToken, notifications],
  );

  const markAllRead = useCallback(async () => {
    if (!authToken) return;
    const snapshot = notifications;

    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);

    try {
      await apiFetch("/notifications/read-all", { method: "PATCH", token: authToken });
    } catch (err) {
      setNotifications(snapshot);
      setUnreadCount(snapshot.filter(n => n.read_at == null).length);
      throw err;
    }
  }, [authToken, notifications]);

  const deleteNotification = useCallback(
    async (id: number) => {
      if (!authToken) return;
      const snapshot = notifications;
      const target = snapshot.find(n => n.id === id);
      const wasUnread = target?.read_at == null;

      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));

      try {
        await apiFetch(`/notifications/${id}`, { method: "DELETE", token: authToken });
      } catch (err) {
        setNotifications(snapshot);
        if (wasUnread) setUnreadCount(prev => prev + 1);
        throw err;
      }
    },
    [authToken, notifications],
  );

  const deleteAllNotifications = useCallback(async () => {
    if (!authToken) return;
    const snapshot = notifications;

    setNotifications([]);
    setUnreadCount(0);

    try {
      await apiFetch("/notifications", { method: "DELETE", token: authToken });
    } catch (err) {
      setNotifications(snapshot);
      setUnreadCount(snapshot.filter(n => n.read_at == null).length);
      throw err;
    }
  }, [authToken, notifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    refresh: () => load(),
    markRead,
    markAllRead,
    deleteNotification,
    deleteAllNotifications,
  };
}

const NotificationsContext = createContext<UseNotificationsResult | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const value = useNotificationsSource();
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): UseNotificationsResult {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications debe usarse dentro de NotificationsProvider");
  return ctx;
}
