// Skeleton primitives for loading states
// Paleta vía tokens de neutrales (colorTokens.ts / @theme) — misma fuente
// de verdad que el resto de src/components/UI/, no colores Tailwind crudos.
//
// Dos capas de animación, cada una con la herramienta correcta:
// 1. SkeletonBlock usa un shimmer CSS (barrido de brillo, @keyframes
//    skeleton-shimmer en src/index.css) en vez de animate-pulse (opacidad
//    en bloque) — más pulido, y más liviano que Framer Motion para una
//    animación continua repetida en potencialmente muchos nodos.
// 2. Las composiciones "de lista" (SkeletonAuditList, SkeletonStatsGrid,
//    etc.) envuelven sus ítems en motion.div + itemVariants/containerVariants
//    (mismas variantes que ya usa toda la app) para que la lista entre en
//    cascada al aparecer, no de golpe — coherente con cómo entra el
//    contenido real una vez cargado.

import { memo, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import { containerVariants, itemVariants } from "../animations";

const base = "skeleton-shimmer rounded-xl";

export const SkeletonBlock = memo(function SkeletonBlock({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <div className={`${base} ${className}`} style={style} />;
});

export const SkeletonCard = memo(function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-surface rounded-container border border-border-default/80 shadow-sm p-6 ${className}`}>
      <div className="flex items-center gap-3.5 border-b border-border-subtle pb-5 mb-6">
        <SkeletonBlock className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-3/5" />
          <SkeletonBlock className="h-3 w-4/5" />
        </div>
      </div>
      <div className="space-y-3">
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-12 w-3/4" />
      </div>
    </div>
  );
});

export const SkeletonStats = memo(function SkeletonStats({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-container border border-border-default/80 shadow-sm p-5 bg-surface ${className}`}>
      <SkeletonBlock className="h-3 w-1/2 mb-3" />
      <SkeletonBlock className="h-8 w-3/4 mb-2" />
      <SkeletonBlock className="h-3 w-2/3" />
    </div>
  );
});

export const SkeletonStatsDark = memo(function SkeletonStatsDark({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-surface-inverted rounded-container p-5 border border-border-inverted shadow-md ${className}`}>
      <div className="skeleton-shimmer-inverted rounded-xl h-3 w-1/2 mb-3" />
      <div className="skeleton-shimmer-inverted rounded-xl h-8 w-3/4 mb-2" />
      <div className="skeleton-shimmer-inverted rounded-xl h-3 w-2/3" />
    </div>
  );
});

export const SkeletonTableRow = memo(function SkeletonTableRow({ cells = 5 }: { cells?: number }) {
  return (
    <tr className="border-b border-border-subtle">
      {Array.from({ length: cells }).map((_, i) => (
        <td key={i} className="py-3.5 px-4">
          <SkeletonBlock className={`h-4 ${i === 0 ? "w-32" : i === cells - 1 ? "w-20" : "w-24"}`} />
        </td>
      ))}
    </tr>
  );
});

export const SkeletonTable = memo(function SkeletonTable({
  rows = 5,
  columns = 6,
  className = "",
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`bg-surface rounded-container border border-border-default/80 shadow-sm overflow-hidden ${className}`}>
      <div className="p-5 border-b border-border-subtle bg-surface-sunken/50">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-48" />
            <SkeletonBlock className="h-3 w-64" />
          </div>
          <SkeletonBlock className="h-8 w-24" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-sunken/70">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="py-3 px-4">
                  <SkeletonBlock className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {Array.from({ length: rows }).map((_, i) => (
              <SkeletonTableRow key={i} cells={columns} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export const SkeletonList = memo(function SkeletonList({ items = 4 }: { items?: number }) {
  return (
    <motion.div className="space-y-3" variants={containerVariants} initial="hidden" animate="visible">
      {Array.from({ length: items }).map((_, i) => (
        <motion.div key={i} variants={itemVariants} className="flex items-center gap-3 p-3.5 border border-border-subtle rounded-xl">
          <SkeletonBlock className="h-8 w-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className="h-3.5 w-3/5" />
            <SkeletonBlock className="h-3 w-2/5" />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
});

export const SkeletonBadge = memo(function SkeletonBadge({ className = "" }: { className?: string }) {
  return <SkeletonBlock className={`h-5 w-16 rounded-lg ${className}`} />;
});

/**
 * Forma de una entrada de auditoría (AuditLogPanel/ConfigAuditLogPanel):
 * título + timestamp mono + diff de dos valores + autor. Ancho de título
 * variable por índice para que la lista no se vea como una grilla repetida.
 */
const TITLE_WIDTHS = ["w-4/5", "w-3/5", "w-full", "w-2/3"];

export const SkeletonAuditEntry = memo(function SkeletonAuditEntry({
  titleWidth = "w-4/5",
  className = "",
}: {
  titleWidth?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border-subtle bg-surface-sunken/50 p-3 ${className}`}>
      <SkeletonBlock className={`h-3.5 mb-1.5 ${titleWidth}`} />
      <SkeletonBlock className="h-2.5 w-24 mb-2" />
      <div className="flex items-center gap-2 mb-1.5">
        <SkeletonBlock className="h-4 w-16 rounded-md" />
        <SkeletonBlock className="h-4 w-16 rounded-md" />
      </div>
      <SkeletonBlock className="h-2.5 w-20" />
    </div>
  );
});

export const SkeletonAuditList = memo(function SkeletonAuditList({
  items = 4,
  className = "",
}: {
  items?: number;
  className?: string;
}) {
  return (
    <motion.div className={`space-y-2 ${className}`} variants={containerVariants} initial="hidden" animate="visible">
      {Array.from({ length: items }).map((_, i) => (
        <motion.div key={i} variants={itemVariants}>
          <SkeletonAuditEntry titleWidth={TITLE_WIDTHS[i % TITLE_WIDTHS.length]} />
        </motion.div>
      ))}
    </motion.div>
  );
});

/**
 * Fila horizontal tipo catálogo (CurrencyCard): chip pequeño + nombre +
 * badge de estado a la izquierda, acciones (botones icon-only) a la derecha.
 */
export const SkeletonCatalogRow = memo(function SkeletonCatalogRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-control border border-border-subtle bg-surface p-3 ${className}`}>
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-5 w-12 rounded-control" />
        <SkeletonBlock className="h-3.5 w-24" />
        <SkeletonBlock className="h-3.5 w-10" />
        <SkeletonBlock className="h-5 w-14 rounded-pill" />
      </div>
      <div className="flex items-center gap-1.5">
        <SkeletonBlock className="h-7 w-7 rounded-control" />
        <SkeletonBlock className="h-7 w-7 rounded-control" />
      </div>
    </div>
  );
});

/**
 * Fila colapsada tipo acordeón (ActionRuleRow/NotificationMatrix): chevron +
 * label + badges de estado a la derecha, sin el contenido expandido.
 */
export const SkeletonCollapsedRow = memo(function SkeletonCollapsedRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 py-3 ${className}`}>
      <SkeletonBlock className="h-3.5 w-3.5 rounded shrink-0" />
      <SkeletonBlock className="h-3.5 flex-1 max-w-56" />
      <SkeletonBlock className="h-4 w-16 rounded-pill shrink-0" />
    </div>
  );
});

/**
 * Anchos variables (no un valor fijo) para que las barras del skeleton se
 * sientan como datos reales en carga, no una grilla repetida idéntica —
 * mismo criterio que el resto de skeletons "con forma" de esta librería.
 */
const BAR_WIDTHS = [72, 45, 88, 60, 38, 95, 55];

export const SkeletonBarChart = memo(function SkeletonBarChart({
  rows = 6,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <motion.div className={`space-y-2 ${className}`} variants={containerVariants} initial="hidden" animate="visible">
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div key={i} variants={itemVariants} className="flex items-center gap-2">
          <SkeletonBlock className="h-2.5 w-10 shrink-0 rounded" />
          <SkeletonBlock
            className="h-4 rounded-md"
            style={{ width: `${BAR_WIDTHS[i % BAR_WIDTHS.length]}%` }}
          />
        </motion.div>
      ))}
    </motion.div>
  );
});

export const SkeletonProviderList = memo(function SkeletonProviderList({
  items = 3,
  className = "",
}: {
  items?: number;
  className?: string;
}) {
  return (
    <motion.div className={`space-y-4 ${className}`} variants={containerVariants} initial="hidden" animate="visible">
      {Array.from({ length: items }).map((_, i) => (
        <motion.div key={i} variants={itemVariants} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-3 w-20 rounded" />
            <SkeletonBlock className="h-3 w-12 rounded" />
          </div>
          <SkeletonBlock
            className="h-2 rounded-full"
            style={{ width: `${BAR_WIDTHS[i % BAR_WIDTHS.length]}%` }}
          />
        </motion.div>
      ))}
    </motion.div>
  );
});

export const SkeletonButton = memo(function SkeletonButton({ className = "" }: { className?: string }) {
  return <SkeletonBlock className={`h-10 rounded-xl ${className}`} />;
});

/**
 * Skeleton de gráfico de precios (sparkline + rango + trending indicator).
 * Simula la estructura de PriceHistorySparkline en CatalogProductDetailModal.
 */
export const SkeletonPriceChart = memo(function SkeletonPriceChart({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-3 w-24 rounded" />
        <SkeletonBlock className="h-4 w-16 rounded" />
      </div>
      <SkeletonBlock className="h-32 w-full rounded-xl" />
    </div>
  );
});

/**
 * Skeleton de supplier link (nombre + código + precio + count).
 * Para listar proveedores que ofrecen un producto.
 */
export const SkeletonSupplierLink = memo(function SkeletonSupplierLink({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-control border border-border-subtle bg-surface p-3.5 ${className}`}>
      <div className="flex-1 space-y-1.5">
        <SkeletonBlock className="h-3.5 w-32" />
        <SkeletonBlock className="h-3 w-24 rounded" />
      </div>
      <div className="space-y-1 text-right">
        <SkeletonBlock className="h-3.5 w-16 rounded" />
        <SkeletonBlock className="h-3 w-12 rounded" />
      </div>
    </div>
  );
});

/**
 * Skeleton de lista de proveedores (N SkeletonSupplierLink en cascada).
 */
export const SkeletonSupplierList = memo(function SkeletonSupplierList({
  items = 3,
  className = "",
}: {
  items?: number;
  className?: string;
}) {
  return (
    <motion.div className={`space-y-2 ${className}`} variants={containerVariants} initial="hidden" animate="visible">
      {Array.from({ length: items }).map((_, i) => (
        <motion.div key={i} variants={itemVariants}>
          <SkeletonSupplierLink />
        </motion.div>
      ))}
    </motion.div>
  );
});

/**
 * Skeleton de stat card (eyebrow + valor grande + descripción).
 * Para los 4 pequeños cuadros de info en CatalogProductDetailModal.
 */
export const SkeletonStatCard = memo(function SkeletonStatCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-control border border-border-subtle bg-surface p-3.5 space-y-2 ${className}`}>
      <SkeletonBlock className="h-2.5 w-16 rounded" />
      <SkeletonBlock className="h-4 w-24 rounded" />
    </div>
  );
});

/**
 * Skeleton de grid de stats (4 SkeletonStatCard en grid, sin animación de cascada).
 */
export const SkeletonStatCardGrid = memo(function SkeletonStatCardGrid({ className = "" }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${className}`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
});

/**
 * Envoltorio de stagger genérico: entra en cascada cualquier grupo de piezas
 * skeleton que el consumidor arme a mano (ej. 2 SkeletonCard, 4 SkeletonStats
 * en grid, N SkeletonCollapsedRow) sin que cada vista repita el
 * `motion.div`+`containerVariants`/`itemVariants` — cada hijo directo debe
 * envolverse con `SkeletonGroupItem` para recibir la animación de entrada.
 */
export const SkeletonGroup = memo(function SkeletonGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={containerVariants} initial="hidden" animate="visible">
      {children}
    </motion.div>
  );
});

export const SkeletonGroupItem = memo(function SkeletonGroupItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
});
