/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Catálogo real de acciones auditadas que la app puede notificar — misma
 * fuente que usa el backend al filtrar (NotificationDispatcher::AUDITABLE_ACTIONS),
 * consumido por el selector de tags de `acciones_con_correo` /
 * `acciones_con_notificacion_app` en CONFIG APP. Se carga una sola vez (no
 * cambia en runtime, es un catálogo fijo del código).
 *
 * Cada entrada trae `value` (el string técnico que se persiste, debe
 * coincidir exactamente con el `action` que AuditLog::record() recibe) y
 * `label` (texto legible para el chip — para acciones cuyo string técnico
 * no es autoexplicativo, ej. 'contractor.register').
 *
 * Caché de módulo (no contexto React): único consumidor es ConfigAppPanel,
 * así que no hay duplicación entre componentes simultáneos — el costo real
 * era refetchear en cada remontaje de la vista al navegar (sin keep-alive de
 * ruta). Cachear en memoria de módulo evita eso sin necesitar un Provider
 * nuevo, ya que el valor no depende de qué usuario esté logueado (es un
 * catálogo fijo del código, igual para cualquier sesión autenticada).
 */

import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { logError } from "../services/logger";
import type { TagOption } from "../components/UI/TagMultiSelect";

let cachedActions: TagOption[] | null = null;
let inFlight: Promise<TagOption[]> | null = null;

/** Solo para tests — el caché de módulo persiste entre montajes reales a propósito, pero contamina tests que corren en el mismo proceso. */
export function __resetNotificationActionsCatalogCacheForTests(): void {
  cachedActions = null;
  inFlight = null;
}

export function useNotificationActionsCatalog(authToken: string) {
  const [actions, setActions] = useState<TagOption[]>(cachedActions ?? []);
  const [isLoading, setIsLoading] = useState(cachedActions === null);

  useEffect(() => {
    if (!authToken || cachedActions !== null) return;
    let cancelled = false;

    inFlight ??= apiFetch<TagOption[]>("/settings/notification-actions", { token: authToken });

    inFlight
      .then(data => {
        cachedActions = data ?? [];
        if (!cancelled) setActions(cachedActions);
      })
      .catch(err => {
        logError("useNotificationActionsCatalog", err);
      })
      .finally(() => {
        inFlight = null;
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  return { actions, isLoading };
}
