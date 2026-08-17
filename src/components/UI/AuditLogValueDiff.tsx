/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Muestra el cambio de valor de una entrada de auditoría. Los settings
 * escalares (string/number/boolean) se muestran como "viejo → nuevo" en una
 * línea, con wrap en vez de truncar — antes un `max-w-[100px] truncate`
 * cortaba silenciosamente cualquier valor largo (ej. razón social) sin forma
 * de leerlo completo. Los settings `json` (listas de acciones vía
 * TagMultiSelect) se muestran como un diff de tags añadidos/quitados en vez
 * de dos strings JSON crudos, mucho más legible que comparar `["a","b"]`
 * contra `["a","c"]` a simple vista. Igual criterio para acciones que auditan
 * un objeto completo (ej. ConfigAuditLog::recordAdminAction en
 * CurrencyController) — en vez de mostrar el JSON crudo tachado/nuevo
 * (`{"name":"Euro","symbol":"€","is_active":false}` línea por línea), se
 * muestra solo los campos que realmente cambiaron, con su label.
 */

import { SEMANTIC_COLOR_MAP } from "./colorTokens";

const danger = SEMANTIC_COLOR_MAP.danger;
const success = SEMANTIC_COLOR_MAP.success;

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre",
  symbol: "Símbolo",
  is_active: "Estado",
  is_base: "Moneda base",
};

/** Campos que identifican de forma estable el registro auditado (no cambian
 *  entre before/after) — se muestran como contexto arriba del diff en vez de
 *  como una fila de campo cambiado. */
const IDENTIFIER_KEYS = new Set(["code"]);

function formatFieldValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Activo" : "Inactivo";
  if (value === null || value === undefined) return "—";
  return String(value);
}

function tryParseArray(value: string | null): string[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every(v => typeof v === "string") ? parsed : null;
  } catch {
    return null;
  }
}

function tryParseObject(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

interface AuditLogValueDiffProps {
  oldValue: string | null;
  newValue: string | null;
}

export default function AuditLogValueDiff({ oldValue, newValue }: AuditLogValueDiffProps) {
  const oldList = tryParseArray(oldValue);
  const newList = tryParseArray(newValue);

  if (oldList !== null || newList !== null) {
    const before = oldList ?? [];
    const after = newList ?? [];
    const added = after.filter(v => !before.includes(v));
    const removed = before.filter(v => !after.includes(v));

    if (added.length === 0 && removed.length === 0) {
      return <p className="text-[10px] text-text-muted italic">Sin cambios en la lista.</p>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {removed.map(tag => (
          <span key={`removed-${tag}`} className={`px-1.5 py-0.5 rounded-pill ${danger.bg50} ${danger.text600} text-[10px] font-semibold line-through`}>
            {tag}
          </span>
        ))}
        {added.map(tag => (
          <span key={`added-${tag}`} className={`px-1.5 py-0.5 rounded-pill ${success.bg50} ${success.text700} text-[10px] font-semibold`}>
            + {tag}
          </span>
        ))}
      </div>
    );
  }

  const oldObject = tryParseObject(oldValue);
  const newObject = tryParseObject(newValue);

  if (oldObject !== null || newObject !== null) {
    const before = oldObject ?? {};
    const after = newObject ?? {};
    const identifier = [...Object.keys(before), ...Object.keys(after)]
      .filter(key => IDENTIFIER_KEYS.has(key))
      .map(key => after[key] ?? before[key])
      .find(value => value !== undefined);
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter(
      key => !IDENTIFIER_KEYS.has(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]),
    );

    if (keys.length === 0) {
      return <p className="text-[10px] text-text-muted italic">Sin cambios.</p>;
    }

    return (
      <div className="space-y-0.5">
        {identifier !== undefined && (
          <p className="font-mono text-[10px] font-bold text-text-tertiary">{formatFieldValue(identifier)}</p>
        )}
        {keys.map(key => (
          <div key={key} className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px]">
            <span className="font-bold text-text-tertiary shrink-0">{FIELD_LABELS[key] ?? key}:</span>
            <span className={`font-mono ${danger.text600} line-through break-all`}>{formatFieldValue(before[key])}</span>
            <span className="text-text-muted shrink-0">→</span>
            <span className={`font-mono ${success.text700} font-bold break-all`}>{formatFieldValue(after[key])}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-mono">
      <span className={`${danger.text600} line-through break-all`}>{oldValue ?? "—"}</span>
      <span className="text-text-muted shrink-0">→</span>
      <span className={`${success.text700} font-bold break-all`}>{newValue ?? "—"}</span>
    </div>
  );
}
