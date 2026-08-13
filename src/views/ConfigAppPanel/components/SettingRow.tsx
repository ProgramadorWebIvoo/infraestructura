/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Una fila de CONFIG APP: label + descripción + input tipado según
 * setting.type. Es un componente controlado puro — no tiene botón de guardado
 * propio ni estado local; el borrador y el guardado (por sección / global,
 * estilo Odoo) los maneja ConfigAppPanel.
 */

import NumericInput from "../../../components/UI/NumericInput";
import FieldError, { fieldErrorClasses } from "../../../components/UI/FieldError";
import TagMultiSelect from "../../../components/UI/TagMultiSelect";
import type { AppSettingRecord } from "../../../hooks/useAppSettings";

/** Settings `json` que son en realidad listas de acciones auditadas — se
 *  editan con el selector de tags (catálogo real) en vez del textarea JSON
 *  crudo genérico. */
const ACTION_LIST_KEYS = new Set(["acciones_con_correo", "acciones_con_notificacion_app"]);

function parseActionList(value: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

interface SettingRowProps {
  setting: AppSettingRecord;
  value: string;
  onChange: (id: number, value: string) => void;
  error?: string;
  /** Catálogo real de acciones auditadas — requerido para renderizar el selector de tags de los settings de ACTION_LIST_KEYS. */
  notificationActionsCatalog?: string[];
}

export default function SettingRow({ setting, value, onChange, error, notificationActionsCatalog }: SettingRowProps) {
  const isNumeric = setting.type === "integer" || setting.type === "float";
  const isActionList = setting.type === "json" && ACTION_LIST_KEYS.has(setting.key) && !!notificationActionsCatalog;

  const rangeHint =
    isNumeric && (setting.min_value !== null || setting.max_value !== null)
      ? `Rango permitido: ${setting.min_value ?? "–"} a ${setting.max_value ?? "–"}`
      : null;

  const errorClasses = fieldErrorClasses(!!error);

  return (
    <div
      id={`setting-row-${setting.id}`}
      className="flex flex-col sm:flex-row sm:items-start gap-3 py-3.5 border-b border-slate-100 last:border-0"
    >
      <div className="sm:w-64 shrink-0">
        <p className="text-sm font-bold text-slate-700">{setting.label}</p>
        {setting.description && <p className="text-xs text-slate-400 mt-0.5">{setting.description}</p>}
        {rangeHint && <p className="text-[11px] text-slate-400 mt-0.5">{rangeHint}</p>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {setting.type === "boolean" ? (
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={value === "true"}
                onChange={e => onChange(setting.id, e.target.checked ? "true" : "false")}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400 cursor-pointer"
              />
              <span className="text-xs text-slate-500">{value === "true" ? "Activado" : "Desactivado"}</span>
            </label>
          ) : isActionList ? (
            <TagMultiSelect
              options={notificationActionsCatalog!}
              value={parseActionList(value)}
              onChange={next => onChange(setting.id, JSON.stringify(next))}
            />
          ) : setting.type === "json" ? (
            <textarea
              value={value}
              onChange={e => onChange(setting.id, e.target.value)}
              rows={2}
              className={`flex-1 min-w-0 text-xs font-mono px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none ${errorClasses}`}
            />
          ) : isNumeric ? (
            <NumericInput
              value={value === "" ? "" : Number(value)}
              onChange={v => onChange(setting.id, v === "" ? "" : String(v))}
              integer={setting.type === "integer"}
              min={setting.min_value ?? 0}
              max={setting.max_value ?? undefined}
              allowNegative={(setting.min_value ?? 0) < 0}
              className={`flex-1 min-w-0 py-1.5! text-sm! ${errorClasses}`}
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={e => onChange(setting.id, e.target.value)}
              className={`flex-1 min-w-0 text-sm px-3 py-1.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none ${errorClasses}`}
            />
          )}
        </div>
        <FieldError message={error} />
      </div>
    </div>
  );
}
