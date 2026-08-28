/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Detalle de un producto de catálogo: proveedores que lo ofrecen + serie
 * temporal de precios (sparkline SVG inline, mismo criterio sin-librería
 * que DistributionChart en PresidenciaDashboard). Es la base de lectura del
 * hito 3 (inflación) — hoy solo muestra la serie, sin cálculo de variación.
 */

import { useEffect, useState } from "react";
import { Boxes, Package, TrendingUp } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import EmptyState from "../../../components/UI/EmptyState";
import { apiFetch } from "../../../services/api";
import type { BaseCurrency, CatalogProduct, CatalogProductPriceHistoryEntry } from "../../../types";
import { getErrorMessage } from "../../../services/logger";

interface CatalogProductDetailModalProps {
  product: CatalogProduct | null;
  onClose: () => void;
  baseCurrency: BaseCurrency | null;
  convertFromUsd: (amountUsd: number) => number;
}

function PriceHistorySparkline({ entries }: { entries: CatalogProductPriceHistoryEntry[] }) {
  if (entries.length < 2) {
    return (
      <p className="text-xs italic text-slate-400">
        {entries.length === 1 ? "Solo hay una cotización registrada — se necesita más de un dato para graficar una tendencia." : "Sin histórico de precios todavía."}
      </p>
    );
  }

  const width = 560;
  const height = 140;
  const padding = 12;
  const prices = entries.map((e) => e.price_usd);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = entries.map((e, i) => {
    const x = padding + (i / (entries.length - 1)) * (width - padding * 2);
    const y = height - padding - ((e.price_usd - min) / range) * (height - padding * 2);
    return { x, y, entry: e };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${points[points.length - 1].x.toFixed(1)},${height - padding} L${points[0].x.toFixed(1)},${height - padding} Z`;

  const first = entries[0].price_usd;
  const last = entries[entries.length - 1].price_usd;
  const changePercent = first > 0 ? ((last - first) / first) * 100 : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500">
          ${min.toLocaleString("en-US", { minimumFractionDigits: 2 })} — ${max.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span className={`inline-flex items-center gap-1 text-xs font-black ${changePercent >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          <TrendingUp className={`h-3.5 w-3.5 ${changePercent < 0 ? "rotate-180" : ""}`} />
          {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(1)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Serie temporal de precio">
        <defs>
          <linearGradient id="price-history-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#price-history-fill)" />
        <path d={path} fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) => (
          <circle key={p.entry.id} cx={p.x} cy={p.y} r="3" fill="#0ea5e9">
            <title>{`$${p.entry.price_usd.toFixed(2)} — ${new Date(p.entry.quoted_at).toLocaleDateString("es-VE")} (${p.entry.supplier_code})`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

export default function CatalogProductDetailModal({ product, onClose, baseCurrency, convertFromUsd }: CatalogProductDetailModalProps) {
  const [history, setHistory] = useState<CatalogProductPriceHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  // El listado (GET /catalog/products) no trae `suppliers.supplier` (solo la
  // fila de vínculo, sin el Contractor anidado) — se pide el detalle
  // completo al abrir el modal en vez de confiar en lo que ya trae `product`.
  const [detail, setDetail] = useState<CatalogProduct | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    if (!product) {
      setHistory([]);
      setHistoryError("");
      setDetail(null);
      return;
    }
    setIsLoadingHistory(true);
    setHistoryError("");
    apiFetch<CatalogProductPriceHistoryEntry[]>(`/catalog/products/${product.id}/price-history`)
      .then(setHistory)
      .catch((err) => setHistoryError(getErrorMessage(err, "No se pudo cargar el histórico de precios.")))
      .finally(() => setIsLoadingHistory(false));

    setIsLoadingDetail(true);
    apiFetch<CatalogProduct>(`/catalog/products/${product.id}`)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setIsLoadingDetail(false));
  }, [product]);

  return (
    <Modal
      isOpen={!!product}
      onClose={onClose}
      maxWidth="max-w-2xl"
      icon={<Package className="h-5 w-5" />}
      iconColor="sky"
      title={product?.name}
      infoLine={product?.category?.name ?? "Sin categoría"}
    >
      {product && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unidad</div>
              <div className="mt-0.5 text-sm font-black text-slate-800">{product.unit}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Precio ref. ({baseCurrency?.code ?? "USD"})</div>
              <div className="mt-0.5 font-mono text-sm font-black text-slate-800">
                {baseCurrency?.symbol ?? "$"}{convertFromUsd(product.estimated_unit_price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Proveedores</div>
              <div className="mt-0.5 text-sm font-black text-slate-800">{(detail ?? product).suppliers?.length ?? 0}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estado</div>
              <div className={`mt-0.5 text-sm font-black ${product.is_active ? "text-emerald-600" : "text-slate-400"}`}>{product.is_active ? "Activo" : "Inactivo"}</div>
            </div>
          </div>

          <div>
            <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <TrendingUp className="h-4 w-4" /> Histórico de precios (USD)
            </h4>
            <p className="-mt-2 mb-3 text-[10px] italic text-slate-400">
              Serie histórica siempre en USD para que sea comparable en el tiempo, aunque la moneda base cambie.
            </p>
            {isLoadingHistory ? (
              <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
            ) : historyError ? (
              <p className="text-xs font-medium text-red-500">{historyError}</p>
            ) : (
              <PriceHistorySparkline entries={history} />
            )}
          </div>

          <div>
            <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <Boxes className="h-4 w-4" /> Proveedores que lo ofrecen
            </h4>
            {isLoadingDetail ? (
              <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            ) : !detail?.suppliers || detail.suppliers.length === 0 ? (
              <EmptyState message="Ningún proveedor registrado tiene este producto vinculado todavía." icon={<Boxes className="h-7 w-7" />} className="py-6" />
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {detail.suppliers.map((link) => (
                  <div key={link.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                    <div>
                      <div className="font-bold text-slate-700">{link.supplier?.name ?? link.supplier_code}</div>
                      <div className="font-mono text-[10px] text-slate-400">{link.supplier_code}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-slate-800">
                        {baseCurrency?.symbol ?? "$"}{convertFromUsd(link.last_quoted_price_usd).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400">{link.quote_count} cotización{link.quote_count !== 1 ? "es" : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
