/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel histórico de tasas de cambio BCV sincronizadas automáticamente.
 * Muestra histórico de tasas USD/EUR, permite sync manual, y auditaría fuente.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, TrendingUp, Calendar, Zap, AlertCircle } from "lucide-react";
import { itemVariants } from "../../../animations";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import Button from "../../../components/UI/Button";
import { SkeletonCatalogRow, SkeletonGroup, SkeletonGroupItem } from "../../../components/SkeletonLoader";
import { useToast } from "../../../components/UI/Toast";
import { getErrorMessage } from "../../../services/logger";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";
import type { ExchangeRateRecord } from "../../../hooks/useExchangeRates";
import type { CurrencyRecord } from "../../../hooks/useCurrencies";
import Table from "../../../components/UI/Table";
import Select from "../../../components/UI/Select";

interface ExchangeRateHistoryPanelProps {
  rates: ExchangeRateRecord[];
  isLoading: boolean;
  isSyncing: boolean;
  onSyncNow: () => Promise<void>;
  currencies?: CurrencyRecord[];
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  DOLARVZLA_API: { label: "DolarVZLA API", color: "sky" },
  BCV_SCRAPING: { label: "BCV Scraping", color: "emerald" },
};

export default function ExchangeRateHistoryPanel({
  rates,
  isLoading,
  isSyncing,
  onSyncNow,
  currencies = [],
}: ExchangeRateHistoryPanelProps) {
  const { showToast } = useToast();

  // Obtener monedas que tienen histórico
  const ratesCurrencies = Array.from(new Set(rates.map(r => r.currency_code)));

  // Mostrar las monedas oficiales que tienen tasas registradas, ordenadas por código
  const officialCurrenciesWithRates = currencies
    .filter(c => c.is_official && ratesCurrencies.includes(c.code))
    .sort((a, b) => a.code.localeCompare(b.code));

  const currencyOptions = officialCurrenciesWithRates.map(c => c.code);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(currencyOptions[0] || "USD");

  const filteredRates = rates
    .filter(r => r.currency_code === selectedCurrency)
    .sort((a, b) => new Date(b.effective_at).getTime() - new Date(a.effective_at).getTime());

  const handleSync = async () => {
    try {
      await onSyncNow();
      showToast("✅ Tasas sincronizadas exitosamente", "success");
    } catch (err) {
      showToast(getErrorMessage(err, "No se pudo sincronizar las tasas."), "error");
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <Card>
        <div className="space-y-6">
          {/* Encabezado con acciones */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: SEMANTIC_COLOR_MAP.accent_sky_50 }}
              >
                <TrendingUp className="w-6 h-6" style={{ color: SEMANTIC_COLOR_MAP.accent_sky_600 }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: SEMANTIC_COLOR_MAP.text_primary }}>
                  Histórico de Tasas
                </h3>
                <p className="text-sm" style={{ color: SEMANTIC_COLOR_MAP.text_secondary }}>
                  Sincronización diaria (Lunes-Viernes @ 10:00 AM VE)
                </p>
              </div>
            </div>
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              variant="primary"
              icon={<RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />}
            >
              {isSyncing ? "Sincronizando..." : "Sincronizar Ahora"}
            </Button>
          </div>

          {/* Filtro por moneda */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium" style={{ color: SEMANTIC_COLOR_MAP.text_secondary }}>
              Moneda:
            </label>
            <Select
              value={selectedCurrency}
              onChange={setSelectedCurrency}
              options={officialCurrenciesWithRates.map(c => ({
                value: c.code,
                label: `${c.code} - ${c.symbol}`,
              }))}
              className="w-48"
              disabled={officialCurrenciesWithRates.length === 0}
            />
            <div
              className="flex items-center gap-2 px-3 py-1 rounded text-xs"
              style={{ backgroundColor: SEMANTIC_COLOR_MAP.accent_sky_50, color: SEMANTIC_COLOR_MAP.accent_sky_700 }}
            >
              <Calendar className="w-3 h-3" />
              {filteredRates.length} registros
            </div>
          </div>

          {/* Tabla de histórico */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <SkeletonCatalogRow key={i} />
              ))}
            </div>
          ) : filteredRates.length === 0 ? (
            <div
              className="flex items-center justify-center py-8 px-4 rounded"
              style={{ backgroundColor: SEMANTIC_COLOR_MAP.accent_amber_50 }}
            >
              <div className="text-center">
                <AlertCircle
                  className="w-8 h-8 mx-auto mb-2"
                  style={{ color: SEMANTIC_COLOR_MAP.accent_amber_600 }}
                />
                <p className="text-sm" style={{ color: SEMANTIC_COLOR_MAP.accent_amber_700 }}>
                  No hay registros de tasas para {selectedCurrency}. Ejecuta una sincronización manual.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${SEMANTIC_COLOR_MAP.border_secondary}` }}>
                    <th className="text-left py-3 px-4 font-semibold" style={{ color: SEMANTIC_COLOR_MAP.text_secondary }}>
                      Fecha
                    </th>
                    <th className="text-right py-3 px-4 font-semibold" style={{ color: SEMANTIC_COLOR_MAP.text_secondary }}>
                      Tasa
                    </th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: SEMANTIC_COLOR_MAP.text_secondary }}>
                      Fuente
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredRates.slice(0, 20).map((rate, idx) => {
                      const sourceConfig = SOURCE_LABELS[rate.source] || { label: rate.source, color: "gray" };
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
                          style={{
                            borderBottom: `1px solid ${SEMANTIC_COLOR_MAP.border_secondary}`,
                          }}
                        >
                          <td className="py-3 px-4" style={{ color: SEMANTIC_COLOR_MAP.text_primary }}>
                            {formattedDate}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold" style={{ color: SEMANTIC_COLOR_MAP.accent_sky_600 }}>
                            {rate.rate_to_usd.toFixed(4)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: SEMANTIC_COLOR_MAP[`accent_${sourceConfig.color}_50`],
                                color: SEMANTIC_COLOR_MAP[`accent_${sourceConfig.color}_700`],
                              }}
                            >
                              {sourceConfig.source === "DOLARVZLA_API" ? (
                                <Zap className="w-3 h-3" />
                              ) : (
                                <RefreshCw className="w-3 h-3" />
                              )}
                              {sourceConfig.label}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>

              {filteredRates.length > 20 && (
                <div className="text-center py-4 text-xs" style={{ color: SEMANTIC_COLOR_MAP.text_secondary }}>
                  Mostrando 20 de {filteredRates.length} registros
                </div>
              )}
            </div>
          )}

          {/* Footer con info */}
          <div
            className="flex items-center gap-2 px-4 py-3 rounded text-xs"
            style={{ backgroundColor: SEMANTIC_COLOR_MAP.accent_sky_50, color: SEMANTIC_COLOR_MAP.accent_sky_700 }}
          >
            <Zap className="w-4 h-4" />
            <span>
              La sincronización se ejecuta automáticamente de <strong>lunes a viernes a las 10:00 AM VE</strong>. Si falla la API, se utiliza scraping de
              BCV.org.ve como respaldo.
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
