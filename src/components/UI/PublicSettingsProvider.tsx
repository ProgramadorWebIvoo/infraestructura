/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Caché compartida de `GET /settings` para toda la sesión — antes
 * `usePollingSettings`, `useMaxAdvancePercent` y `useBudgetSemaphore` eran 3
 * hooks independientes, cada uno con su propio `useEffect` fetcheando el
 * mismo endpoint por separado. Cualquier vista que montara más de uno (ej.
 * BidEvaluationSection usa los 3) o que se desmontara/remontara al navegar
 * (ningún <Route> tiene keep-alive) repetía el mismo fetch sin necesidad —
 * estos valores solo cambian cuando un SUPERADMIN los edita en CONFIG APP,
 * no en cada render.
 *
 * Se hace UN fetch al montar (gateado por sesión, mismo patrón que
 * NotificationsProvider), cacheado en memoria mientras dure la sesión. No
 * hay revalidación automática: si un SUPERADMIN cambia un umbral en CONFIG
 * APP, otros usuarios lo ven recién en su próximo login/refresh de página —
 * trade-off aceptado a propósito (estos valores casi no cambian, y forzar
 * revalidación reintroduciría el mismo volumen de requests que se quiere evitar).
 *
 * `usePollingSettings`/`useMaxAdvancePercent`/`useBudgetSemaphore` se
 * mantienen como los hooks públicos que el resto de la app ya usa — ahora
 * son proyecciones puras sobre este contexto compartido, sin fetch propio.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "../../services/api";
import { logError } from "../../services/logger";
import { useAuth } from "../../hooks/useAuth";

export interface RawSetting {
  key: string;
  value: string | null;
}

export type SettingsByGroup = Record<string, RawSetting[]>;

interface PublicSettingsContextValue {
  settings: SettingsByGroup;
  isLoading: boolean;
}

const PublicSettingsContext = createContext<PublicSettingsContextValue | null>(null);

export function PublicSettingsProvider({ children }: { children: ReactNode }) {
  const { authToken } = useAuth();
  const [settings, setSettings] = useState<SettingsByGroup>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!authToken || hasLoaded) return;
    let cancelled = false;

    apiFetch<SettingsByGroup>("/settings", { token: "authenticated" })
      .then(data => {
        if (cancelled) return;
        setSettings(data ?? {});
      })
      .catch(err => logError("PublicSettingsProvider", err))
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
        setHasLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [authToken, hasLoaded]);

  // Memoizado: este value es el de un Context.Provider que envuelve TODA la
  // app (incluso las rutas públicas, ver App.tsx) — un objeto literal inline
  // es nuevo en cada render aunque settings/isLoading no hayan cambiado,
  // propagándose como "cambio" a cada usePublicSettings() consumidor.
  const value = useMemo(() => ({ settings, isLoading }), [settings, isLoading]);

  return (
    <PublicSettingsContext.Provider value={value}>
      {children}
    </PublicSettingsContext.Provider>
  );
}

export function usePublicSettings(): PublicSettingsContextValue {
  const ctx = useContext(PublicSettingsContext);
  if (!ctx) throw new Error("usePublicSettings debe usarse dentro de PublicSettingsProvider");
  return ctx;
}
