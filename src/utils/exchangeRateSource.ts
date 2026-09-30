/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Etiquetas legibles de la fuente de una tasa (`exchange_rates.source` y
 * `exchange_rate_sync_logs.source`) — un solo lugar para el histórico de tasas
 * y el panel de logs de sincronización.
 */

/** Prefijo de la fuente USDT: `USDT_COM_VE:<mercado>` (ej. `USDT_COM_VE:binance`). */
export const USDT_SOURCE_PREFIX = "USDT_COM_VE";

export function isUsdtSource(source: string | null | undefined): boolean {
  return !!source && source.startsWith(USDT_SOURCE_PREFIX);
}

export function exchangeRateSourceLabel(source: string | null | undefined): string {
  if (!source) return "-";
  if (source === "DOLARVZLA_API") return "DolarVZLA API";
  if (source === "BCV_SCRAPING") return "BCV Scraping";
  if (isUsdtSource(source)) {
    const market = source.slice(USDT_SOURCE_PREFIX.length + 1);
    return market ? `usdt.com.ve (${market.charAt(0).toUpperCase()}${market.slice(1)})` : "usdt.com.ve";
  }
  return source;
}
