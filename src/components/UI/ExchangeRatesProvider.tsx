/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Caché compartida de las tasas de cambio para toda la sesión. Migrado de
 * Context a Zustand (stores/exchangeRatesStore.ts): el store es un
 * singleton de módulo, así que los consumidores leen por selector sin
 * necesidad de árbol de Provider — este componente ahora solo dispara el
 * fetch una vez por sesión (mismo patrón que antes).
 *
 * Fuera de sesión (tests de componentes aislados, vistas públicas sin auth)
 * hasLoaded queda en false y rates vacío — useExchangeRatesContext() sigue
 * degradando a "sin tasas disponibles" en vez de explotar.
 */

import { useEffect, type ReactNode } from "react";
import { useExchangeRatesStore, type ExchangeRateRecord } from "@/stores/exchangeRatesStore";

export type { ExchangeRateRecord };

interface ExchangeRatesContextValue {
  rates: ExchangeRateRecord[];
  isLoading: boolean;
  hasLoaded: boolean;
}

export function ExchangeRatesProvider({ authToken, children }: { authToken: string; children: ReactNode }) {
  const load = useExchangeRatesStore(s => s.load);

  useEffect(() => {
    if (authToken) load(authToken);
  }, [authToken, load]);

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
