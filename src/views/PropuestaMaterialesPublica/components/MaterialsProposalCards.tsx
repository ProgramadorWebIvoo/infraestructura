/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Materiales del proyecto + materiales adicionales del proveedor, en una tabla
 * compacta (misma que Renegociación): nombre, cantidad, unidad, precio, total
 * y estado por fila. Con ~70 materiales, una tarjeta por línea era una pared
 * de campos y de componentes montados; ahora la tabla es paginada con buscador
 * y filtros, y lo que no cabe en una fila (condición, garantía, specs, imagen,
 * notas) se completa en un panel de detalle por línea con navegación entre
 * materiales y salto al siguiente con datos faltantes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { CheckCircle2, ChevronRight, ListChecks, Plus, Trash2 } from "lucide-react";
import NumericInput from "@/components/UI/NumericInput";
import ProductLinesTable, { type ProductColumn } from "@/components/UI/ProductLinesTable";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { springs } from "@/animations";
import { getItemStatus, type ItemStatus } from "@/views/PropuestaMaterialesPublica/itemStatus";
import type { ItemPatch, ItemRow, PublicCatalogCategory } from "@/views/PropuestaMaterialesPublica/types";
import MaterialDetailPanel from "./MaterialDetailPanel";

interface MaterialsProposalCardsProps {
  token: string;
  items: ItemRow[];
  onUpdateItem: (index: number, field: keyof ItemRow, value: ItemRow[keyof ItemRow]) => void;
  onUpdateItemSpec: (index: number, specKey: string, value: string | number | boolean) => void;
  /** Aplica varios cambios de una vez (una sola actualización de estado). */
  onApplyPatches: (patches: ItemPatch[]) => void;
  onAddCustomItem: () => void;
  onRemoveItem: (index: number) => void;
  categories: PublicCatalogCategory[];
  /** Código de la moneda del pedido (ver OrderCurrencySelector) — todos los montos de esta vista se muestran en esta moneda, nunca fijo en USD. */
  currencyCode: string;
}

const STATUS_BADGE: Record<ItemStatus, { label: string; className: string }> = {
  complete: { label: "Completo", className: "bg-emerald-400/10 text-emerald-300" },
  missing: { label: "Faltan datos", className: "bg-rose-400/10 text-rose-300" },
  unpriced: { label: "Sin cotizar", className: "bg-white/5 text-slate-400" },
};

function AnimatedTotal({ value, currencyCode }: { value: number; currencyCode: string }) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (v) => `${currencyCode} ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  const previousValue = useRef(value);

  useEffect(() => {
    if (previousValue.current === value) return;
    const controls = animate(motionValue, value, { duration: 0.4, ease: [0.16, 1, 0.3, 1] });
    previousValue.current = value;
    return () => controls.stop();
  }, [value, motionValue]);

  // key={currencyCode}: fuerza remount cuando cambia la moneda sin tocar el
  // total — useTransform no reevalúa su callback solo porque una variable
  // externa capturada por closure cambió.
  return <motion.span key={currencyCode}>{rounded}</motion.span>;
}

function ProgressChip({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: number; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-[11px] font-bold ${className}`}>
      {icon}
      {label} <span className="font-mono">{value}</span>
    </span>
  );
}

export default function MaterialsProposalCards({
  token,
  items,
  onUpdateItem,
  onUpdateItemSpec,
  onApplyPatches,
  onAddCustomItem,
  onRemoveItem,
  categories,
  currencyCode,
}: MaterialsProposalCardsProps) {
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const warningColor = SEMANTIC_COLOR_MAP.warning;

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const categoryFor = useCallback((item: ItemRow) => (item.categoryId == null ? undefined : categoriesById.get(item.categoryId)), [categoriesById]);
  const statusOf = useCallback((item: ItemRow) => getItemStatus(item, categoryFor(item)), [categoryFor]);

  const statuses = useMemo(() => items.map(statusOf), [items, statusOf]);
  const counts = useMemo(
    () => ({
      complete: statuses.filter((s) => s === "complete").length,
      missing: statuses.filter((s) => s === "missing").length,
      unpriced: statuses.filter((s) => s === "unpriced").length,
    }),
    [statuses],
  );
  const grandTotal = useMemo(() => items.reduce((sum, i) => sum + i.totalPrice, 0), [items]);

  const nextMissingAfter = (from: number) => {
    for (let step = 1; step <= items.length; step++) {
      const candidate = (from + step) % items.length;
      if (statuses[candidate] === "missing") return candidate;
    }
    return null;
  };

  const handleAdd = () => {
    onAddCustomItem();
    // La fila nueva queda al final: su índice es el largo actual.
    setDetailIndex(items.length);
  };

  const handleRemove = useCallback(
    (index: number) => {
      onRemoveItem(index);
      setDetailIndex((current) => (current === null ? null : current === index ? null : current > index ? current - 1 : current));
    },
    [onRemoveItem],
  );

  // Memoizadas: con manejadores estables, escribir un precio re-renderiza solo la fila editada.
  const columns = useMemo<ProductColumn<ItemRow>[]>(
    () => [
    {
      key: "material",
      label: "Material",
      render: (item, index) => (
        <button type="button" onClick={() => setDetailIndex(index)} className="flex max-w-full cursor-pointer items-center gap-2 text-left" aria-label={`Abrir detalle de ${item.materialName || "material personalizado"}`}>
          <span className={`truncate text-[11px] font-semibold ${item.materialName ? "text-slate-100" : "italic text-slate-500"}`}>{item.materialName || "Material personalizado (sin nombre)"}</span>
          {item.isCustom && <span className={`shrink-0 rounded-pill px-1.5 py-0.5 text-[8px] font-black uppercase ${warningColor.bg50} ${warningColor.text700}`}>Adicional</span>}
        </button>
      ),
    },
    { key: "quantity", label: "Cant.", align: "center", className: "font-mono text-[11px] font-bold text-slate-300", render: (item) => item.quantity },
    { key: "unit", label: "Unidad", className: "text-[11px] font-medium text-slate-400", render: (item) => item.unit },
    {
      key: "unitPrice",
      label: `Precio unit. (${currencyCode || "—"})`,
      align: "right",
      render: (item, index) => (
        <NumericInput
          thousands
          value={item.unitPrice === 0 ? "" : item.unitPrice}
          onChange={(v) => onUpdateItem(index, "unitPrice", v)}
          placeholder="0.00"
          className="ml-auto w-32! px-2! py-1.5! text-right! text-[11px]!"
        />
      ),
    },
    {
      key: "total",
      label: "Total",
      align: "right",
      className: "font-mono text-[11px] font-bold text-emerald-400",
      render: (item) => (item.totalPrice > 0 ? item.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—"),
    },
    {
      key: "status",
      label: "Estado",
      align: "center",
      render: (item) => {
        const badge = STATUS_BADGE[statusOf(item)];
        return <span className={`inline-block whitespace-nowrap rounded-pill px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${badge.className}`}>{badge.label}</span>;
      },
    },
    {
      key: "actions",
      label: "",
      align: "right",
      width: "5.5rem",
      render: (item, index) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setDetailIndex(index)}
            className="inline-flex cursor-pointer items-center gap-0.5 rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-slate-300 transition-colors hover:bg-white/10"
            aria-label={`Editar detalle de ${item.materialName || "material personalizado"}`}
          >
            Detalle <ChevronRight className="h-3 w-3" />
          </button>
          {item.isCustom && (
            <button type="button" onClick={() => handleRemove(index)} className="cursor-pointer rounded-lg p-1 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400" aria-label="Eliminar material">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
    ],
    [currencyCode, onUpdateItem, handleRemove, statusOf, warningColor],
  );

  const detailStatus = detailIndex !== null ? statuses[detailIndex] : undefined;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-sky-300">Materiales requeridos por el proyecto</h3>
        <p className="mt-2 text-xs font-medium text-sky-100/80">
          Ingrese el precio unitario que puede ofrecer para cada material, en {currencyCode || "la moneda seleccionada"}. Condición y garantía son obligatorias para todo material con precio cargado
          (se completan en «Detalle»). Puede dejar sin precio los que no provee.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <ProgressChip icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Completos" value={counts.complete} className="bg-emerald-400/10 text-emerald-300" />
          <ProgressChip icon={<ListChecks className="h-3.5 w-3.5" />} label="Con datos faltantes" value={counts.missing} className="bg-rose-400/10 text-rose-300" />
          <ProgressChip icon={null} label="Sin cotizar" value={counts.unpriced} className="bg-white/5 text-slate-400" />
          {counts.missing > 0 && (
            <button type="button" onClick={() => setDetailIndex(nextMissingAfter(-1))} className="ml-auto cursor-pointer rounded-control border border-rose-400/30 px-3 py-1 text-[11px] font-bold text-rose-300 transition-colors hover:bg-rose-400/10">
              Completar los que faltan
            </button>
          )}
        </div>

        <ProductLinesTable
          tone="dark"
          ariaLabel="Materiales de la propuesta"
          items={items}
          columns={columns}
          rowKey={(item) => item._id}
          searchText={(item) => item.materialName}
          searchPlaceholder="Buscar material…"
          filters={[
            { key: "missing", label: "Faltan datos", predicate: (item) => statusOf(item) === "missing" },
            { key: "unpriced", label: "Sin cotizar", predicate: (item) => statusOf(item) === "unpriced" },
            { key: "complete", label: "Completos", predicate: (item) => statusOf(item) === "complete" },
          ]}
          rowClassName={(item) => (statusOf(item) === "missing" ? "bg-rose-400/5" : item.isCustom ? "bg-amber-400/5" : "")}
          emptyMessage="Ningún material coincide con la búsqueda."
          toolbarActions={
            <motion.button
              type="button"
              onClick={handleAdd}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              transition={springs.snappy}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r ${warningColor.gradientFrom} ${warningColor.gradientTo} px-3 py-1.5 text-[11px] font-black text-white transition-colors ${warningColor.gradientFromHover} ${warningColor.gradientToHover}`}
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar material adicional
            </motion.button>
          }
        />
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-sky-400/20 bg-sky-400/10 px-5 py-4">
        <span className="text-xs font-black uppercase tracking-wider text-sky-300">Total estimado de la propuesta</span>
        <span className="font-mono text-lg font-black text-sky-200">
          <AnimatedTotal value={grandTotal} currencyCode={currencyCode || "—"} />
        </span>
      </div>

      {detailIndex !== null && items[detailIndex] && (
        <MaterialDetailPanel
          token={token}
          items={items}
          index={detailIndex}
          category={categoryFor(items[detailIndex])}
          currencyCode={currencyCode}
          hasPending={counts.missing > (detailStatus === "missing" ? 1 : 0)}
          onUpdateItem={onUpdateItem}
          onUpdateItemSpec={onUpdateItemSpec}
          onApplyPatches={onApplyPatches}
          onNavigate={setDetailIndex}
          onNextPending={() => setDetailIndex(nextMissingAfter(detailIndex))}
          onRemove={handleRemove}
          onClose={() => setDetailIndex(null)}
        />
      )}
    </div>
  );
}
