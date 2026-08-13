/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Funciones puras de comparación/formato usadas por ConfigAppPanel y sus
 * componentes — extraídas del contenedor para que no vivan mezcladas con
 * lógica de estado y JSX.
 */

import type { AppSettingRecord } from "../../hooks/useAppSettings";
import type { NotificationRuleChannels } from "../../hooks/useNotificationRules";

/**
 * Compara el valor en borrador contra el original para decidir si un
 * setting está "dirty". Para `json` (hoy: listas de acciones vía
 * TagMultiSelect) no alcanza con comparar el string crudo: togglear un tag
 * fuera y volver a seleccionarlo lo reinserta al final del array, cambiando
 * el orden serializado aunque el conjunto de valores sea idéntico — eso
 * disparaba falsamente la barra de "cambios pendientes". Se comparan como
 * conjuntos ordenados en vez de string a string.
 */
export function isDirtySettingValue(type: AppSettingRecord["type"], draftValue: string, originalValue: string): boolean {
  if (type !== "json") return draftValue !== originalValue;

  try {
    const a = JSON.parse(draftValue || "[]");
    const b = JSON.parse(originalValue || "[]");
    if (!Array.isArray(a) || !Array.isArray(b)) return draftValue !== originalValue;
    if (a.length !== b.length) return true;
    return [...a].sort().join(" ") !== [...b].sort().join(" ");
  } catch {
    return draftValue !== originalValue;
  }
}

function sameRoles(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return [...a].sort().join(",") === [...b].sort().join(",");
}

export function isDirtyRuleValue(draft: NotificationRuleChannels, saved: NotificationRuleChannels, _action?: string): boolean {
  return !sameRoles(draft.app, saved.app) || !sameRoles(draft.mail, saved.mail);
}

/**
 * `min_value`/`max_value` se guardan como DECIMAL(10,2) en BD (para admitir
 * settings `float` como la inflación de referencia) — para settings
 * `integer` eso se veía como "0.00 a 100.00" en vez de "0 a 100". Se
 * formatea según el `type` del propio setting en vez de interpolar el
 * número crudo.
 */
export function formatRangeBound(value: number, type: AppSettingRecord["type"]): string {
  return type === "integer" ? String(Math.round(value)) : String(value);
}
