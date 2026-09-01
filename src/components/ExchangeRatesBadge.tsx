/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Badge minimalista con tasas de cambio actuales (USD y EUR).
 * Se muestra en el header para: PROCURA, ANALISTAS, FINANZAS, ADMIN, SUPERADMIN.
 * No se puede mover, eliminar o desaparecer.
 * Patrón: KpiPill (minimalista, material, SEMANTIC_COLOR_MAP).
 */

import { useExchangeRatesContext } from "./UI/ExchangeRatesProvider";
import { formatBs } from "../hooks/useCurrencyConversion";
import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SEMANTIC_COLOR_MAP } from "./UI/colorTokens";

interface ExchangeRatesBadgeProps {
  userRole?: string;
}

const VISIBLE_ROLES = ["PROCURA", "ANALISTAS", "FINANZAS", "ADMIN", "SUPERADMIN"];

export default function ExchangeRatesBadge({ userRole }: ExchangeRatesBadgeProps) {
  const context = useExchangeRatesContext();
  const rates = context?.rates ?? [];
  const hasLoaded = context?.hasLoaded ?? false;

  const shouldDisplay = userRole && VISIBLE_ROLES.includes(userRole);

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

  if (!shouldDisplay) return null;

  const c = SEMANTIC_COLOR_MAP.brand;
  const hasRates = latestRates.usd || latestRates.eur;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`inline-flex items-center gap-3 px-4 py-2 rounded-full bg-surface border shadow-xs transition-colors min-w-56 ${hasRates ? "border-border-default/80" : "border-border-default"}`}
    >
      {/* Label */}
      <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider shrink-0">Tasas</span>

      {/* Datos o loading — mientras no se resolvió la primera carga (hasLoaded),
          siempre skeleton: nunca pasa por un "—" intermedio que después salte
          a skeleton y luego a valores (3 remates distintos se veían mal). */}
      <AnimatePresence mode="wait">
        {!hasLoaded ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <div className="h-3.5 w-16 rounded skeleton-shimmer" />
            <span className="text-border-default">/</span>
            <div className="h-3.5 w-16 rounded skeleton-shimmer" />
          </motion.div>
        ) : !hasRates ? (
          <span key="empty" className="text-xs font-mono text-text-secondary">—</span>
        ) : (
          <motion.div
            key="rates"
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex items-center gap-2"
          >
            {/* USD */}
            {latestRates.usd && (
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-text-secondary">$</span>
                <span className={`text-xs font-black font-mono ${c.text700}`}>
                  {formatBs(latestRates.usd.rate_to_usd)}
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
                  {formatBs(latestRates.eur.rate_to_usd)}
                </span>
                <span className="text-[9px] font-semibold text-text-tertiary">Bs.</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
