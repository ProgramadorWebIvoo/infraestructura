/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel histórico de tasas de cambio BCV sincronizadas automáticamente.
 * Muestra histórico de tasas USD/EUR, permite sync manual, y auditoría de fuente.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, TrendingUp, AlertCircle } from "lucide-react";
import { itemVariants } from "../../../animations";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import Button from "../../../components/UI/Button";
import { SkeletonCatalogRow, SkeletonGroup, SkeletonGroupItem } from "../../../components/SkeletonLoader";
import { useToast } from "../../../components/UI/Toast";
import { getErrorMessage } from "../../../services/logger";
import type { ExchangeRateRecord } from "../../../hooks/useExchangeRates";
import type { CurrencyRecord } from "../../../hooks/useCurrencies";
import Select from "../../../components/UI/Select";

interface ExchangeRateHistoryPanelProps {
  rates: ExchangeRateRecord[];
  isLoading: boolean;
  isSyncing: boolean;
  onSyncNow: () => Promise<void>;
  currencies?: CurrencyRecord[];
}

const SOURCE_LABELS: Record<string, string> = {
  DOLARVZLA_API: "DolarVZLA API",
  BCV_SCRAPING: "BCV Scraping",
};

const SOURCE_CLASSES: Record<string, string> = {
  DOLARVZLA_API: "bg-sky-100/50 text-sky-700",
  BCV_SCRAPING: "bg-emerald-100/50 text-emerald-700",
};

export default function ExchangeRateHistoryPanel({
  rates,
  isLoading,
  isSyncing,
  onSyncNow,
  currencies = [],
}: ExchangeRateHistoryPanelProps) {
  const { showToast } = useToast();

  const ratesCurrencies = useMemo(() => Array.from(new Set(rates.map(r => r.currency_code))), [rates]);

  const officialCurrenciesWithRates = useMemo(
    () =>
      currencies
        .filter(c => c.is_official && ratesCurrencies.includes(c.code))
        .sort((a, b) => a.code.localeCompare(b.code)),
    [currencies, ratesCurrencies],
  );

  const currencyOptions = useMemo(() => officialCurrenciesWithRates.map(c => c.code), [officialCurrenciesWithRates]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(currencyOptions[0] || "USD");

  const filteredRates = useMemo(
    () =>
      rates
        .filter(r => r.currency_code === selectedCurrency)
        .sort((a, b) => new Date(b.effective_at).getTime() - new Date(a.effective_at).getTime()),
    [rates, selectedCurrency],
  );

  const handleSync = async () => {
    try {
      await onSyncNow();
      showToast("Tasas sincronizadas exitosamente", "success");
    } catch (err) {
      showToast(getErrorMessage(err, "No se pudo sincronizar las tasas."), "error");
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <Card>
        <SectionHeader
          icon={<TrendingUp className="h-5 w-5" />}
          title="Histórico de Tasas"
          description="Sincronización diaria (Lunes-Viernes @ 10:00 AM VE). Obtenidas de DolarVZLA API con fallback a scraping BCV."
          color="sky"
          actions={
            <Button
              size="sm"
              variant="primary"
              colorScheme="sky"
              isLoading={isSyncing}
              icon={<RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />}
              onClick={handleSync}
            >
              {isSyncing ? "Sincronizando..." : "Sincronizar Ahora"}
            </Button>
          }
        />

        {isLoading ? (
          <SkeletonGroup className="space-y-2">
            <SkeletonGroupItem>
              <SkeletonCatalogRow />
            </SkeletonGroupItem>
            <SkeletonGroupItem>
              <SkeletonCatalogRow />
            </SkeletonGroupItem>
            <SkeletonGroupItem>
              <SkeletonCatalogRow />
            </SkeletonGroupItem>
          </SkeletonGroup>
        ) : (
          <div className="space-y-4">
            {/* Filtro por moneda */}
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-bold text-text-tertiary uppercase">Moneda:</label>
              <Select
                value={selectedCurrency}
                onChange={setSelectedCurrency}
                options={officialCurrenciesWithRates.map(c => ({
                  value: c.code,
                  label: `${c.code} - ${c.symbol}`,
                }))}
                className="w-40"
                disabled={officialCurrenciesWithRates.length === 0}
              />
              <span className="text-[10px] text-text-muted">{filteredRates.length} registros</span>
            </div>

            {/* Tabla o estado vacío */}
            {filteredRates.length === 0 ? (
              <div className="flex items-center justify-center py-6 px-4 rounded-control bg-surface-sunken/30">
                <div className="text-center">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2 text-amber-600" />
                  <p className="text-xs text-text-secondary">
                    No hay registros de tasas para <strong>{selectedCurrency}</strong>. Ejecuta una sincronización manual.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="text-left py-2 px-3 font-semibold text-text-muted">Fecha</th>
                      <th className="text-right py-2 px-3 font-semibold text-text-muted">Tasa</th>
                      <th className="text-center py-2 px-3 font-semibold text-text-muted">Fuente</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredRates.slice(0, 20).map((rate, idx) => {
                        const formattedDate = new Date(rate.effective_at).toLocaleDateString("es-VE", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        });

                        return (
                          <motion.tr
                            key={rate.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="border-b border-border-subtle hover:bg-surface-sunken/30 transition-colors"
                          >
                            <td className="py-2 px-3 text-text-primary">{formattedDate}</td>
                            <td className="py-2 px-3 text-right font-semibold text-sky-600">{rate.rate_to_usd.toFixed(4)}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${SOURCE_CLASSES[rate.source] || "bg-gray-100 text-gray-700"}`}>
                                {SOURCE_LABELS[rate.source] || rate.source}
                              </span>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>

                {filteredRates.length > 20 && (
                  <div className="text-center py-3 text-[10px] text-text-muted">
                    Mostrando 20 de {filteredRates.length} registros
                  </div>
                )}
              </div>
            )}

            {/* Info footer */}
            {filteredRates.length > 0 && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-control bg-surface-sunken/30 text-[10px] text-text-secondary">
                <RefreshCw className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  La sincronización se ejecuta automáticamente de <strong>lunes a viernes a las 10:00 AM VE</strong>. Si falla la API, se utiliza
                  scraping de BCV como respaldo.
                </span>
              </div>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
