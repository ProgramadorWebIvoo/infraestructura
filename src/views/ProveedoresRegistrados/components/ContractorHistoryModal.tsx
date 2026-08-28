/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Histórico consolidado de un proveedor (Fase 3.1.3): serie mensual de
 * precios cotizados + top productos con variación, sobre GET
 * /contractors/{code}/history. Mismo criterio sin-librería que
 * PriceHistorySparkline en CatalogProductDetailModal — SVG inline con
 * gradiente + puntos con tooltip nativo — y misma estructura de
 * SummaryStat que InspectProposalModal para las tarjetas de resumen.
 */

import { useEffect, useState } from "react";
import { History, TrendingUp, TrendingDown, Minus, Star, Boxes } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import EmptyState from "../../../components/UI/EmptyState";
import { SkeletonPriceChart, SkeletonStatCardGrid } from "../../../components/SkeletonLoader";
import { apiFetch } from "../../../services/api";
import type { Contractor, ContractorHistory } from "../../../types";
import { getErrorMessage } from "../../../services/logger";

interface ContractorHistoryModalProps {
  contractor: Contractor | null;
  onClose: () => void;
}

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("es-VE", { month: "short", year: "2-digit" });

function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return MONTH_LABEL_FORMATTER.format(new Date(year, m - 1, 1));
}

function MonthlySeriesChart({ series }: { series: ContractorHistory["monthlySeries"] }) {
  const withData = series.filter((entry) => entry.avgPriceUsd != null);
  if (withData.length < 2) {
    return (
      <p className="text-xs italic text-text-muted">
        {withData.length === 1 ? "Solo hay un mes con cotizaciones — se necesita más de un punto para graficar una tendencia." : "Sin histórico de precios en este período."}
      </p>
    );
  }

  const width = 560;
  const height = 140;
  const padding = 12;
  const prices = withData.map((e) => e.avgPriceUsd as number);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  // Puntos posicionados sobre TODA la serie (incluye meses sin datos, para
  // que el eje X refleje el período real) pero la línea solo conecta entre
  // meses con avgPriceUsd — igual que un chart financiero con huecos.
  const points = series.map((entry, i) => {
    const x = padding + (i / (series.length - 1)) * (width - padding * 2);
    const y = entry.avgPriceUsd != null ? height - padding - ((entry.avgPriceUsd - min) / range) * (height - padding * 2) : null;
    return { x, y, entry };
  });

  const segments: string[] = [];
  let currentSegment: string[] = [];
  for (const p of points) {
    if (p.y == null) {
      if (currentSegment.length > 1) segments.push(currentSegment.join(" "));
      currentSegment = [];
      continue;
    }
    currentSegment.push(`${currentSegment.length === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  if (currentSegment.length > 1) segments.push(currentSegment.join(" "));

  const first = withData[0].avgPriceUsd as number;
  const last = withData[withData.length - 1].avgPriceUsd as number;
  const changePercent = first > 0 ? ((last - first) / first) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-text-muted">
          ${min.toLocaleString("en-US", { minimumFractionDigits: 2 })} — ${max.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span className={`inline-flex items-center gap-1 text-xs font-black ${changePercent >= 0 ? "text-semantic-critical" : "text-semantic-success"}`}>
          <TrendingUp className={`h-3.5 w-3.5 ${changePercent < 0 ? "rotate-180" : ""}`} />
          {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(1)}%
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Serie mensual de precio promedio">
        <defs>
          <linearGradient id="contractor-history-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent-primary)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--color-accent-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="var(--color-accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {points.map((p) =>
          p.y != null ? (
            <circle key={p.entry.month} cx={p.x} cy={p.y} r="3.5" fill="var(--color-accent-primary)" style={{ opacity: 0.85 }}>
              <title>
                {formatMonthLabel(p.entry.month)}: ${p.entry.avgPriceUsd?.toFixed(2)} ({p.entry.quoteCount} cotización{p.entry.quoteCount !== 1 ? "es" : ""})
              </title>
            </circle>
          ) : null,
        )}
      </svg>

      <div className="flex justify-between text-[9px] text-text-muted">
        <span>{formatMonthLabel(series[0].month)}</span>
        <span>{formatMonthLabel(series[series.length - 1].month)}</span>
      </div>
    </div>
  );
}

function VariationBadge({ percent }: { percent: number }) {
  const Icon = percent > 5 ? TrendingUp : percent < -5 ? TrendingDown : Minus;
  const tone = percent > 5 ? "bg-danger-100 text-danger-700" : percent < -5 ? "bg-success-100 text-success-700" : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap ${tone}`}>
      <Icon className="h-2.5 w-2.5" />
      {percent > 0 ? "+" : ""}{percent.toFixed(1)}%
    </span>
  );
}

export default function ContractorHistoryModal({ contractor, onClose }: ContractorHistoryModalProps) {
  const [history, setHistory] = useState<ContractorHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!contractor) {
      setHistory(null);
      setError("");
      return;
    }

    setIsLoading(true);
    setError("");
    apiFetch<ContractorHistory>(`/contractors/${contractor.code}/history?months=12`)
      .then(setHistory)
      .catch((err) => setError(getErrorMessage(err, "No se pudo cargar el histórico del proveedor.")))
      .finally(() => setIsLoading(false));
  }, [contractor]);

  return (
    <Modal
      isOpen={!!contractor}
      onClose={onClose}
      maxWidth="max-w-2xl"
      icon={<History className="h-5 w-5" />}
      iconColor="emerald"
      title={contractor?.name}
      infoLine={`${contractor?.code} — Histórico de últimos 12 meses`}
    >
      {contractor && (
        <div className="space-y-6">
          {isLoading ? (
            <SkeletonStatCardGrid />
          ) : error ? (
            <div className="rounded-control border border-border-critical bg-semantic-critical/5 p-3.5">
              <p className="text-xs font-medium text-semantic-critical">{error}</p>
            </div>
          ) : history ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border-subtle bg-surface-sunken/40 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Rating</div>
                <div className="mt-1.5 flex items-center gap-1 text-sm font-black text-text-primary">
                  <Star className="h-3.5 w-3.5 fill-warning-400 text-warning-500" />
                  {history.stats.rating?.toFixed(1) ?? "—"}
                </div>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-sunken/40 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Cotizaciones</div>
                <div className="mt-1.5 text-sm font-black text-text-primary">{history.stats.totalQuoteCount}</div>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-sunken/40 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Productos</div>
                <div className="mt-1.5 text-sm font-black text-text-primary">{history.stats.distinctProductCount}</div>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-sunken/40 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Tendencia</div>
                <div className="mt-1.5 text-sm font-black text-text-primary">
                  {history.stats.trendPercent != null ? <VariationBadge percent={history.stats.trendPercent} /> : "—"}
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-text-primary">
                <TrendingUp className="h-4 w-4" /> Precio promedio mensual
              </h4>
              <p className="text-[10px] text-text-muted">
                Promedio de precios cotizados en USD por mes, sobre todas las líneas de propuestas de este proveedor.
              </p>
            </div>
            {isLoading ? <SkeletonPriceChart /> : error ? null : history ? <MonthlySeriesChart series={history.monthlySeries} /> : null}
          </div>

          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-text-primary">
              <Boxes className="h-4 w-4" /> Productos más cotizados
            </h4>
            {isLoading ? (
              <SkeletonPriceChart />
            ) : error ? null : history && history.topProducts.length === 0 ? (
              <EmptyState message="Este proveedor no tiene cotizaciones registradas en el período." icon={<Boxes className="h-7 w-7" />} className="py-6" />
            ) : history ? (
              <div className="divide-y divide-border-subtle">
                {history.topProducts.map((p) => (
                  <div key={p.catalogProductId} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                    <div>
                      <div className="font-bold text-text-primary">{p.productName}</div>
                      <div className="text-[10px] text-text-muted">{p.quoteCount} cotización{p.quoteCount !== 1 ? "es" : ""}</div>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <div className="font-mono font-black text-text-primary">
                        ${p.lastPriceUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                      <VariationBadge percent={p.variationPercent} />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </Modal>
  );
}
