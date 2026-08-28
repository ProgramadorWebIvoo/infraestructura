/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Materiales del proyecto + materiales adicionales del proveedor — una
 * tarjeta por material, no filas de tabla. Reemplaza el acordeón anterior
 * (RowDetailPanel colapsado/auto-expandido): condición, garantía, specs
 * técnicas e imagen quedan SIEMPRE visibles en la tarjeta, sin clics ni
 * paneles que el proveedor pueda pasar por alto — el objetivo es que sea
 * imposible no ver que esos campos existen y son obligatorios.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { AlertCircle, Camera, ChevronDown, Loader2, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import NumericInput from "../../../components/UI/NumericInput";
import Select from "../../../components/UI/Select";
import { RequiredMark, HelpHint } from "../../../components/UI/HintSignals";
import { itemVariants, springs } from "../../../animations";
import { apiFetch, getApiBaseUrl } from "../../../services/api";
import {
  sanitize,
  CONDITION_OPTIONS,
  DURATION_UNITS,
  type CatalogProductSearchResult,
  type ItemRow,
  type PublicCatalogCategory,
} from "../types";

interface MaterialsProposalCardsProps {
  token: string;
  items: ItemRow[];
  onUpdateItem: (index: number, field: keyof ItemRow, value: ItemRow[keyof ItemRow]) => void;
  onUpdateItemSpec: (index: number, specKey: string, value: string | number | boolean) => void;
  onAddCustomItem: () => void;
  onRemoveItem: (index: number) => void;
  categories: PublicCatalogCategory[];
  /** Código de la moneda del pedido (ver OrderCurrencySelector) — todos los montos de esta vista se muestran en esta moneda, nunca fijo en USD. */
  currencyCode: string;
}

/** Valor de duración de garantía cargado pero sin unidad — van juntos o ninguno. */
function isWarrantyDurationIncomplete(item: ItemRow): boolean {
  return Number(item.warrantyValue) > 0 && !item.warrantyUnit;
}

/** Para el badge "Faltan datos" en la fila colapsada — solo molesta si el proveedor ya empezó a cotizar esta línea (precio cargado). */
function isMissingRequiredDetails(item: ItemRow): boolean {
  return Number(item.unitPrice) > 0 && (!item.conditionStatus || !item.warrantyDescription?.trim() || isWarrantyDurationIncomplete(item));
}

/**
 * Para el check verde del RequiredMark del header — a diferencia de
 * isMissingRequiredDetails(), NO es condicional a que haya precio cargado:
 * una línea sin precio nunca está "completa", así que sin esto el check
 * verde aparecía en materiales completamente vacíos (precio 0 hacía que
 * isMissingRequiredDetails() devolviera false por su cortocircuito inicial,
 * lo que se leía como "sin pendientes" en vez de "sin tocar").
 */
function isFullyComplete(item: ItemRow, category: PublicCatalogCategory | undefined): boolean {
  if (!(Number(item.unitPrice) > 0)) return false;
  if (!item.conditionStatus) return false;
  if (!item.warrantyDescription?.trim()) return false;
  if (isWarrantyDurationIncomplete(item)) return false;
  const requiredSpecs = category?.spec_schema?.filter((f) => f.required) ?? [];
  return requiredSpecs.every((f) => {
    const v = item.technicalSpecs?.[f.key];
    return v !== undefined && v !== "" && v !== null;
  });
}

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
  // total (ej. el proveedor recién elige moneda con precios ya cargados) —
  // useTransform no reevalúa su callback solo porque una variable externa
  // capturada por closure cambió, así que sin esto el símbolo quedaría
  // desactualizado hasta el próximo cambio de `value`.
  return <motion.span key={currencyCode}>{rounded}</motion.span>;
}

/** Búsqueda remota de producto de catálogo — solo para materiales personalizados. */
function CatalogProductPicker({ item, onSelect }: { item: ItemRow; onSelect: (product: CatalogProductSearchResult | null) => void }) {
  const [query, setQuery] = useState(item.materialName);
  const [results, setResults] = useState<CatalogProductSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await apiFetch<CatalogProductSearchResult[]>(`/public/catalog-products/search?search=${encodeURIComponent(query.trim())}`);
        setResults(res);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-amber-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (item.catalogProductId) onSelect(null);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="Buscar en catálogo o escribir nombre nuevo *"
          maxLength={220}
          className="w-full rounded-lg border border-amber-200 py-2 pl-8 pr-2.5 text-sm font-bold text-slate-800 outline-hidden transition-shadow duration-150 focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
        />
      </div>
      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={springs.snappy}
            className="absolute z-20 mt-1 w-full max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery(p.name);
                    setIsOpen(false);
                    onSelect(p);
                  }}
                  className="w-full cursor-pointer px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-amber-50"
                >
                  {p.name} <span className="text-slate-400">({p.unit})</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
      {item.catalogProductId && (
        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
          <ShieldCheck className="h-3 w-3" /> Vinculado a catálogo
        </span>
      )}
    </div>
  );
}

/** Subida + preview de imagen del material — opcional, con estado de carga propio. */
function ImageUploader({ token, item, onUploaded }: { token: string; item: ItemRow; onUploaded: (path: string | null) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await apiFetch<{ path: string }>(`/public/invitations/${token}/proposal-image`, { method: "POST", body: form });
      onUploaded(res.path);
    } catch {
      // El toast de error lo maneja el consumidor si hace falta; acá basta con no persistir el path.
    } finally {
      setIsUploading(false);
    }
  };

  const previewUrl = item.imagePath
    ? `${getApiBaseUrl()}/public/invitations/${token}/proposal-image/${item.imagePath.split("/").pop()}`
    : null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        ) : previewUrl ? (
          <img src={previewUrl} alt={item.materialName || "Material"} className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-5 w-5 text-slate-300" />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Camera className="h-3 w-3" />
          {item.imagePath ? "Cambiar imagen" : "Agregar imagen"}
        </button>
        {item.imagePath && (
          <button
            type="button"
            onClick={() => onUploaded(null)}
            className="inline-flex cursor-pointer items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-600"
          >
            <X className="h-3 w-3" /> Quitar
          </button>
        )}
        <span className="text-[9px] text-slate-400">Opcional — JPG, PNG o WEBP, máx. 5MB</span>
      </div>
    </div>
  );
}

function MaterialCard({
  token,
  item,
  index,
  category,
  onUpdateItem,
  onUpdateItemSpec,
  onRemove,
  currencyCode,
}: {
  token: string;
  item: ItemRow;
  index: number;
  category: PublicCatalogCategory | undefined;
  onUpdateItem: MaterialsProposalCardsProps["onUpdateItem"];
  onUpdateItemSpec: MaterialsProposalCardsProps["onUpdateItemSpec"];
  onRemove?: () => void;
  currencyCode: string;
}) {
  const missing = isMissingRequiredDetails(item);
  const complete = isFullyComplete(item, category);
  // Colapsada por defecto: con muchos materiales, todo expandido a la vez
  // es una pared de campos — el RequiredMark en el header ya deja ver de
  // un vistazo cuáles faltan completar, sin necesidad de abrirlas todas.
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`overflow-hidden rounded-2xl border transition-colors duration-200 ${
        item.isCustom ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-white"
      } ${missing ? "ring-2 ring-red-200" : ""}`}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 p-5 text-left"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <RequiredMark filled={complete} className="shrink-0" />
          <div className="min-w-0 flex-1">
            {item.isCustom && !isExpanded ? (
              <h4 className="truncate text-sm font-black text-slate-800">{item.materialName || "Material personalizado (sin nombre)"}</h4>
            ) : item.isCustom ? (
              <div onClick={(e) => e.stopPropagation()}>
                <CatalogProductPicker
                  item={item}
                  onSelect={(product) => {
                    onUpdateItem(index, "catalogProductId", product?.id as ItemRow["catalogProductId"]);
                    if (product) {
                      onUpdateItem(index, "materialName", product.name);
                      onUpdateItem(index, "unit", product.unit);
                      onUpdateItem(index, "categoryId", product.category_id as ItemRow["categoryId"]);
                    } else {
                      onUpdateItem(index, "materialName", "");
                    }
                  }}
                />
              </div>
            ) : (
              <h4 className="truncate text-sm font-black text-slate-800">{item.materialName}</h4>
            )}
            <div className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
              <span>
                {item.quantity} {item.unit}
              </span>
              {item.totalPrice > 0 && (
                <span className="font-mono font-bold text-sky-600">
                  {currencyCode} {item.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              )}
              {missing && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-red-600">
                  <AlertCircle className="h-2.5 w-2.5" /> Faltan datos
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onRemove && (
            <motion.span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="cursor-pointer rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
              aria-label="Eliminar material"
            >
              <Trash2 className="h-4 w-4" />
            </motion.span>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="border-t border-slate-100 px-5 pb-5 pt-4">
              {/* Fila 1: cantidad/unidad/precio/total */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Cantidad</label>
                  {item.isCustom ? (
                    <NumericInput value={item.quantity === 0 ? "" : item.quantity} onChange={(v) => onUpdateItem(index, "quantity", v)} placeholder="0" />
                  ) : (
                    <div className="rounded-control border border-slate-100 bg-slate-50 px-3.5 py-3 font-mono text-sm font-bold text-slate-600">{item.quantity}</div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Unidad</label>
                  {item.isCustom ? (
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => onUpdateItem(index, "unit", sanitize(e.target.value))}
                      placeholder="Und."
                      maxLength={60}
                      className="w-full rounded-control border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-700 outline-hidden focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  ) : (
                    <div className="rounded-control border border-slate-100 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-600">{item.unit}</div>
                  )}
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Precio unitario ({currencyCode}) <RequiredMark filled={Number(item.unitPrice) > 0} />
                  </label>
                  <NumericInput
                    value={item.unitPrice === 0 ? "" : item.unitPrice}
                    onChange={(v) => onUpdateItem(index, "unitPrice", v)}
                    placeholder="0.00"
                    className={Number(item.unitPrice) <= 0 ? "border-red-300" : ""}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</label>
                  <div className="rounded-control border border-slate-100 bg-slate-50 px-3.5 py-3 text-right font-mono text-sm font-black text-sky-700">
                    {item.totalPrice > 0 ? `${currencyCode} ${item.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                  </div>
                </div>
              </div>

              {/* Fila 2: condición/garantía */}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Condición <RequiredMark filled={!!item.conditionStatus} />
                  </label>
                  <Select
                    value={item.conditionStatus ?? ""}
                    onChange={(v) => onUpdateItem(index, "conditionStatus", v as ItemRow["conditionStatus"])}
                    options={[{ value: "", label: "Selecciona una opción..." }, ...CONDITION_OPTIONS]}
                    hasError={!item.conditionStatus}
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Garantía <RequiredMark filled={!!item.warrantyDescription?.trim()} />
                    <HelpHint content="Describa la garantía que ofrece para este material — si no ofrece ninguna, indíquelo explícitamente (ej: 'Sin garantía')." />
                  </label>
                  <input
                    type="text"
                    value={item.warrantyDescription ?? ""}
                    onChange={(e) => onUpdateItem(index, "warrantyDescription", sanitize(e.target.value))}
                    placeholder="Ej: 12 meses de fábrica, sin garantía..."
                    maxLength={255}
                    className={`w-full rounded-control border px-3.5 py-3 text-sm font-medium text-slate-700 outline-hidden focus:border-sky-400 focus:ring-2 focus:ring-sky-100 ${
                      !item.warrantyDescription?.trim() ? "border-red-300" : "border-slate-200"
                    }`}
                  />
                </div>
              </div>

              {/* Duración de la garantía — opcional, valor + unidad juntos */}
              <div className="mt-3 grid grid-cols-2 gap-3 sm:w-1/2 sm:pr-1.5">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Duración de garantía (opcional)</label>
                  <NumericInput
                    value={item.warrantyValue ?? ""}
                    onChange={(v) => onUpdateItem(index, "warrantyValue", v)}
                    placeholder="0"
                    min={0}
                    integer
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Unidad
                    {Number(item.warrantyValue) > 0 && <RequiredMark filled={!!item.warrantyUnit} />}
                  </label>
                  <Select
                    value={item.warrantyUnit ?? ""}
                    onChange={(v) => onUpdateItem(index, "warrantyUnit", v as ItemRow["warrantyUnit"])}
                    options={[{ value: "", label: "—" }, ...DURATION_UNITS.map((u) => ({ value: u.value, label: u.label }))]}
                    hasError={Number(item.warrantyValue) > 0 && !item.warrantyUnit}
                  />
                </div>
              </div>

              {/* Fila 3: notas + imagen */}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Notas (opcional)</label>
                  <input
                    type="text"
                    value={item.notes ?? ""}
                    onChange={(e) => onUpdateItem(index, "notes", sanitize(e.target.value))}
                    placeholder="Marca, plazo de entrega..."
                    maxLength={500}
                    className="w-full rounded-control border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-700 outline-hidden focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Imagen del producto</label>
                  <ImageUploader token={token} item={item} onUploaded={(path) => onUpdateItem(index, "imagePath", path as ItemRow["imagePath"])} />
                </div>
              </div>

              {/* Specs técnicas de la categoría */}
              {category?.spec_schema && category.spec_schema.length > 0 && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <h5 className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Características técnicas — {category.name}
                  </h5>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {category.spec_schema.map((field) => (
                      <div key={field.key}>
                        <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {field.label} {field.unit ? `(${field.unit})` : ""}
                          {field.required && (
                            <RequiredMark
                              filled={
                                item.technicalSpecs?.[field.key] !== undefined &&
                                item.technicalSpecs?.[field.key] !== "" &&
                                item.technicalSpecs?.[field.key] !== null
                              }
                            />
                          )}
                        </label>
                        {field.type === "boolean" ? (
                          <Select
                            value={String(item.technicalSpecs?.[field.key] ?? "")}
                            onChange={(v) => onUpdateItemSpec(index, field.key, v === "true")}
                            options={[
                              { value: "", label: "—" },
                              { value: "true", label: "Sí" },
                              { value: "false", label: "No" },
                            ]}
                            size="sm"
                          />
                        ) : field.type === "number" ? (
                          <NumericInput value={(item.technicalSpecs?.[field.key] as number) ?? ""} onChange={(v) => onUpdateItemSpec(index, field.key, v)} placeholder="0" />
                        ) : (
                          <input
                            type="text"
                            value={(item.technicalSpecs?.[field.key] as string) ?? ""}
                            onChange={(e) => onUpdateItemSpec(index, field.key, sanitize(e.target.value))}
                            maxLength={120}
                            className="w-full rounded-control border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-700 outline-hidden focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function MaterialsProposalCards({
  token,
  items,
  onUpdateItem,
  onUpdateItemSpec,
  onAddCustomItem,
  onRemoveItem,
  categories,
  currencyCode,
}: MaterialsProposalCardsProps) {
  const grandTotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
  const projectItems = items.filter((i) => !i.isCustom);
  const customItems = items.filter((i) => i.isCustom);
  const categoryFor = (item: ItemRow) => categories.find((c) => c.id === item.categoryId);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-white">Materiales requeridos por el proyecto</h3>
        <p className="mt-1 text-xs font-medium text-slate-300">
          Ingrese el precio unitario que puede ofrecer para cada material, en {currencyCode || "la moneda seleccionada"}.
          Condición y garantía son obligatorias para todo material con precio cargado. Puede dejar en 0 los que no provee.
        </p>
      </div>

      <motion.div layout className="space-y-3">
        <AnimatePresence initial={false}>
          {projectItems.map((item) => {
            const index = items.indexOf(item);
            return (
              <MaterialCard
                key={item._id}
                token={token}
                item={item}
                index={index}
                category={categoryFor(item)}
                onUpdateItem={onUpdateItem}
                onUpdateItemSpec={onUpdateItemSpec}
                currencyCode={currencyCode || "—"}
              />
            );
          })}
        </AnimatePresence>
      </motion.div>

      <div className="flex items-center justify-between rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3">
        <span className="text-xs font-black uppercase tracking-wider text-amber-300">Materiales adicionales — agregados por usted</span>
        <motion.button
          type="button"
          onClick={onAddCustomItem}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          transition={springs.snappy}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-white transition-colors hover:bg-amber-600"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar material
        </motion.button>
      </div>

      <motion.div layout className="space-y-3">
        <AnimatePresence initial={false}>
          {customItems.map((item) => {
            const index = items.indexOf(item);
            return (
              <MaterialCard
                key={item._id}
                token={token}
                item={item}
                index={index}
                category={categoryFor(item)}
                onUpdateItem={onUpdateItem}
                onUpdateItemSpec={onUpdateItemSpec}
                onRemove={() => onRemoveItem(index)}
                currencyCode={currencyCode || "—"}
              />
            );
          })}
        </AnimatePresence>
      </motion.div>

      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
        <span className="text-xs font-black uppercase tracking-wider text-slate-300">Total estimado de la propuesta</span>
        <span className="font-mono text-lg font-black text-sky-400">
          <AnimatedTotal value={grandTotal} currencyCode={currencyCode || "—"} />
        </span>
      </div>
    </div>
  );
}
