/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel histórico de tasas de cambio BCV sincronizadas automáticamente.
 * Reutiliza componentes genéricos: Table, EmptyState, SectionHeader.
 * Aplica reglas de diseño UI: whitespace, jerarquía visual, luz desde arriba.
 */

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { RefreshCw, TrendingUp } from "lucide-react";
import { itemVariants } from "../../../animations";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import Button from "../../../components/UI/Button";
import { Table, type Column } from "../../../components/UI/Table";
import EmptyState from "../../../components/UI/EmptyState";
import { useToast } from "../../../components/UI/Toast";
import { getErrorMessage } from "../../../services/logger";
import Select from "../../../components/UI/Select";
import type { ExchangeRateRecord } from "../../../hooks/useExchangeRates";
import type { CurrencyRecord } from "../../../hooks/useCurrencies";

interface ExchangeRateHistoryPanelProps {
  rates: ExchangeRateRecord[];
  isLoading: boolean;
  isSyncing: boolean;
  onSyncNow: () => Promise<void>;
  currencies?: CurrencyRecord[];
}

const SOURCE_BADGE_CLASSES: Record<string, string> = {
  DOLARVZLA_API: "bg-sky-100/60 text-sky-700 font-semibold",
  BCV_SCRAPING: "bg-emerald-100/60 text-emerald-700 font-semibold",
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

  // Columnas para el componente Table genérico
  const columns: Column<ExchangeRateRecord>[] = [
    {
      key: "effective_at",
      label: "Fecha",
      width: "20%",
      render: (row) =>
        new Date(row.effective_at).toLocaleDateString("es-VE", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
    },
    {
      key: "rate_to_usd",
      label: "Tasa",
      align: "right",
      width: "20%",
      className: "font-semibold text-sky-600",
      render: (row) => row.rate_to_usd.toFixed(4),
    },
    {
      key: "source",
      label: "Fuente",
      align: "center",
      width: "25%",
      render: (row) => (
        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold ${SOURCE_BADGE_CLASSES[row.source] || "bg-gray-100 text-gray-700"}`}>
          {row.source === "DOLARVZLA_API" ? "DolarVZLA API" : row.source === "BCV_SCRAPING" ? "BCV Scraping" : row.source}
        </span>
      ),
    },
  ];

  return (
    <motion.div variants={itemVariants}>
      <Card>
        <div className="space-y-6">
          {/* Encabezado con acción */}
          <SectionHeader
            icon={<TrendingUp className="h-5 w-5" />}
            title="Histórico de Tasas"
            description="Sincronización automática Lunes-Viernes @ 10:00 AM VE. Fuente: DolarVZLA API con fallback a BCV scraping."
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

          {/* Filtro por moneda — separado visualmente */}
          {!isLoading && filteredRates.length > 0 && (
            <div className="flex items-center gap-4 px-1 py-2">
              <label className="text-[10px] font-bold text-text-tertiary uppercase whitespace-nowrap">
                Moneda
              </label>
              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <Select
                  value={selectedCurrency}
                  onChange={setSelectedCurrency}
                  options={officialCurrenciesWithRates.map(c => ({
                    value: c.code,
                    label: `${c.code} – ${c.symbol}`,
                  }))}
                  className="flex-1"
                  disabled={officialCurrenciesWithRates.length === 0}
                />
                <span className="text-[10px] text-text-muted font-semibold">{filteredRates.length} registros</span>
              </div>
            </div>
          )}

          {/* Tabla reutilizable o EmptyState */}
          {officialCurrenciesWithRates.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="h-12 w-12" />}
              title="Sin tasas registradas"
              description="Ejecuta una sincronización manual para obtener las tasas de cambio BCV."
            />
          ) : (
            <Table<ExchangeRateRecord>
              columns={columns}
              data={filteredRates}
              rowKey={(r) => r.id}
              isLoading={isLoading}
              emptyMessage="No hay registros de tasas para esta moneda. Ejecuta una sincronización manual."
              pageSize={20}
              maxHeight="24rem"
            />
          )}

          {/* Info contextual — bajo la tabla */}
          {filteredRates.length > 0 && (
            <div className="border-t border-border-subtle pt-4 text-[10px] text-text-secondary leading-relaxed">
              <p>
                Las tasas se sincronizan automáticamente de <strong>lunes a viernes a las 10:00 AM VE</strong>. Si la API de DolarVZLA falla, se utiliza
                scraping de BCV como respaldo.
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
