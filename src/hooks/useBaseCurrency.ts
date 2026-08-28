/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Moneda base vigente (GET /currencies/base) — usada por paneles que
 * muestran montos convertidos (Catálogo Maestro), ya que
 * product_price_history internamente siempre guarda en USD.
 */

import { useEffect, useState } from "react";
import type { BaseCurrency } from "../types";
import { apiFetch } from "../services/api";

export function useBaseCurrency(authToken: string) {
  const [baseCurrency, setBaseCurrency] = useState<BaseCurrency | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }
    apiFetch<BaseCurrency>("/currencies/base")
      .then(setBaseCurrency)
      .catch(() => setBaseCurrency(null))
      .finally(() => setIsLoading(false));
  }, [authToken]);

  /** USD → moneda base. Si no hay tasa cargada, devuelve el monto en USD tal cual (fallback seguro). */
  const convertFromUsd = (amountUsd: number): number => {
    if (!baseCurrency?.rateToUsd) return amountUsd;
    return amountUsd / baseCurrency.rateToUsd;
  };

  return { baseCurrency, isLoadingBaseCurrency: isLoading, convertFromUsd };
}
