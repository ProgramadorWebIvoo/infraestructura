/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Una fila de CONFIG APP: label + descripción + input tipado según
 * setting.type. Es un componente controlado puro — no tiene botón de guardado
 * propio ni estado local; el borrador y el guardado (por sección / global,
 * estilo Odoo) los maneja ConfigAppPanel.
 */

import { motion } from "motion/react";
import NumericInput from "@/components/UI/NumericInput";
import TimeInput from "@/components/UI/TimeInput";
import FieldError, { fieldErrorClasses } from "@/components/UI/FieldError";
import RoleMultiSelect from "@/components/UI/RoleMultiSelect";
import { RATE_SWITCH_ROLES_KEY } from "@/hooks/useRateSwitchRoleAllowed";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import type { AppSettingRecord } from "@/hooks/useAppSettings";
import SegmentedControl from "@/components/UI/SegmentedControl";
import { formatRangeBound } from "@/views/ConfigAppPanel/utils";
import { ENUM_SETTING_OPTIONS } from "@/views/ConfigAppPanel/settingOptions";

interface SettingRowProps {
  setting: AppSettingRecord;
  value: string;
  onChange: (id: number, value: string) => void;
  error?: string;
  /** PATCH /settings/{setting} es SUPERADMIN exclusivo — deshabilita los
   *  inputs para cualquier otro rol en vez de dejarlos editar y fallar con 403. */
  readOnly?: boolean;
  /** Roles disponibles para los settings JSON que son listas de roles
   *  (ROLE_LIST_SETTING_KEYS); sin esto caen al textarea JSON crudo. */
  roles?: string[];
}

/** Settings `json` que guardan una lista de roles — se editan con chips en vez de JSON crudo. */
const ROLE_LIST_SETTING_KEYS = new Set<string>([RATE_SWITCH_ROLES_KEY]);

function parseRoleList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((r): r is string => typeof r === "string") : [];
  } catch {
    return [];
  }
}

export default function SettingRow({ setting, value, onChange, error, readOnly, roles }: SettingRowProps) {
  const isNumeric = setting.type === "integer" || setting.type === "float";
  const isRoleList = setting.type === "json" && ROLE_LIST_SETTING_KEYS.has(setting.key) && !!roles?.length;
  const enumOptions = ENUM_SETTING_OPTIONS[setting.key];
  const isCronHour = setting.key === "tasa_cambio_cron_hora" || setting.key === "rating_ia_cron_hora";

  const rangeHint =
    isNumeric && (setting.min_value !== null || setting.max_value !== null)
      ? `Rango permitido: ${setting.min_value !== null ? formatRangeBound(setting.min_value, setting.type) : "–"} a ${setting.max_value !== null ? formatRangeBound(setting.max_value, setting.type) : "–"}`
      : null;

  const errorClasses = fieldErrorClasses(!!error);

  return (
    <div
      id={`setting-row-${setting.id}`}
      className="flex flex-col sm:flex-row sm:items-start gap-3 -mx-3 px-3 py-3.5 rounded-control border-b border-border-subtle last:border-0 transition-colors hover:bg-surface-sunken"
    >
      <div className="sm:w-64 shrink-0">
        <p className="text-sm font-bold text-text-secondary">{setting.label}</p>
        {setting.description && <p className="text-xs text-text-muted mt-0.5">{setting.description}</p>}
        {rangeHint && <p className="text-[10px] text-text-muted mt-0.5">{rangeHint}</p>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {setting.type === "boolean" ? (
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <motion.input
                type="checkbox"
                checked={value === "true"}
                onChange={e => onChange(setting.id, e.target.checked ? "true" : "false")}
                disabled={readOnly}
                whileTap={{ scale: 0.85 }}
                className={`h-4 w-4 rounded border-border-default ${SEMANTIC_COLOR_MAP.brand.text600} focus:ring-brand-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              <span className="text-xs text-text-tertiary">{value === "true" ? "Activado" : "Desactivado"}</span>
            </label>
          ) : enumOptions ? (
            // Opción única (radio): solo valores válidos. Sin permiso de edición, se muestra pero no responde.
            <div className={`flex-1 min-w-0 ${readOnly ? "pointer-events-none opacity-60" : ""}`} aria-disabled={readOnly || undefined}>
              <SegmentedControl
                variant="card"
                options={enumOptions}
                value={value}
                onChange={next => onChange(setting.id, next)}
                ariaLabel={setting.label}
              />
            </div>
          ) : isRoleList ? (
            <RoleMultiSelect
              roles={roles ?? []}
              value={parseRoleList(value)}
              onChange={next => onChange(setting.id, JSON.stringify(next))}
              disabled={readOnly}
              className="flex-1 min-w-0"
            />
          ) : setting.type === "json" ? (
            <textarea
              value={value}
              onChange={e => onChange(setting.id, e.target.value)}
              rows={2}
              disabled={readOnly}
              className={`flex-1 min-w-0 text-xs font-mono px-3 py-2 rounded-control border border-border-default focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${errorClasses}`}
            />
          ) : isCronHour ? (
            <TimeInput
              id={`setting-${setting.id}-time`}
              value={value}
              onChange={v => onChange(setting.id, v)}
              accent="brand"
              size="sm"
              hasError={!!error}
              ariaLabel={setting.label}
              className="w-32"
              disabled={readOnly}
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
              disabled={readOnly}
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={e => onChange(setting.id, e.target.value)}
              disabled={readOnly}
              className={`flex-1 min-w-0 text-sm px-3 py-1.5 rounded-control border border-border-default focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${errorClasses}`}
            />
          )}
        </div>
        <FieldError message={error} />
      </div>
    </div>
  );
}
