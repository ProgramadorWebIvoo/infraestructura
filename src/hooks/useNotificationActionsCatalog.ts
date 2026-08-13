/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Catálogo real de acciones auditadas que la app puede notificar — misma
 * fuente que usa el backend al filtrar (NotificationDispatcher::AUDITABLE_ACTIONS),
 * consumido por el selector de tags de `acciones_con_correo` /
 * `acciones_con_notificacion_app` en CONFIG APP. Se carga una sola vez (no
 * cambia en runtime, es un catálogo fijo del código).
 */

import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { logError } from "../services/logger";

export function useNotificationActionsCatalog(authToken: string) {
  const [actions, setActions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<string[]>("/settings/notification-actions", { token: authToken });
        if (!cancelled) setActions(data ?? []);
      } catch (err) {
        logError("useNotificationActionsCatalog", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  return { actions, isLoading };
}
