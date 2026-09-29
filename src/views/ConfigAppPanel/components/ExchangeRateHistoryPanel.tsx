/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Histórico de tasas por día, de todas las monedas — distinto de
 * ExchangeRateSyncLogsPanel (que solo lista intentos de sincronización y su
 * conteo de tasas, sin mostrar el valor obtenido) y de CurrencyCard (que no
 * muestra tasa alguna). Antes de este panel no existía ninguna vista que
 * consumiera `GET /exchange-rates/{code}/history`, aunque el backend ya lo
 * exponía — el usuario solo veía la última tasa vigente, nunca la evolución
 * día a día.
 *
 * Muestra las monedas MEZCLADAS en una sola tabla (columna "Moneda") en vez
 * de detrás de un selector: con un selector por moneda, dos registros de
 * monedas distintas en la BD hacían parecer que "faltaba" uno cuando en
 * realidad era de la moneda no seleccionada.
 */

import { useMemo } from "react";
import { History } from "lucide-react";
import { Table, type Column } from "@/components/UI/Table";
import Card from "@/components/UI/Card";
import SectionHeader from "@/components/UI/SectionHeader";
import EmptyState from "@/components/UI/EmptyState";
import { formatBs } from "@/hooks/useCurrencyConversion";
import { useExchangeRateHistory } from "@/hooks/useExchangeRateHistory";
import type { ExchangeRateRecord } from "@/stores/exchangeRatesStore";
import type { CurrencyRecord } from "@/hooks/useCurrencies";

function sourceLabel(source: string): string {
  if (source === "DOLARVZLA_API") return "DolarVZLA API";
  if (source === "BCV_SCRAPING") return "BCV Scraping";
  return source;
}

interface ExchangeRateHistoryPanelProps {
  authToken: string;
  currencies: CurrencyRecord[];
  enabled: boolean;
}

export default function ExchangeRateHistoryPanel({ authToken, currencies, enabled }: ExchangeRateHistoryPanelProps) {
  // USD es la moneda de referencia (tasa siempre 1.0, ver ExchangeRateController::store)
  // — no tiene histórico propio.
  const selectableCodes = useMemo(() => currencies.filter(c => c.code !== "USD").map(c => c.code), [currencies]);
  const { history, isLoading } = useExchangeRateHistory(authToken, selectableCodes, enabled && selectableCodes.length > 0);

  const columns: Column<ExchangeRateRecord>[] = [
    {
      key: "effective_at",
      label: "Fecha",
      width: "20%",
      render: row =>
        new Date(row.effective_at).toLocaleDateString("es-VE", { year: "numeric", month: "short", day: "numeric" }),
    },
    {
      key: "currency_code",
      label: "Moneda",
      width: "15%",
      render: row => <span className="font-mono text-xs font-bold text-text-primary">{row.currency_code}</span>,
    },
    {
      key: "rate_to_usd",
      label: "Tasa (Bs.)",
      width: "30%",
      render: row => <span className="font-semibold text-text-primary">{formatBs(row.rate_to_usd)}</span>,
    },
    {
      key: "source",
      label: "Fuente",
      width: "35%",
      render: row => sourceLabel(row.source),
    },
  ];

  return (
    <Card>
      <SectionHeader
        icon={<History className="h-5 w-5" />}
        title="Histórico de tasas"
        description="Todas las tasas registradas por día, para todas las monedas — hasta los últimos 200 registros por moneda."
        color="amber"
      />

      {selectableCodes.length === 0 ? (
        <EmptyState message="No hay monedas distintas a USD registradas todavía." />
      ) : history.length === 0 && !isLoading ? (
        <EmptyState message="Todavía no hay tasas registradas." />
      ) : (
        <Table<ExchangeRateRecord>
          columns={columns}
          data={history}
          rowKey={row => row.id}
          isLoading={isLoading}
          emptyMessage="No hay tasas registradas."
          pageSize={10}
        />
      )}
    </Card>
  );
}
