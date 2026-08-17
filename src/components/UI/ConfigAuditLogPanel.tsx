/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Especialización de AuditLogPanel para ConfigAuditLogRecord: resuelve el
 * título de cada entrada y arma su render sin que cada vista consumidora
 * (ConfigAppPanel, AIConfigPanel, y las próximas: proveedores, materiales)
 * tenga que reimplementar entryTitle()/renderEntry() por su cuenta — antes
 * cada vista duplicaba esa lógica de presentación, cuando el único dato
 * externo que realmente varía es `settingLabelByKey` (solo aplica a
 * entidades entityType: "setting"; el resto de vistas simplemente no lo pasan).
 */

import AuditLogPanel from "./AuditLogPanel";
import AuditLogValueDiff from "./AuditLogValueDiff";
import type { ConfigAuditLogRecord } from "../../hooks/useConfigAuditLogs";

interface ConfigAuditLogPanelProps {
  title?: string;
  logs: ConfigAuditLogRecord[];
  isLoading: boolean;
  /** Label legible por key de setting — solo relevante para entradas entityType: "setting" (CONFIG APP). Se omite en vistas sin settings propios (ej. config de IA). */
  settingLabelByKey?: Record<string, string>;
  searchPlaceholder?: string;
  emptyMessage?: string;
  pagination?: {
    page: number;
    lastPage: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

/**
 * Título de una entrada: para cambios de CONFIG APP (`entityType: "setting"`)
 * usa el label legible del catálogo si está disponible; para el resto de
 * acciones administrativas (usuarios, proveedores, materiales, IA, monedas,
 * matriz de notificaciones) `settingKey` viene null — el texto legible ahí
 * es `action` (ej. "Modificación de moneda"), no la key.
 */
function entryTitle(log: ConfigAuditLogRecord, settingLabelByKey: Record<string, string>): string {
  return log.entityType === "setting"
    ? (settingLabelByKey[log.settingKey ?? ""] ?? log.settingKey ?? log.action)
    : log.action;
}

export default function ConfigAuditLogPanel({
  title = "Historial de cambios",
  logs,
  isLoading,
  settingLabelByKey = {},
  searchPlaceholder = "Buscar por parámetro, usuario o valor...",
  emptyMessage = "Todavía no se ha modificado ningún parámetro.",
  pagination,
}: ConfigAuditLogPanelProps) {
  return (
    <AuditLogPanel<ConfigAuditLogRecord>
      title={title}
      entries={logs}
      isLoading={isLoading}
      defaultOpen
      sticky
      fillViewport
      stickyOffset="1.5rem"
      pagination={pagination}
      searchableText={log => {
        const t = entryTitle(log, settingLabelByKey);
        return `${t} ${log.userName ?? ""} ${log.oldValue ?? ""} ${log.newValue ?? ""}`;
      }}
      keyOf={log => log.id}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      renderEntry={log => (
        <div className="rounded-xl border border-border-subtle bg-surface-sunken/50 p-3">
          <div className="mb-1.5">
            <span className="text-xs font-bold text-text-secondary leading-snug wrap-break-word">
              {entryTitle(log, settingLabelByKey)}
            </span>
            <span className="block text-[10px] font-mono text-text-muted mt-0.5">{log.changedAt}</span>
          </div>
          <AuditLogValueDiff oldValue={log.oldValue} newValue={log.newValue} />
          {log.userName && <p className="text-[10px] text-text-muted font-medium mt-1">por {log.userName}</p>}
        </div>
      )}
    />
  );
}
