/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bandeja de alertas internas persistentes: consume GET /notifications +
 * /notifications/unread-count (backend, Fase 1.2 del plan de 90 días) con
 * polling, mismo patrón que useDashboardSummary.
 *
 * Vive en components/UI/ (no en hooks/) siguiendo el mismo patrón que
 * Toast.tsx: expone un componente <Provider> con JSX (createContext +
 * .Provider), así que pertenece junto al resto de contextos de la app,
 * no en hooks/ (que son funciones puras sin JSX).
 *
 * Dispara un toast cuando el poll trae IDs de notificación nuevos (no vistos
 * en el fetch anterior) — antes la bandeja se actualizaba silenciosamente y
 * el usuario solo se enteraba si abría la campana.
 *
 * No hay push real (WebSockets) todavía: el backend está en Laravel 9 y
 * Laravel Reverb requiere Laravel 10+. El intervalo de polling es
 * configurable desde CONFIG APP (`polling_notificaciones_segundos`, default
 * 8s — se bajó de 30s como mitigación mientras tanto) — Reverb (o
 * Pusher/Ably como alternativa sin upgrade de framework) queda pendiente en
 * el roadmap para push real.
 *
 * IMPORTANTE — instancia única: NotificationBell se monta dos veces en el
 * layout (MobileTopBar + SidebarNav, una oculta por CSS según breakpoint,
 * pero ambas presentes en el DOM). Si cada una llamara este hook por su
 * cuenta, habría dos pollings y dos toasts duplicados por cada notificación
 * nueva. Por eso la lógica real vive en useNotificationsSource() y se
 * instancia UNA sola vez en <NotificationsProvider> (ver App.tsx); todo
 * consumidor (NotificationBell, etc.) usa useNotifications(), que solo lee
 * el contexto ya compartido.
 *
 * Cada notificación nueva también intenta disparar la Notification API
 * nativa del navegador (notifyBrowser) — solo si el permiso ya fue concedido
 * (pedido al login, ver useAuth) y solo si la pestaña está en background
 * (document.hidden); con la pestaña visible el toast en pantalla ya avisa,
 * duplicar con el widget nativo sería ruido. A diferencia del toast, esto
 * NUNCA se usa para el feedback local de acción (success/error/warning/info)
 * — es exclusivo de alertas del backend.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AppNotification } from "../../types";
import { apiFetch } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { usePolling } from "../../hooks/usePolling";
import { usePollingSettings } from "../../hooks/usePollingSettings";
import { useToast } from "./Toast";
import { notifyBrowser } from "../../services/browserNotifications";

export interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  refresh: () => void;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
}

function useNotificationsSource(): UseNotificationsResult {
  const { authToken } = useAuth();
  const { showToast } = useToast();
  const { notificationsIntervalMs } = usePollingSettings();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // IDs ya vistos en algún fetch anterior — permite detectar cuáles son
  // realmente "nuevas" en cada poll sin tocar el toast en la carga inicial
  // (que traería notificaciones viejas ya conocidas por el usuario).
  const knownIds = useRef<Set<number> | null>(null);

  const load = useCallback(
    async (isPoll = false) => {
      if (!authToken) return;
      try {
        // apiFetch desenvuelve "data" automáticamente (convención Laravel):
        // el endpoint paginado responde {data: [...], links, meta} -> aquí ya llega el array.
        const [list, count] = await Promise.all([
          apiFetch<AppNotification[]>("/notifications?per_page=20", { token: authToken }),
          apiFetch<{ count: number }>("/notifications/unread-count", { token: authToken }),
        ]);

        if (knownIds.current) {
          const fresh = list.filter(n => !knownIds.current!.has(n.id));
          for (const n of fresh) {
            const title = n.project_title_snapshot ?? "IVOO Gestión";
            const message = n.project_title_snapshot ? `${n.project_title_snapshot} — ${n.action}` : n.action;

            showToast(message, "info", { variant: "notification" });
            notifyBrowser(title, n.action);
          }
        }
        knownIds.current = new Set(list.map(n => n.id));

        setNotifications(list);
        setUnreadCount(count.count);
      } catch {
        // Silencioso: la bandeja no es crítica para el flujo principal.
      } finally {
        if (!isPoll) setIsLoading(false);
      }
    },
    [authToken, showToast],
  );

  useEffect(() => {
    load();
  }, [load]);

  // pauseWhenHidden=false: a diferencia del resto de pollings de la app, este
  // debe seguir corriendo con la pestaña en background — si se pausa ahí,
  // notifyBrowser() nunca detecta nada nuevo mientras el usuario no mira la
  // pestaña, y al volver ya es tarde (la notificación nativa exige que la
  // pestaña siga oculta en el momento del fetch, ver browserNotifications.ts).
  usePolling(useCallback(() => load(true), [load]), notificationsIntervalMs, !!authToken, false);

  const markRead = useCallback(
    async (id: number) => {
      if (!authToken) return;
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH", token: authToken });
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));
    },
    [authToken],
  );

  const markAllRead = useCallback(async () => {
    if (!authToken) return;
    await apiFetch("/notifications/read-all", { method: "PATCH", token: authToken });
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
  }, [authToken]);

  return {
    notifications,
    unreadCount,
    isLoading,
    refresh: () => load(),
    markRead,
    markAllRead,
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
