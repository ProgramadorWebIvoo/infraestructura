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
 * Migrado de Context a Zustand (stores/notificationsStore.ts): unreadCount
 * cambia en cada push por WebSocket, y con Context ese cambio re-renderizaba
 * a TODOS los consumidores (NotificationBell, listas, etc.) aunque solo les
 * interesara un campo puntual. Este archivo ahora es solo el efecto de
 * inicialización (fetch inicial + suscripción WS) — el estado vive en el
 * store, y useNotifications() es un wrapper de selectores sobre él.
 *
 * IMPORTANTE — instancia única: NotificationBell se monta dos veces en el
 * layout (MobileTopBar + SidebarNav, una oculta por CSS según breakpoint,
 * pero ambas presentes en el DOM). Si el efecto de abajo corriera dos veces
 * habría dos suscripciones WebSocket y dos toasts duplicados por cada
 * notificación nueva. Por eso <NotificationsProvider> se monta UNA sola vez
 * en App.tsx — el store en sí es un singleton de módulo (a diferencia de
 * Context, no necesita un <Provider> para compartir estado entre
 * consumidores), pero el efecto de fetch+WS sigue gateado a una sola
 * instancia por la misma razón que antes.
 *
 * IMPORTANTE — authToken/authUser vienen como PROPS, no de un useAuth()
 * propio: ver detalle histórico del bug de doble instancia de sesión en
 * services/api.ts / useAuth.ts. Recibir authToken/authUser de la única
 * instancia real (AppRoutes) elimina esa ventana de desincronización.
 *
 * Cada notificación nueva también intenta disparar la Notification API
 * nativa del navegador (notifyBrowser) — solo si el permiso ya fue concedido
 * y solo si la pestaña está en background (document.hidden).
 */

import { useEffect, type ReactNode } from "react";
import type { AppNotification } from "@/types";
import type { AuthUser } from "@/hooks/useAuth";
import { createEchoClient } from "@/services/echo";
import { useToast } from "./Toast";
import { BACKEND_NOTIFICATION_TYPE_MAP } from "./alertStyles";
import { notifyBrowser } from "@/services/browserNotifications";
import { useNotificationsStore } from "@/stores/notificationsStore";
import { pushDebugEntry, truncateForDebug, useDebugStore } from "@/stores/debugStore";

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

interface NotificationsProviderProps {
  authToken: string;
  authUser: AuthUser;
  children: ReactNode;
}

export function NotificationsProvider({ authToken, authUser, children }: NotificationsProviderProps) {
  const { showToast } = useToast();
  const load = useNotificationsStore(s => s.load);
  const pushFromSocket = useNotificationsStore(s => s.pushFromSocket);

  useEffect(() => {
    load(authToken);
  }, [authToken, load]);

  // Suscripción WebSocket al canal privado del usuario — reemplaza el
  // polling: cada AppNotification nueva llega apenas
  // NotificationDispatcher::notify() la crea en el backend (ver
  // app/Events/NotificationCreated.php).
  useEffect(() => {
    if (!authToken || !authUser?.id) return;

    const echo = createEchoClient();
    if (!echo) return; // Pusher sin key: sin WebSocket, pero la app sigue funcional.

    const channelName = `App.Models.User.${authUser.id}`;
    const channel = echo.private(channelName);

    // El punto inicial en ".notification.created" le indica a Echo que no
    // anteponga el namespace default de eventos — el evento define
    // broadcastAs() explícito en el backend, sin namespace.
    channel.listen(".notification.created", (payload: AppNotification) => {
      // Chequeo explícito (en vez de confiar solo en el no-op interno de
      // push()) para no pagar ni el truncateForDebug() ni la construcción
      // del objeto `detail` en la ruta hot de notificaciones cuando el modo
      // está apagado — este listener corre para TODA sesión autenticada,
      // no solo para quien puede ver el panel.
      if (useDebugStore.getState().enabled) {
        pushDebugEntry({
          kind: "websocket",
          level: "info",
          label: `${channelName} — .notification.created`,
          detail: { channel: channelName, event: ".notification.created", payload: truncateForDebug(payload) as Record<string, unknown> },
        });
      }
      pushFromSocket(payload);

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
      // React StrictMode monta cada efecto, lo limpia y lo vuelve a montar
      // una vez (en dev Y en el build de producción, no es exclusivo de
      // dev) — la primera instancia de Echo puede alcanzar a abrir el
      // WebSocket y ser desconectada acá antes de que el handshake termine,
      // lo que el navegador loguea como "WebSocket connection ... failed:
      // closed before the connection is established". Es un log del
      // navegador sobre el socket nativo, no una excepción de JS — no hay
      // forma de suprimirlo sin dejar la conexión huérfana abierta (peor:
      // un leak real), así que se documenta acá en vez de "arreglarlo": el
      // segundo montaje (el que persiste) sí completa la conexión normal.
      echo.disconnect();
    };
  }, [authToken, authUser?.id, showToast, pushFromSocket]);

  return <>{children}</>;
}

export function useNotifications(): UseNotificationsResult {
  const notifications = useNotificationsStore(s => s.notifications);
  const unreadCount = useNotificationsStore(s => s.unreadCount);
  const isLoading = useNotificationsStore(s => s.isLoading);
  const authToken = useNotificationsStore(s => s.authToken);
  const load = useNotificationsStore(s => s.load);
  const markRead = useNotificationsStore(s => s.markRead);
  const markAllRead = useNotificationsStore(s => s.markAllRead);
  const deleteNotification = useNotificationsStore(s => s.deleteNotification);
  const deleteAllNotifications = useNotificationsStore(s => s.deleteAllNotifications);

  return {
    notifications,
    unreadCount,
    isLoading,
    refresh: () => load(authToken),
    markRead,
    markAllRead,
    deleteNotification,
    deleteAllNotifications,
  };
}
