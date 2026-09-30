/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Opciones del selector "Moneda Cotización" para las vistas internas y de
 * renegociación pública: las monedas activas del catálogo (`/public/currencies`,
 * la misma fuente que ya usa el portal de proveedores) en vez de una lista
 * USD/EUR escrita a mano en cada modal — así una moneda nueva (USDT) o
 * desactivada aparece/desaparece en todos los selectores a la vez.
 *
 * Una sola petición por carga de página (promesa cacheada a nivel de módulo).
 * Si falla, cae a USD/EUR (el comportamiento anterior) y no cachea el fallo,
 * para reintentar la próxima vez que se monte un selector.
 */

import { useEffect, useState } from "react";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";
import type { PublicCurrency } from "@/views/PropuestaMaterialesPublica/types";

export interface QuoteCurrencyOption {
  value: string;
  label: string;
}

const FALLBACK_OPTIONS: QuoteCurrencyOption[] = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
];

let cachedCurrencies: Promise<PublicCurrency[]> | null = null;

function loadActiveCurrencies(): Promise<PublicCurrency[]> {
  if (!cachedCurrencies) {
    cachedCurrencies = apiFetch<PublicCurrency[]>("/public/currencies").catch(err => {
      cachedCurrencies = null;
      throw err;
    });
  }
  return cachedCurrencies;
}

export function toQuoteCurrencyOptions(currencies: PublicCurrency[]): QuoteCurrencyOption[] {
  return currencies.map(c => ({ value: c.code, label: `${c.code} (${c.symbol})` }));
}

export function useQuoteCurrencyOptions(): QuoteCurrencyOption[] {
  const [options, setOptions] = useState<QuoteCurrencyOption[]>(FALLBACK_OPTIONS);

  useEffect(() => {
    let cancelled = false;
    loadActiveCurrencies()
      .then(currencies => {
        if (!cancelled && currencies.length > 0) setOptions(toQuoteCurrencyOptions(currencies));
      })
      .catch(err => logError("useQuoteCurrencyOptions", err));
    return () => {
      cancelled = true;
    };
  }, []);

  return options;
}
