/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de detalle de UNA línea del portal público de cotización: condición y
 * garantía (obligatorias con precio), duración de garantía, notas, imagen y
 * specs técnicas de la categoría. La tabla muestra solo lo esencial por fila
 * (nombre, cantidad, precio, estado) para que 70 materiales no sean una pared
 * de campos; lo demás se completa aquí, con navegación entre líneas.
 */

import { ChevronLeft, ChevronRight, ListChecks, Trash2 } from "lucide-react";
import Modal from "@/components/UI/Modal";
import NumericInput from "@/components/UI/NumericInput";
import Select from "@/components/UI/Select";
import { RequiredMark, HelpHint } from "@/components/UI/HintSignals";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { sanitize, CONDITION_OPTIONS, DURATION_UNITS, type ItemRow, type PublicCatalogCategory } from "@/views/PropuestaMaterialesPublica/types";
import { isWarrantyDurationIncomplete } from "@/views/PropuestaMaterialesPublica/itemStatus";
import CatalogProductPicker from "./CatalogProductPicker";
import ImageUploader from "./ImageUploader";

interface MaterialDetailPanelProps {
  token: string;
  items: ItemRow[];
  /** Índice (en `items`) de la línea que se edita. */
  index: number;
  category: PublicCategory;
  currencyCode: string;
  /** Hay otras líneas con datos obligatorios pendientes (habilita "Siguiente pendiente"). */
  hasPending: boolean;
  onUpdateItem: (index: number, field: keyof ItemRow, value: ItemRow[keyof ItemRow]) => void;
  onUpdateItemSpec: (index: number, specKey: string, value: string | number | boolean) => void;
  onNavigate: (index: number) => void;
  onNextPending: () => void;
  onRemove: (index: number) => void;
  onClose: () => void;
}

type PublicCategory = PublicCatalogCategory | undefined;

const labelClass = "mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted";
const textInputClass = "w-full rounded-control border border-border-default px-3.5 py-2.5 text-sm font-medium text-text-primary outline-hidden focus:border-info-400 focus:ring-1 focus:ring-info-100";
const dangerBorder = `border-${SEMANTIC_COLOR_MAP.danger.border200.split("-").pop()}`;

export default function MaterialDetailPanel({
  token,
  items,
  index,
  category,
  currencyCode,
  hasPending,
  onUpdateItem,
  onUpdateItemSpec,
  onNavigate,
  onNextPending,
  onRemove,
  onClose,
}: MaterialDetailPanelProps) {
  const item = items[index];
  if (!item) return null;

  const total = item.totalPrice > 0 ? `${currencyCode} ${item.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—";

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="max-w-3xl"
      iconColor="sky"
      badge={`Material ${index + 1} de ${items.length}`}
      title={item.materialName || "Material personalizado"}
      infoLine={item.isCustom ? "Material adicional agregado por usted" : "Material solicitado por el proyecto"}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onNavigate(index - 1)}
              disabled={index === 0}
              className="inline-flex cursor-pointer items-center gap-1 rounded-control border border-border-default px-3 py-2 text-[11px] font-bold text-text-primary transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <button
              type="button"
              onClick={() => onNavigate(index + 1)}
              disabled={index >= items.length - 1}
              className="inline-flex cursor-pointer items-center gap-1 rounded-control border border-border-default px-3 py-2 text-[11px] font-bold text-text-primary transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente <ChevronRight className="h-3.5 w-3.5" />
            </button>
            {hasPending && (
              <button
                type="button"
                onClick={onNextPending}
                className="inline-flex cursor-pointer items-center gap-1 rounded-control border border-danger-200 bg-danger-50 px-3 py-2 text-[11px] font-bold text-danger-700 transition-colors hover:bg-danger-100"
              >
                <ListChecks className="h-3.5 w-3.5" /> Siguiente con datos faltantes
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {item.isCustom && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-control px-3 py-2 text-[11px] font-bold text-danger-600 transition-colors hover:bg-danger-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-control bg-brand-500 px-4 py-2 text-[11px] font-black text-white transition-colors hover:bg-brand-600"
            >
              Listo
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {item.isCustom && (
          <div>
            <label className={labelClass}>
              Producto <RequiredMark filled={item.materialName.trim() !== ""} />
            </label>
            <CatalogProductPicker
              item={item}
              onQueryChange={(query) => onUpdateItem(index, "materialName", sanitize(query))}
              onSelect={(product) => {
                onUpdateItem(index, "catalogProductId", product?.id as ItemRow["catalogProductId"]);
                if (product) {
                  onUpdateItem(index, "materialName", product.name);
                  onUpdateItem(index, "unit", product.unit);
                  onUpdateItem(index, "categoryId", product.category_id as ItemRow["categoryId"]);
                } else {
                  onUpdateItem(index, "categoryId", null);
                }
              }}
            />
          </div>
        )}

        {/* Cantidad / unidad / precio / total */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className={labelClass}>Cantidad</label>
            {item.isCustom ? (
              <NumericInput value={item.quantity === 0 ? "" : item.quantity} onChange={(v) => onUpdateItem(index, "quantity", v)} placeholder="0" />
            ) : (
              <div className="rounded-control border border-border-subtle bg-surface-sunken px-3.5 py-2.5 font-mono text-sm font-bold text-text-primary">{item.quantity}</div>
            )}
          </div>
          <div>
            <label className={labelClass}>Unidad</label>
            {item.isCustom ? (
              <input type="text" value={item.unit} onChange={(e) => onUpdateItem(index, "unit", sanitize(e.target.value))} placeholder="Und." maxLength={60} className={textInputClass} />
            ) : (
              <div className="rounded-control border border-border-subtle bg-surface-sunken px-3.5 py-2.5 text-sm font-medium text-text-primary">{item.unit}</div>
            )}
          </div>
          <div>
            <label className={labelClass}>
              Precio unitario ({currencyCode || "—"}) <RequiredMark filled={Number(item.unitPrice) > 0} />
            </label>
            <NumericInput
              thousands
              value={item.unitPrice === 0 ? "" : item.unitPrice}
              onChange={(v) => onUpdateItem(index, "unitPrice", v)}
              placeholder="0.00"
              className={Number(item.unitPrice) <= 0 ? dangerBorder : ""}
            />
          </div>
          <div>
            <label className={labelClass}>Total</label>
            <div className="rounded-control border border-border-subtle bg-surface-sunken px-3.5 py-2.5 text-right font-mono text-sm font-black text-text-primary">{total}</div>
          </div>
        </div>

        {/* Condición / garantía */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
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
            <label className={labelClass}>
              Garantía <RequiredMark filled={!!item.warrantyDescription?.trim()} />
              <HelpHint content="Describa la garantía que ofrece para este material — si no ofrece ninguna, indíquelo explícitamente (ej: 'Sin garantía')." />
            </label>
            <input
              type="text"
              value={item.warrantyDescription ?? ""}
              onChange={(e) => onUpdateItem(index, "warrantyDescription", sanitize(e.target.value))}
              placeholder="Ej: 12 meses de fábrica, sin garantía..."
              maxLength={255}
              className={`${textInputClass} ${!item.warrantyDescription?.trim() ? dangerBorder : ""}`}
            />
          </div>
        </div>

        {/* Duración de la garantía — opcional, valor + unidad juntos */}
        <div className="grid grid-cols-2 gap-3 sm:w-1/2 sm:pr-1.5">
          <div>
            <label className={labelClass}>Duración de garantía (opcional)</label>
            <NumericInput value={item.warrantyValue ?? ""} onChange={(v) => onUpdateItem(index, "warrantyValue", v)} placeholder="0" min={0} integer />
          </div>
          <div>
            <label className={labelClass}>
              Unidad
              {item.warrantyValue !== "" && item.warrantyValue !== undefined && <RequiredMark filled={!!item.warrantyUnit} />}
            </label>
            <Select
              value={item.warrantyUnit ?? ""}
              onChange={(v) => onUpdateItem(index, "warrantyUnit", v as ItemRow["warrantyUnit"])}
              options={[{ value: "", label: "—" }, ...DURATION_UNITS.map((u) => ({ value: u.value, label: u.label }))]}
              hasError={isWarrantyDurationIncomplete(item)}
            />
          </div>
        </div>

        {/* Notas + imagen */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Notas (opcional)</label>
            <input
              type="text"
              value={item.notes ?? ""}
              onChange={(e) => onUpdateItem(index, "notes", sanitize(e.target.value))}
              placeholder="Marca, plazo de entrega..."
              maxLength={500}
              className={textInputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Imagen del producto</label>
            <ImageUploader token={token} item={item} onUploaded={(path) => onUpdateItem(index, "imagePath", path as ItemRow["imagePath"])} />
          </div>
        </div>

        {/* Specs técnicas de la categoría */}
        {category?.spec_schema && category.spec_schema.length > 0 && (
          <div className="border-t border-border-subtle pt-4">
            <h5 className="mb-3 text-[10px] font-black uppercase tracking-wider text-text-muted">Características técnicas — {category.name}</h5>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {category.spec_schema.map((field) => {
                const value = item.technicalSpecs?.[field.key];
                return (
                  <div key={field.key}>
                    <label className={labelClass}>
                      {field.label} {field.unit ? `(${field.unit})` : ""}
                      {field.required && <RequiredMark filled={value !== undefined && value !== "" && value !== null} />}
                    </label>
                    {field.type === "boolean" ? (
                      <Select
                        value={String(value ?? "")}
                        onChange={(v) => onUpdateItemSpec(index, field.key, v === "true")}
                        options={[
                          { value: "", label: "—" },
                          { value: "true", label: "Sí" },
                          { value: "false", label: "No" },
                        ]}
                        size="sm"
                      />
                    ) : field.type === "number" ? (
                      <NumericInput value={(value as number) ?? ""} onChange={(v) => onUpdateItemSpec(index, field.key, v)} placeholder="0" />
                    ) : (
                      <input
                        type="text"
                        value={(value as string) ?? ""}
                        onChange={(e) => onUpdateItemSpec(index, field.key, sanitize(e.target.value))}
                        maxLength={120}
                        className={textInputClass}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
