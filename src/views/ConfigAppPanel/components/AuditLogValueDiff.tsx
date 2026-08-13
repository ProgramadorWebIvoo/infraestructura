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
 * contra `["a","c"]` a simple vista.
 */

function tryParseArray(value: string | null): string[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every(v => typeof v === "string") ? parsed : null;
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
      return <p className="text-[10px] text-slate-400 italic">Sin cambios en la lista.</p>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {removed.map(tag => (
          <span key={`removed-${tag}`} className="px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-500 text-[10px] font-semibold line-through">
            {tag}
          </span>
        ))}
        {added.map(tag => (
          <span key={`added-${tag}`} className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-semibold">
            + {tag}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-mono">
      <span className="text-rose-500 line-through break-all">{oldValue ?? "—"}</span>
      <span className="text-slate-300 shrink-0">→</span>
      <span className="text-emerald-600 font-bold break-all">{newValue ?? "—"}</span>
    </div>
  );
}
