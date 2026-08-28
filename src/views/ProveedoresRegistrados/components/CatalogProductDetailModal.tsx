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
import { Boxes, Package, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import EmptyState from "../../../components/UI/EmptyState";
import Button from "../../../components/UI/Button";
import { SkeletonPriceChart, SkeletonSupplierList } from "../../../components/SkeletonLoader";
import { apiFetch } from "../../../services/api";
import type { BaseCurrency, CatalogProduct, CatalogProductPriceHistoryEntry } from "../../../types";
import { getErrorMessage } from "../../../services/logger";
import Tooltip from "@/components/UI/Tooltip";

interface CatalogProductDetailModalProps {
  product: CatalogProduct | null;
  onClose: () => void;
  baseCurrency: BaseCurrency | null;
  convertFromUsd: (amountUsd: number) => number;
}

function PriceHistorySparkline({ entries }: { entries: CatalogProductPriceHistoryEntry[] }) {
  if (entries.length < 2) {
    return (
      <p className="text-xs italic text-text-muted">
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-text-muted">
          ${min.toLocaleString("en-US", { minimumFractionDigits: 2 })} — ${max.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span className={`inline-flex items-center gap-1 text-xs font-black ${changePercent >= 0 ? "text-semantic-success" : "text-semantic-critical"}`}>
          <TrendingUp className={`h-3.5 w-3.5 ${changePercent < 0 ? "rotate-180" : ""}`} />
          {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(1)}%
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Serie temporal de precio"
      >
        <defs>
          <linearGradient id="price-history-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent-primary)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--color-accent-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#price-history-fill)" />
        <path d={path} fill="none" stroke="var(--color-accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) => (
          <Tooltip content={`$${p.entry.price_usd.toFixed(2)} — ${new Date(p.entry.quoted_at).toLocaleDateString("es-VE")} (${p.entry.supplier_code})`}>
            <circle
              key={p.entry.id}
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill="var(--color-accent-primary)"
              className="cursor-help"
              style={{ opacity: 0.85 }}
            >
            </circle>
          </Tooltip>
        ))}
      </svg>
        
      <p className="text-[10px] text-text-muted italic">Pasa el cursor sobre los puntos para ver detalles</p>
    </div>
  );
}

export default function CatalogProductDetailModal({ product, onClose, baseCurrency, convertFromUsd }: CatalogProductDetailModalProps) {
  const [history, setHistory] = useState<CatalogProductPriceHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [detail, setDetail] = useState<CatalogProduct | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Paginación de proveedores (5 por página)
  const SUPPLIERS_PER_PAGE = 5;
  const [supplierPage, setSupplierPage] = useState(0);
  const suppliers = detail?.suppliers ?? [];
  const totalSupplierPages = Math.ceil(suppliers.length / SUPPLIERS_PER_PAGE);
  const paginatedSuppliers = suppliers.slice(
    supplierPage * SUPPLIERS_PER_PAGE,
    (supplierPage + 1) * SUPPLIERS_PER_PAGE
  );

  useEffect(() => {
    if (!product) {
      setHistory([]);
      setHistoryError("");
      setDetail(null);
      return;
    }

    // Reset paginación cuando cambia el producto
    setSupplierPage(0);

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
          {/* Stats overview */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Unit */}
            <div className="rounded-lg border border-border-subtle bg-surface-sunken/40 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Unidad</div>
              <div className="mt-1.5 text-sm font-black text-text-primary">{product.unit}</div>
            </div>
            {/* Reference price */}
            <div className="rounded-lg border border-border-subtle bg-surface-sunken/40 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Precio ref.</div>
              <div className="mt-1.5 font-mono text-sm font-black text-text-primary">
                {baseCurrency?.symbol ?? "$"}{convertFromUsd(product.estimated_unit_price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[9px] text-text-muted">{baseCurrency?.code ?? "USD"}</div>
            </div>
            {/* Suppliers count */}
            <div className="rounded-lg border border-border-subtle bg-surface-sunken/40 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Proveedores</div>
              <div className="mt-1.5 text-sm font-black text-text-primary">{(detail ?? product).suppliers?.length ?? 0}</div>
            </div>
            {/* Status */}
            <div className="rounded-lg border border-border-subtle bg-surface-sunken/40 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Estado</div>
              <div className={`mt-1.5 text-sm font-black ${product.is_active ? "text-semantic-success" : "text-text-muted"}`}>
                {product.is_active ? "Activo" : "Inactivo"}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-text-primary">
                <TrendingUp className="h-4 w-4" /> Histórico de precios
              </h4>
              <p className="text-[10px] text-text-muted">
                Serie histórica siempre en USD para que sea comparable en el tiempo, aunque la moneda base cambie.
              </p>
            </div>
            {isLoadingHistory ? (
              <SkeletonPriceChart />
            ) : historyError ? (
              <div className="rounded-control border border-border-critical bg-semantic-critical/5 p-3.5">
                <p className="text-xs font-medium text-semantic-critical">{historyError}</p>
              </div>
            ) : (
              <PriceHistorySparkline entries={history} />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-text-primary">
                <Boxes className="h-4 w-4" /> Proveedores que lo ofrecen
                {suppliers.length > 0 && (
                  <span className="ml-auto text-[10px] font-normal text-text-muted">
                    {suppliers.length} {suppliers.length === 1 ? "proveedor" : "proveedores"}
                  </span>
                )}
              </h4>
            </div>
            {isLoadingDetail ? (
              <SkeletonSupplierList items={3} />
            ) : suppliers.length === 0 ? (
              <EmptyState message="Ningún proveedor registrado tiene este producto vinculado todavía." icon={<Boxes className="h-7 w-7" />} className="py-6" />
            ) : (
              <>
                <div className="divide-y divide-border-subtle">
                  {paginatedSuppliers.map((link) => (
                    <div key={link.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                      <div>
                        <div className="font-bold text-text-primary">{link.supplier?.name ?? link.supplier_code}</div>
                        <div className="font-mono text-[10px] text-text-muted">{link.supplier_code}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-black text-text-primary">
                          {baseCurrency?.symbol ?? "$"}{convertFromUsd(link.last_quoted_price_usd).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-text-muted">{link.quote_count} cotización{link.quote_count !== 1 ? "es" : ""}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginación */}
                {totalSupplierPages > 1 && (
                  <div className="flex items-center justify-between py-2.5 border-t border-border-subtle">
                    <div className="text-[10px] text-text-muted">
                      Página {supplierPage + 1} de {totalSupplierPages}
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={supplierPage === 0}
                        onClick={() => setSupplierPage(Math.max(0, supplierPage - 1))}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={supplierPage >= totalSupplierPages - 1}
                        onClick={() => setSupplierPage(Math.min(totalSupplierPages - 1, supplierPage + 1))}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
