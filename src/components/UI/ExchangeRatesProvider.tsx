/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Caché compartida de las tasas de cambio para toda la sesión — mismo patrón
 * y misma motivación que `PublicSettingsProvider`: antes cada componente que
 * mostraba un monto convertido llamaba `useCurrencyConversion()`, y ese hook
 * instanciaba por su cuenta `useAuth()` + `useExchangeRates()`. Con la
 * conversión a Bs. integrada en tablas, cards y modales de casi todas las
 * vistas, eso significaba decenas de instancias de auth (cada una con su
 * propio GET /user de validación de sesión) y decenas de GET /exchange-rates
 * pidiendo exactamente el mismo dato.
 *
 * Ahora el fetch ocurre UNA vez acá y todos los consumidores leen de este
 * contexto. Fuera del provider (tests de componentes aislados, vistas
 * públicas sin sesión) el contexto es null y `useCurrencyConversion` degrada
 * a "sin tasas disponibles" en vez de explotar — mostrar el monto en su
 * moneda original sin la línea de conversión es una degradación aceptable;
 * romper el render no lo es.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useExchangeRates, type ExchangeRateRecord } from "../../hooks/useExchangeRates";

interface ExchangeRatesContextValue {
  rates: ExchangeRateRecord[];
  isLoading: boolean;
  hasLoaded: boolean;
}

const ExchangeRatesContext = createContext<ExchangeRatesContextValue | null>(null);

export function ExchangeRatesProvider({ authToken, children }: { authToken: string; children: ReactNode }) {
  const { rates, isLoading, hasLoaded } = useExchangeRates(authToken, !!authToken);

  const value = useMemo(() => ({ rates, isLoading, hasLoaded }), [rates, isLoading, hasLoaded]);

  return <ExchangeRatesContext.Provider value={value}>{children}</ExchangeRatesContext.Provider>;
}

/**
 * Devuelve null fuera del provider — a propósito, no lanza: ver el comentario
 * de arriba sobre degradación en tests y vistas públicas.
 */
export function useExchangeRatesContext(): ExchangeRatesContextValue | null {
  return useContext(ExchangeRatesContext);
}
