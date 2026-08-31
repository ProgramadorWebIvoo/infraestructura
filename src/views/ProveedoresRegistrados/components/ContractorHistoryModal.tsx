/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ficha consolidada de un proveedor (Fase 3.1.3/3.1.4): serie mensual de
 * precios cotizados, productos más cotizados y personalizados, y proyectos
 * a los que ofertó/le fueron adjudicados — sobre GET /contractors/{code}/
 * history. Objetivo declarado: reconstruir toda la relación proveedor↔
 * empresa desde una sola pantalla, sin saltar a otra vista.
 *
 * Rediseñado de una sola columna con 5 secciones apiladas (colapsado, sin
 * jerarquía real entre ellas) a: stats persistentes arriba + 3 tabs
 * (Precios / Productos / Proyectos), mismo patrón ya usado en
 * RegisterProposalModal — un modal con Tabs dentro no es un patrón nuevo
 * en esta vista. Modal más ancho (max-w-3xl, antes max-w-2xl) para que el
 * contenido respire.
 *
 * Mismo criterio sin-librería que PriceHistorySparkline en
 * CatalogProductDetailModal para el gráfico — SVG inline con gradiente +
 * tooltip nativo — y SummaryStat compartido (src/components/UI/
 * SummaryStat.tsx) para las tarjetas de resumen.
 */

import { useEffect, useState, type ReactNode } from "react";
import { History, TrendingUp, TrendingDown, Minus, Boxes, Sparkles, Briefcase, Trophy, type LucideIcon } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import EmptyState from "../../../components/UI/EmptyState";
import StatusBadge from "../../../components/UI/StatusBadge";
import SummaryStat from "../../../components/UI/SummaryStat";
import Tabs from "../../../components/UI/Tabs";
import TabPanel from "../../../components/UI/TabPanel";
import { SkeletonPriceChart, SkeletonStatCardGrid } from "../../../components/SkeletonLoader";
import { apiFetch } from "../../../services/api";
import type { Contractor, ContractorHistory } from "../../../types";
import { getErrorMessage } from "../../../services/logger";

const ORIGEN_LABELS: Record<string, string> = {
  MANUAL: "Carga manual",
  RENEGOCIACION: "Renegociación",
  "PORTAL-PROV": "Portal de proveedores",
  "SEED-INSERT": "Semilla de datos",
};

type HistoryTab = "precios" | "productos" | "proyectos";

interface ContractorHistoryModalProps {
  contractor: Contractor | null;
  onClose: () => void;
}

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("es-VE", { month: "short", year: "2-digit" });

function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return MONTH_LABEL_FORMATTER.format(new Date(year, m - 1, 1));
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function SectionHeading({ icon: Icon, title, description, badge }: { icon: LucideIcon; title: string; description: string; badge?: ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-text-primary">
        <Icon className="h-4 w-4" /> {title}
        {badge}
      </h4>
      <p className="mt-1 text-[11px] text-text-muted">{description}</p>
    </div>
  );
}

function MonthlySeriesChart({ series }: { series: ContractorHistory["monthlySeries"] }) {
  const withData = series.filter((entry) => entry.avgPriceUsd != null);
  if (withData.length < 2) {
    return (
      <EmptyState
        message={withData.length === 1 ? "Solo hay un mes con cotizaciones — se necesita más de un punto para graficar una tendencia." : "Sin histórico de precios en este período."}
        icon={<TrendingUp className="h-7 w-7" />}
        className="py-8"
      />
    );
  }

  const width = 640;
  const height = 180;
  const padding = 16;
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
    <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-sunken/30 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-text-muted">
          {formatUsd(min)} — {formatUsd(max)}
        </span>
        <span className={`inline-flex items-center gap-1 text-sm font-black ${changePercent >= 0 ? "text-semantic-critical" : "text-semantic-success"}`}>
          <TrendingUp className={`h-4 w-4 ${changePercent < 0 ? "rotate-180" : ""}`} />
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
          <path key={i} d={d} fill="none" stroke="var(--color-accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {points.map((p) =>
          p.y != null ? (
            <circle key={p.entry.month} cx={p.x} cy={p.y} r="4" fill="var(--color-accent-primary)" style={{ opacity: 0.85 }}>
              <title>
                {formatMonthLabel(p.entry.month)}: {formatUsd(p.entry.avgPriceUsd as number)} ({p.entry.quoteCount} cotización{p.entry.quoteCount !== 1 ? "es" : ""})
              </title>
            </circle>
          ) : null,
        )}
      </svg>

      <div className="flex justify-between text-[10px] font-semibold text-text-muted">
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
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${tone}`}>
      <Icon className="h-3 w-3" />
      {percent > 0 ? "+" : ""}{percent.toFixed(1)}%
    </span>
  );
}

function ProductRow({ name, meta, priceLabel, variationPercent }: { name: string; meta: string; priceLabel: string; variationPercent: number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-xs">
      <div className="min-w-0">
        <div className="truncate font-bold text-text-primary">{name}</div>
        <div className="mt-0.5 text-[11px] text-text-muted">{meta}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-right">
        <div className="font-mono font-black text-text-primary">{priceLabel}</div>
        <VariationBadge percent={variationPercent} />
      </div>
    </div>
  );
}

export default function ContractorHistoryModal({ contractor, onClose }: ContractorHistoryModalProps) {
  const [history, setHistory] = useState<ContractorHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<HistoryTab>("precios");

  useEffect(() => {
    if (!contractor) {
      setHistory(null);
      setError("");
      setActiveTab("precios");
      return;
    }

    setIsLoading(true);
    setError("");
    apiFetch<ContractorHistory>(`/contractors/${contractor.code}/history?months=12`)
      // El backend cachea esta respuesta 24h por CacheVersion — una entrada
      // cacheada ANTES de que se agregara un campo nuevo al shape (ej.
      // customProducts, projects) llega sin él, y .length sobre undefined
      // tumbaba el componente entero. Se normaliza acá, un solo lugar, en
      // vez de opcional-chaining disperso en cada uso del array.
      .then((data) => setHistory({ ...data, customProducts: data.customProducts ?? [], projects: data.projects ?? [] }))
      .catch((err) => setError(getErrorMessage(err, "No se pudo cargar el histórico del proveedor.")))
      .finally(() => setIsLoading(false));
  }, [contractor]);

  return (
    <Modal
      isOpen={!!contractor}
      onClose={onClose}
      maxWidth="max-w-3xl"
      icon={<History className="h-5 w-5" />}
      iconColor="emerald"
      title={contractor?.name}
      infoLine={`${contractor?.code} · RIF ${contractor?.rif ?? "—"} — Histórico de últimos 12 meses`}
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
              <SummaryStat
                label="Rating"
                value={history.stats.rating != null ? `★ ${history.stats.rating.toFixed(1)}` : "—"}
              />
              <SummaryStat label="Cotizaciones" value={String(history.stats.totalQuoteCount)} />
              <SummaryStat label="Productos" value={String(history.stats.distinctProductCount)} />
              <SummaryStat
                label="Tendencia"
                value={history.stats.trendPercent != null ? `${history.stats.trendPercent >= 0 ? "+" : ""}${history.stats.trendPercent.toFixed(1)}%` : "—"}
                tone={history.stats.trendPercent != null ? (history.stats.trendPercent > 5 ? "danger" : history.stats.trendPercent < -5 ? "success" : undefined) : undefined}
                emphasize
              />
            </div>
          ) : null}

          {!error && (
            <>
              <Tabs
                ariaLabel="Secciones del histórico del proveedor"
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as HistoryTab)}
                layoutId="contractor-history-tabs"
                tabs={[
                  { key: "precios", label: "Precios" },
                  { key: "productos", label: "Productos", count: history ? history.topProducts.length + history.customProducts.length : undefined },
                  { key: "proyectos", label: "Proyectos", count: history?.stats.totalProjectsBidOn },
                ]}
              />

              <TabPanel activeKey={activeTab}>
                {activeTab === "precios" && (
                  <div>
                    <SectionHeading
                      icon={TrendingUp}
                      title="Precio promedio mensual"
                      description="Promedio de precios cotizados en USD por mes, sobre todas las líneas de propuestas de este proveedor."
                    />
                    {isLoading ? <SkeletonPriceChart /> : history ? <MonthlySeriesChart series={history.monthlySeries} /> : null}
                  </div>
                )}

                {activeTab === "productos" && (
                  <div className="space-y-8">
                    <div>
                      <SectionHeading icon={Boxes} title="Productos más cotizados" description="Los 5 productos con mayor volumen de cotizaciones en el período." />
                      {isLoading ? (
                        <SkeletonPriceChart />
                      ) : history && history.topProducts.length === 0 ? (
                        <EmptyState message="Este proveedor no tiene cotizaciones registradas en el período." icon={<Boxes className="h-7 w-7" />} className="py-6" />
                      ) : history ? (
                        <div className="divide-y divide-border-subtle">
                          {history.topProducts.map((p) => (
                            <ProductRow
                              key={p.catalogProductId}
                              name={p.productName}
                              meta={`${p.quoteCount} cotización${p.quoteCount !== 1 ? "es" : ""}`}
                              priceLabel={formatUsd(p.lastPriceUsd)}
                              variationPercent={p.variationPercent}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <SectionHeading
                        icon={Sparkles}
                        title="Productos personalizados"
                        description='Productos "a medida" declarados por este proveedor, sin fusionar todavía a un producto de catálogo formal.'
                        badge={
                          history && history.customProducts.length > 0 ? (
                            <span className="rounded-full bg-warning-100 px-1.5 py-0.5 text-[9px] font-black text-warning-700">{history.customProducts.length}</span>
                          ) : undefined
                        }
                      />
                      {isLoading ? (
                        <SkeletonPriceChart />
                      ) : history && history.customProducts.length === 0 ? (
                        <EmptyState message="Este proveedor no tiene productos personalizados cotizados en el período." icon={<Sparkles className="h-7 w-7" />} className="py-6" />
                      ) : history ? (
                        <div className="divide-y divide-border-subtle">
                          {history.customProducts.map((p) => (
                            <ProductRow
                              key={p.catalogProductId}
                              name={p.productName}
                              meta={`${p.quoteCount} cotización${p.quoteCount !== 1 ? "es" : ""} · desde ${formatUsd(p.firstPriceUsd)}`}
                              priceLabel={formatUsd(p.lastPriceUsd)}
                              variationPercent={p.variationPercent}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {activeTab === "proyectos" && (
                  <div>
                    <SectionHeading
                      icon={Briefcase}
                      title="Proyectos"
                      description="Proyectos a los que este proveedor ofertó y cuáles le fueron adjudicados. No incluye montos de pago."
                      badge={
                        history && history.stats.totalProjectsBidOn > 0 ? (
                          <span className="rounded-full bg-info-100 px-1.5 py-0.5 text-[9px] font-black text-info-700">
                            {history.stats.awardedProjectCount} de {history.stats.totalProjectsBidOn} adjudicados
                          </span>
                        ) : undefined
                      }
                    />
                    {isLoading ? (
                      <SkeletonPriceChart />
                    ) : history && history.projects.length === 0 ? (
                      <EmptyState message="Este proveedor no ha ofertado en ningún proyecto todavía." icon={<Briefcase className="h-7 w-7" />} className="py-6" />
                    ) : history ? (
                      <div className="divide-y divide-border-subtle">
                        {history.projects.map((p) => (
                          <div key={p.proposalId} className="flex items-center justify-between gap-4 py-3 text-xs">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {p.isAwarded && <Trophy className="h-3.5 w-3.5 shrink-0 text-warning-500" />}
                                <span className={`truncate font-bold ${p.isWithdrawn ? "text-text-muted line-through" : "text-text-primary"}`}>
                                  {p.projectTitle}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text-muted">
                                <span>{p.fechaOferta ?? "—"}</span>
                                <span>·</span>
                                <span>{ORIGEN_LABELS[p.origen] ?? p.origen}</span>
                                {p.isSuperseded && <span className="italic">(renegociada)</span>}
                                {p.isWithdrawn && <span className="italic">(retirada)</span>}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <StatusBadge code={p.projectStatus} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </TabPanel>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
