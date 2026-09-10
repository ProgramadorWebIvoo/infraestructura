/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de tasas de cambio en el sidebar — versión colapsable que responde
 * al estado global de collapse del sidebar. Muestra USD y EUR con sus tasas
 * a Bs., siempre visible para PROCURA, ANALISTAS, FINANZAS, ADMIN, SUPERADMIN.
 */

import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CircleDollarSign } from "lucide-react";
import { useExchangeRatesContext } from "./ExchangeRatesProvider";
import { SEMANTIC_COLOR_MAP } from "./colorTokens";
import SidebarTip from "./SidebarTip";
import { sidebarTextClass } from "./sidebarNavClasses";

function formatRate(value: number): string {
  return value.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

interface ExchangeRatesSidebarSectionProps {
  userRole?: string;
  isCollapsed: boolean;
}

const VISIBLE_ROLES = ["PROCURA", "ANALISTAS", "FINANZAS", "ADMIN", "SUPERADMIN"];

export default function ExchangeRatesSidebarSection({ userRole, isCollapsed }: ExchangeRatesSidebarSectionProps) {
  const context = useExchangeRatesContext();
  const rates = context?.rates ?? [];
  const hasLoaded = context?.hasLoaded ?? false;

  const shouldDisplay = userRole && VISIBLE_ROLES.includes(userRole);

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

  // Las tasas del backend ya son finales (USD→Bs. y EUR→Bs.), no necesitan conversión
  const usdToBs = latestRates.usd?.rate_to_usd ?? 1;
  const eurToBs = latestRates.eur?.rate_to_usd ?? 1;

  const ratesLabel = hasRates
    ? `$ ${latestRates.usd ? formatRate(usdToBs) : "—"} / € ${latestRates.eur ? formatRate(eurToBs) : "—"}`
    : "—";

  return (
    <div className="border-t border-slate-800/60 px-2 py-3 shrink-0">
      {isCollapsed ? (
        <SidebarTip label={`Tasas BCV\n${ratesLabel}`} disabled={false}>
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-help">
              <CircleDollarSign className="h-5 w-5" />
            </div>
          </div>
        </SidebarTip>
      ) : (
        <div className="space-y-2">
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-1">
            Tasas BCV
          </div>
          <AnimatePresence mode="wait">
            {!hasLoaded ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-1.5 px-2"
              >
                <div className="h-3 w-full rounded skeleton-shimmer" />
                <div className="h-3 w-4/5 rounded skeleton-shimmer" />
              </motion.div>
            ) : !hasRates ? (
              <span key="empty" className="text-xs text-slate-500 block px-2">—</span>
            ) : (
              <motion.div
                key="rates"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-2"
              >
                {/* USD */}
                {latestRates.usd && (
                  <div className="px-2 py-1.5 rounded-lg bg-slate-800/30 border border-slate-700/40">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400">USD</span>
                      <span className={`text-sm font-black font-mono ${c.text600}`}>
                        {formatRate(latestRates.usd.rate_to_usd)}
                      </span>
                      <span className="text-[9px] text-slate-500">Bs.</span>
                    </div>
                  </div>
                )}

                {/* EUR */}
                {latestRates.eur && (
                  <div className="px-2 py-1.5 rounded-lg bg-slate-800/30 border border-slate-700/40">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400">EUR</span>
                      <span className={`text-sm font-black font-mono ${c.text600}`}>
                        {formatRate(eurToBs)}
                      </span>
                      <span className="text-[9px] text-slate-500">Bs.</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
