/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Estado de completitud de cada línea del portal público de cotización.
 * Una línea sin precio es "sin cotizar" (el proveedor decidió no ofertarla);
 * con precio, debe traer condición y garantía (y las specs requeridas de su
 * categoría) para estar "completa".
 */

import type { ItemRow, PublicCatalogCategory } from "./types";

export type ItemStatus = "unpriced" | "missing" | "complete";

/**
 * Valor de duración de garantía cargado pero sin unidad — van juntos o
 * ninguno. `warrantyValue !== ""` (no `> 0`): el backend exige la unidad
 * ante cualquier valor "presente", incluido un 0 explícito.
 */
export function isWarrantyDurationIncomplete(item: ItemRow): boolean {
  return item.warrantyValue !== "" && item.warrantyValue !== undefined && !item.warrantyUnit;
}

export function isPriced(item: ItemRow): boolean {
  return Number(item.unitPrice) > 0;
}

/** Specs técnicas obligatorias de la categoría que aún no tienen valor. */
function hasMissingRequiredSpecs(item: ItemRow, category: PublicCatalogCategory | undefined): boolean {
  const required = category?.spec_schema?.filter((f) => f.required) ?? [];
  return required.some((f) => {
    const v = item.technicalSpecs?.[f.key];
    return v === undefined || v === "" || v === null;
  });
}

/**
 * - `unpriced`: sin precio — nunca se considera completa ni con faltantes
 *   (así un material sin tocar no se ve como "listo").
 * - `missing`: con precio, pero sin condición/garantía/unidad de duración o
 *   sin alguna spec requerida.
 * - `complete`: con precio y todo lo obligatorio cargado.
 */
export function getItemStatus(item: ItemRow, category: PublicCatalogCategory | undefined): ItemStatus {
  if (!isPriced(item)) return "unpriced";
  if (!item.conditionStatus || !item.warrantyDescription?.trim() || isWarrantyDurationIncomplete(item) || hasMissingRequiredSpecs(item, category)) {
    return "missing";
  }
  return "complete";
}
