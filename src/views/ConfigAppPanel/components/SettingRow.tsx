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
import type { AppSettingRecord } from "../../../hooks/useAppSettings";

interface SettingRowProps {
  setting: AppSettingRecord;
  value: string;
  onChange: (id: number, value: string) => void;
}

export default function SettingRow({ setting, value, onChange }: SettingRowProps) {
  const isNumeric = setting.type === "integer" || setting.type === "float";

  const rangeHint =
    isNumeric && (setting.min_value !== null || setting.max_value !== null)
      ? `Rango permitido: ${setting.min_value ?? "–"} a ${setting.max_value ?? "–"}`
      : null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3.5 border-b border-slate-100 last:border-0">
      <div className="sm:w-64 shrink-0">
        <p className="text-sm font-bold text-slate-700">{setting.label}</p>
        {setting.description && <p className="text-xs text-slate-400 mt-0.5">{setting.description}</p>}
        {rangeHint && <p className="text-[11px] text-slate-400 mt-0.5">{rangeHint}</p>}
      </div>

      <div className="flex-1 flex items-center gap-2 min-w-0">
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
        ) : setting.type === "json" ? (
          <textarea
            value={value}
            onChange={e => onChange(setting.id, e.target.value)}
            rows={2}
            className="flex-1 min-w-0 text-xs font-mono px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none"
          />
        ) : isNumeric ? (
          <NumericInput
            value={value === "" ? "" : Number(value)}
            onChange={v => onChange(setting.id, v === "" ? "" : String(v))}
            integer={setting.type === "integer"}
            min={setting.min_value ?? 0}
            max={setting.max_value ?? undefined}
            allowNegative={(setting.min_value ?? 0) < 0}
            className="flex-1 min-w-0 py-1.5! text-sm!"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={e => onChange(setting.id, e.target.value)}
            className="flex-1 min-w-0 text-sm px-3 py-1.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none"
          />
        )}
      </div>
    </div>
  );
}
