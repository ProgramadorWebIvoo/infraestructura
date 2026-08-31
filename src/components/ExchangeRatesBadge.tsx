/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Badge minimalista con tasas de cambio actuales (USD y EUR).
 * Se muestra en el header para: PROCURA, ANALISTAS, FINANZAS, ADMIN, SUPERADMIN.
 * No se puede mover, eliminar o desaparecer.
 * Patrón: KpiPill (minimalista, material, SEMANTIC_COLOR_MAP).
 */

import { useExchangeRates } from "../hooks/useExchangeRates";
import { useAuth } from "../hooks/useAuth";
import { useMemo } from "react";
import { SEMANTIC_COLOR_MAP } from "./UI/colorTokens";

interface ExchangeRatesBadgeProps {
  userRole?: string;
}

const VISIBLE_ROLES = ["PROCURA", "ANALISTAS", "FINANZAS", "ADMIN", "SUPERADMIN"];

export default function ExchangeRatesBadge({ userRole }: ExchangeRatesBadgeProps) {
  const { authToken } = useAuth();
  const { rates, isLoading } = useExchangeRates(authToken || "", !!authToken);

  const shouldDisplay = userRole && VISIBLE_ROLES.includes(userRole);
  if (!shouldDisplay) return null;

  // Tasas más recientes por moneda
  const latestRates = useMemo(() => {
    const ratesByCode: Record<string, typeof rates[0]> = {};

    for (const rate of rates) {
      if (!ratesByCode[rate.currency_code] || new Date(rate.effective_at) > new Date(ratesByCode[rate.currency_code].effective_at)) {
        ratesByCode[rate.currency_code] = rate;
      }
    }

    return { usd: ratesByCode["USD"], eur: ratesByCode["EUR"] };
  }, [rates]);

  const c = SEMANTIC_COLOR_MAP.brand;
  const hasRates = latestRates.usd || latestRates.eur;

  return (
    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full bg-surface border shadow-xs transition-all ${hasRates ? "border-border-default/80" : "border-border-default"}`}>
      {/* Label */}
      <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Tasas</span>

      {/* Datos o loading */}
      {isLoading && !hasRates ? (
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-border-default animate-pulse" />
          <span className={`text-xs font-mono ${c.text700}`}>Cargando</span>
        </div>
      ) : !hasRates ? (
        <span className={`text-xs font-mono text-text-secondary`}>—</span>
      ) : (
        <div className="flex items-center gap-2">
          {/* USD */}
          {latestRates.usd && (
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-text-secondary">$</span>
              <span className={`text-xs font-black font-mono ${c.text700}`}>
                {latestRates.usd.rate_to_usd.toFixed(2)}
              </span>
              <span className="text-[9px] font-semibold text-text-tertiary">Bs.</span>
            </div>
          )}

          {/* Separador */}
          {latestRates.usd && latestRates.eur && (
            <span className="text-border-default">/</span>
          )}

          {/* EUR */}
          {latestRates.eur && (
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-text-secondary">€</span>
              <span className={`text-xs font-black font-mono ${c.text700}`}>
                {latestRates.eur.rate_to_usd.toFixed(2)}
              </span>
              <span className="text-[9px] font-semibold text-text-tertiary">Bs.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
