/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fila del Storage Inspector: clave + tamaño, "Ver" (valor sanitizado, leído
 * de forma perezosa), "Editar" (solo storage, nunca claves sensibles ni
 * valores enormes) y "Eliminar" con confirmación en dos pasos — el aviso
 * cambia si la clave es especial (ver PROTECTED_KEY_WARNINGS).
 */

import { useState } from "react";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { pushDebugEntry } from "@/stores/debugStore";
import {
  readDisplayValue,
  readEditableValue,
  removeStorageKey,
  writeStorageValue,
  type StorageArea,
  type StorageRow,
} from "@/utils/debugStorage";

interface DebugStorageRowProps {
  area: StorageArea;
  row: StorageRow;
  /** Se llama tras editar/eliminar para que la lista se relea. */
  onChanged: () => void;
}

const ACTION_BTN = "flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer";

export default function DebugStorageRow({ area, row, onChanged }: DebugStorageRowProps) {
  const [shown, setShown] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const danger = SEMANTIC_COLOR_MAP.danger;
  const warning = SEMANTIC_COLOR_MAP.warning;

  const canEdit = area !== "cookie" && !row.sensitive && !row.tooLarge;

  // No se registra el VALOR: solo qué se hizo y sobre qué clave.
  const logAction = (action: string) =>
    pushDebugEntry({ kind: "log", level: "info", category: "USER_ACTION", label: `Storage ${action}: ${area}/${row.key}`, detail: { area, key: row.key } });

  const toggleView = () => setShown(current => (current === null ? readDisplayValue(area, row.key) ?? "(vacío)" : null));

  const startEdit = () => {
    if (area === "cookie") return;
    setDraft(readEditableValue(area, row.key) ?? "");
    setError(null);
  };

  const saveEdit = () => {
    if (draft === null || area === "cookie") return;
    try {
      writeStorageValue(area, row.key, draft);
      logAction("editado");
      setDraft(null);
      setShown(null);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar (¿cuota llena?).");
    }
  };

  const confirmDelete = () => {
    removeStorageKey(area, row.key);
    logAction("eliminado");
    setConfirmingDelete(false);
    onChanged();
  };

  return (
    <li className="rounded-control border border-border-default bg-white px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] font-bold text-text-primary" title={row.key}>{row.key}</span>
        <span className="shrink-0 font-mono text-[10px] text-text-tertiary">{row.length.toLocaleString("es-VE")} c</span>
        {row.sensitive && (
          <span className={`shrink-0 rounded-pill px-1.5 py-0.5 text-[9px] font-black uppercase ${danger.bg100} ${danger.text700}`}>sensible</span>
        )}
      </div>

      <div className="mt-1 flex items-center gap-3">
        <button type="button" onClick={toggleView} className={ACTION_BTN}>
          {shown === null ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          {shown === null ? "Ver" : "Ocultar"}
        </button>
        {canEdit && (
          <button type="button" onClick={startEdit} className={ACTION_BTN}>
            <Pencil className="h-3 w-3" /> Editar
          </button>
        )}
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="flex items-center gap-1 text-[10px] font-bold text-danger-600 hover:text-danger-700 cursor-pointer"
        >
          <Trash2 className="h-3 w-3" /> Eliminar
        </button>
      </div>

      {shown !== null && (
        <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-control bg-slate-50 p-2 text-[10px] text-slate-600">{shown}</pre>
      )}

      {draft !== null && (
        <div className="mt-1.5 space-y-1.5">
          {row.warning && (
            <p className={`rounded-control px-2 py-1 text-[10px] font-bold ${warning.bg50} ${warning.text700}`}>{row.warning}</p>
          )}
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            aria-label={`Valor de ${row.key}`}
            rows={4}
            className="w-full rounded-control border border-border-default bg-white p-2 font-mono text-[10px]"
          />
          {error && <p className="text-[10px] font-bold text-danger-600">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={saveEdit} className={ACTION_BTN}>Guardar</button>
            <button type="button" onClick={() => setDraft(null)} className={ACTION_BTN}>Cancelar</button>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <div className={`mt-1.5 space-y-1.5 rounded-control p-2 ${danger.bg50}`}>
          <p className={`text-[10px] font-bold ${danger.text700}`}>
            ¿Eliminar «{row.key}»? {row.warning ?? "No se puede deshacer."}
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={confirmDelete} className="text-[10px] font-black text-danger-700 cursor-pointer">Sí, eliminar</button>
            <button type="button" onClick={() => setConfirmingDelete(false)} className={ACTION_BTN}>Cancelar</button>
          </div>
        </div>
      )}
    </li>
  );
}
