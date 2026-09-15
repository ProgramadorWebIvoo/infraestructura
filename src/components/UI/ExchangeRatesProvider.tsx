/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Caché compartida de las tasas de cambio para toda la sesión. Migrado de
 * Context a Zustand (stores/exchangeRatesStore.ts): el store es un
 * singleton de módulo, así que los consumidores leen por selector sin
 * necesidad de árbol de Provider — este componente dispara el fetch inicial
 * una vez por sesión, y mantiene la suscripción WebSocket que refresca el
 * store cuando el backend recalcula tasas (sync manual o automático).
 *
 * La suscripción a `.exchange-rates.updated` vivía antes en
 * `useExchangeRates.ts`, montada solo cuando `ConfigAppPanel` estaba abierto
 * (SUPERADMIN) — eso abría un SEGUNDO canal Pusher independiente del de
 * `NotificationsProvider` (con su propio `/broadcasting/auth`), y además
 * dejaba al resto de la sesión (cualquier otra vista con tasas en pantalla)
 * sin recibir la actualización en tiempo real. Centralizado acá: una sola
 * suscripción por sesión, activa para todos los roles, sin duplicar
 * `/broadcasting/auth` (ver PERFORMANCE-AUDIT-2026-09-15.md).
 *
 * Fuera de sesión (tests de componentes aislados, vistas públicas sin auth)
 * hasLoaded queda en false y rates vacío — useExchangeRatesContext() sigue
 * degradando a "sin tasas disponibles" en vez de explotar.
 */

import { useEffect, type ReactNode } from "react";
import { useExchangeRatesStore, type ExchangeRateRecord } from "@/stores/exchangeRatesStore";
import { createEchoClient } from "@/services/echo";

export type { ExchangeRateRecord };

interface ExchangeRatesContextValue {
  rates: ExchangeRateRecord[];
  isLoading: boolean;
  hasLoaded: boolean;
}

export function ExchangeRatesProvider({ authToken, children }: { authToken: string; children: ReactNode }) {
  const load = useExchangeRatesStore(s => s.load);
  const refresh = useExchangeRatesStore(s => s.refresh);

  useEffect(() => {
    if (authToken) load(authToken);
  }, [authToken, load]);

  useEffect(() => {
    if (!authToken) return;

    const echo = createEchoClient();
    if (!echo) return;

    const channel = echo.private("exchange-rates");
    channel.listen(".exchange-rates.updated", () => {
      refresh(authToken);
    });

    return () => {
      echo.leaveChannel("exchange-rates");
    };
  }, [authToken, refresh]);

  return <>{children}</>;
}

export function useExchangeRatesContext(): ExchangeRatesContextValue | null {
  // Ya no depende de estar "dentro" de un árbol de Provider (el store es un
  // singleton de módulo) — siempre devuelve un valor con defaults seguros
  // (rates: [], isLoading: false) para vistas públicas o tests que nunca
  // llaman a load(). Los consumidores (ej. useCurrencyConversion) ya usan
  // `context?.rates ?? []`, así que este objeto no-null es compatible.
  const rates = useExchangeRatesStore(s => s.rates);
  const isLoading = useExchangeRatesStore(s => s.isLoading);
  const hasLoaded = useExchangeRatesStore(s => s.hasLoaded);

  return { rates, isLoading, hasLoaded };
}
