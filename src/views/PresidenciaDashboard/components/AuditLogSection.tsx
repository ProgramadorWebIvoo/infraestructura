/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección de trazabilidad/auditoría — el corazón de los logs del flujo
 * general de la app (fuera de CONFIG APP, que tiene su propio historial vía
 * ConfigAuditLogPanel). Reescrita para paridad de calidad con ese panel:
 * filtros/paginación 100% server-side vía useAuditLogs (antes filtraba
 * client-side sobre el `auditLogs` acotado que trae useProjectsData para el
 * polling general — un registro más viejo que ese corte era invisible a
 * cualquier búsqueda), y exportación CSV del historial completo filtrado
 * (no solo la página en pantalla).
 */

import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Activity, CheckCircle2, ChevronDown, DollarSign, Download, Edit3, Eye, FilePlus2,
  FileSpreadsheet, FileText, KeyRound, Loader2, PlusCircle, SlidersHorizontal, Trash2, Upload, XCircle, X,
} from "lucide-react";
import type { AuditLog } from "@/types";
import { Table, RefreshButton, type Column } from "@/components/UI/Table";
import { SearchInput, SelectFilter } from "@/components/UI/FilterBar";
import DatePicker from "@/components/UI/DatePicker";
import { getRoleColor } from "@/utils";
import { SEMANTIC_COLOR_MAP, type SemanticColor } from "@/components/UI/colorTokens";
import AuditInspectModal from "@/components/Modals/AuditInspectModal";
import { itemVariants } from "@/animations";
import { useAuditLogs, type AuditLogFilters, type AuditLogPage } from "@/hooks/useAuditLogs";
import { downloadAuditLogsExport, apiFetch } from "@/services/api";
import { useToast } from "@/components/UI/Toast";
import { buildXlsx, printPdf, downloadBlob, XLSX_MIME, type ExportRow, type ExportColumn } from "@/components/UI/ExportButton";
import AuditSummaryStats from "./AuditSummaryStats";

/** Tope de filas traídas para Excel/PDF (a diferencia del CSV, que el backend
 * transmite en streaming sin límite): ambos formatos arman el archivo
 * completo en memoria del navegador (write-excel-file / tabla HTML para
 * imprimir), así que un historial sin filtrar de decenas de miles de logs
 * podría colgar la pestaña. Si el filtro activo trae más que esto, se avisa
 * y se exportan solo los más recientes — para el histórico completo sigue
 * estando "Exportar CSV". */
const MAX_ROWS_FOR_RICH_EXPORT = 3000;
const EXPORT_FETCH_PAGE_SIZE = 500;

/** Clases violeta "crudas" para la categoría Seguridad/Autenticación — excepción documentada
 * (CLAUDE.md §3): SEMANTIC_COLOR_MAP no tiene un 7º color solo para este badge puntual. */
const SECURITY_BADGE_CLASSES = { bg: "bg-violet-50", border: "border-violet-100", icon: "text-violet-500", text: "text-violet-700" };

/**
 * Lectura visual de la naturaleza de una acción a partir de palabras clave en
 * su texto (es el único campo consistente: `action` no tiene un `type`
 * estructurado en BD). Da a la tabla una jerarquía inmediata — aprobaciones
 * en verde, rechazos/eliminaciones en rojo, cambios financieros destacados,
 * seguridad/autenticación en violeta — sin depender de leer cada fila
 * palabra por palabra.
 */
function getActionVisual(action: string): { icon: typeof Activity; color: SemanticColor | "security" } {
  const a = action.toLowerCase();
  if (a.includes("login") || a.includes("sesión") || a.includes("password") || a.includes("contraseña") || a.includes("autentic") || a.includes("permiso") || a.includes("restablec")) {
    return { icon: KeyRound, color: "security" };
  }
  if (a.includes("rechaz") || a.includes("declin")) return { icon: XCircle, color: "danger" };
  if (a.includes("elimin") || a.includes("borrad")) return { icon: Trash2, color: "danger" };
  if (a.includes("aprob") || a.includes("aceptad") || a.includes("adjudicad")) return { icon: CheckCircle2, color: "success" };
  if (a.includes("pago") || a.includes("pagad") || a.includes("liquidad") || a.includes("desembols")) return { icon: DollarSign, color: "success" };
  if (a.includes("document") || a.includes("subid") || a.includes("carga")) return { icon: Upload, color: "brand" };
  if (a.includes("creaci") || a.includes("creado") || a.includes("registr") || a.includes("nuevo")) return { icon: PlusCircle, color: "info" };
  if (a.includes("actualiz") || a.includes("edit") || a.includes("modific") || a.includes("renegoc")) return { icon: Edit3, color: "warning" };
  if (a.includes("evalua") || a.includes("propuesta")) return { icon: FilePlus2, color: "info" };
  return { icon: Activity, color: "neutral" };
}

/** Fecha ISO (Y-m-d) de hace N días, para los quick-presets de rango de fechas. */
function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

interface QuickPreset {
  label: string;
  apply: (update: <K extends keyof AuditLogFilters>(key: K, value: AuditLogFilters[K]) => void) => void;
}

const QUICK_PRESETS: (QuickPreset & { isActive: (filters: AuditLogFilters) => boolean; clear: (update: <K extends keyof AuditLogFilters>(key: K, value: AuditLogFilters[K]) => void) => void })[] = [
  {
    label: "Últimas 24h",
    apply: (update) => {
      update("dateFrom", isoDaysAgo(1));
      update("dateTo", "");
    },
    isActive: (f) => f.dateFrom === isoDaysAgo(1) && !f.dateTo,
    clear: (update) => update("dateFrom", ""),
  },
  {
    label: "Pagos",
    apply: (update) => {
      update("q", "pago");
    },
    isActive: (f) => f.q === "pago",
    clear: (update) => update("q", ""),
  },
  {
    label: "Actividad crítica",
    apply: (update) => {
      update("q", "rechaz");
    },
    isActive: (f) => f.q === "rechaz",
    clear: (update) => update("q", ""),
  },
];

/** Etiquetas legibles para los chips del resumen de filtros activos. */
const FILTER_CHIP_LABELS: Record<keyof AuditLogFilters, string> = {
  q: "Búsqueda",
  role: "Rol",
  projectId: "Proyecto",
  action: "Acción",
  user: "Usuario",
  dateFrom: "Desde",
  dateTo: "Hasta",
};

const AUDIT_ROLE_OPTIONS = [
  { value: "", label: "Todos los Roles" },
  { value: "PRESIDENCIA", label: "Presidencia" },
  { value: "INFRAESTRUCTURA", label: "Infraestructura" },
  { value: "CIERRE_DE_OBRA", label: "Cierre de Obra" },
  { value: "PROCURA", label: "Procura" },
  { value: "ANALISTA", label: "Analistas" },
  { value: "FINANZAS", label: "Finanzas" },
  { value: "SISTEMA", label: "Sistema" },
];

function getAuditColumns(onInspect: (log: AuditLog) => void): Column<AuditLog>[] {
  return [
    { key: "timestamp", label: "Timestamp", render: (log) => <span className="text-[10px] font-mono text-slate-400 font-semibold whitespace-nowrap">{log.timestamp}</span> },
    { key: "role", label: "Rol", render: (log) => <span className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded-lg border ${getRoleColor(log.role)}`}>{log.role}</span> },
    { key: "projectTitle", label: "Proyecto", render: (log) => <span className="text-xs font-semibold text-slate-600 line-clamp-1 max-w-[200px] block">{log.projectTitle || <span className="text-slate-300 italic font-mono">—</span>}</span> },
    { key: "userName", label: "Usuario", render: (log) => log.userName ? <span className="text-xs font-semibold text-slate-700">{log.userName}</span> : <span className="text-[10px] text-slate-300 italic font-mono">—</span> },
    {
      key: "action",
      label: "Acción",
      render: (log) => {
        const { icon: Icon, color } = getActionVisual(log.action);
        const c = color === "security" ? SECURITY_BADGE_CLASSES : {
          bg: SEMANTIC_COLOR_MAP[color].bg50,
          border: SEMANTIC_COLOR_MAP[color].border100,
          icon: SEMANTIC_COLOR_MAP[color].icon500,
          text: SEMANTIC_COLOR_MAP[color].text700,
        };
        return (
          <span className={`inline-flex items-center gap-1.5 max-w-[240px] rounded-lg border px-2 py-1 ${c.bg} ${c.border}`}>
            <Icon className={`h-3.5 w-3.5 shrink-0 ${c.icon}`} />
            <span className={`text-xs font-bold line-clamp-1 ${c.text}`}>{log.action}</span>
          </span>
        );
      },
    },
    {
      key: "inspect",
      label: "",
      align: "right",
      render: (log) => (
        <button
          id={`btn-inspect-audit-${log.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onInspect(log);
          }}
          title="Inspeccionar registro"
          className="inline-flex items-center justify-center h-7 w-7 text-slate-400 bg-white border border-slate-200 hover:text-sky-700 hover:bg-sky-50 hover:border-sky-100 rounded-lg transition-colors cursor-pointer opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];
}

interface AuditLogSectionProps {
  authToken: string;
}

/** Trae TODAS las filas que matchean `exportQuery` (no solo la página visible en
 * pantalla) para Excel/PDF, paginando contra el mismo /audit-logs de siempre
 * con `per_page` alto. Se detiene en MAX_ROWS_FOR_RICH_EXPORT — devuelve
 * también `truncated` para que el llamador pueda avisar al usuario. */
async function fetchAllAuditLogsForExport(
  exportQuery: string,
  authToken: string,
): Promise<{ items: AuditLog[]; truncated: boolean; total: number }> {
  const items: AuditLog[] = [];
  let page = 1;
  let lastPage = 1;
  let total = 0;

  do {
    const params = new URLSearchParams(exportQuery);
    params.set("page", String(page));
    params.set("per_page", String(EXPORT_FETCH_PAGE_SIZE));

    const data = await apiFetch<AuditLogPage>(`/audit-logs?${params.toString()}`, { token: authToken });
    items.push(...(data.items ?? []));
    lastPage = data.lastPage ?? 1;
    total = data.total ?? items.length;
    page += 1;
  } while (page <= lastPage && items.length < MAX_ROWS_FOR_RICH_EXPORT);

  return { items: items.slice(0, MAX_ROWS_FOR_RICH_EXPORT), truncated: total > MAX_ROWS_FOR_RICH_EXPORT, total };
}

const AUDIT_EXPORT_HEADERS = ["ID", "Proyecto", "Rol", "Usuario", "Acción", "Fecha", "Detalles", "Observaciones"];
const AUDIT_EXPORT_COLUMNS: ExportColumn[] = [
  { width: 10 },
  { width: 30 },
  { width: 16, align: "center" },
  { width: 20 },
  { width: 30 },
  { width: 18, align: "center" },
  { width: 36 },
  { width: 36 },
];

function toAuditExportRows(logs: AuditLog[]): ExportRow[] {
  return logs.map((log) => [
    log.id,
    log.projectTitle || "—",
    log.role,
    log.userName || "—",
    log.action,
    log.timestamp,
    log.details || "",
    log.observations || "",
  ]);
}

export default function AuditLogSection({ authToken }: AuditLogSectionProps) {
  const { showToast } = useToast();
  const [inspectedAuditLog, setInspectedAuditLog] = useState<AuditLog | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [richExportFormat, setRichExportFormat] = useState<"excel" | "pdf" | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  /** Confirmación visual de drill-down: qué campo de filtro acaba de recibir un valor desde un clic en el resumen ejecutivo — se apaga sola tras el pulso. */
  const [flashedFilter, setFlashedFilter] = useState<"role" | "action" | "projectId" | null>(null);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Tarjeta de filtros + tabla — destino del scroll-to al aplicar un drill-down desde el resumen ejecutivo, que vive mucho más arriba en la página. */
  const tableCardRef = useRef<HTMLDivElement>(null);

  const {
    logs, isLoading, page, lastPage, total, goToPage, refresh,
    filters, updateFilter, clearFilters, activeFilterCount, exportQuery,
    summary, isSummaryLoading,
  } = useAuditLogs(authToken, true);

  const auditColumns = useMemo(() => getAuditColumns(setInspectedAuditLog), []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadAuditLogsExport("audit-logs", exportQuery, authToken);
    } catch {
      showToast("No se pudo exportar el historial de auditoría.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  /** Excel y PDF — misma lógica de ExportButton (usada en Finanzas/LedgerSection),
   * pero invocada a mano porque esta tabla pagina server-side: antes de generar
   * el archivo hay que traer TODAS las filas del filtro activo, no solo la
   * página cargada en pantalla. */
  const handleRichExport = async (format: "excel" | "pdf") => {
    setRichExportFormat(format);
    try {
      const { items, truncated, total: matchedTotal } = await fetchAllAuditLogsForExport(exportQuery, authToken);
      const subtitle = `Generado el ${new Date().toLocaleString("es-VE", { dateStyle: "long" })} — ${items.length} de ${matchedTotal} registro(s) según los filtros activos.`;
      const exportPayload = {
        headers: AUDIT_EXPORT_HEADERS,
        rows: toAuditExportRows(items),
        columns: AUDIT_EXPORT_COLUMNS,
        title: "Trazabilidad / Auditoría",
        subtitle,
      };

      if (format === "excel") {
        const blob = await buildXlsx(exportPayload.headers, exportPayload.rows, exportPayload);
        downloadBlob(blob, XLSX_MIME, `auditoria-${new Date().toISOString().slice(0, 10)}.xlsx`);
      } else {
        printPdf(exportPayload);
      }

      if (truncated) {
        showToast(`Se exportaron los ${MAX_ROWS_FOR_RICH_EXPORT} registros más recientes de ${matchedTotal} — para el histórico completo usa "Exportar CSV".`, "info");
      }
    } catch {
      showToast("No se pudo generar el archivo de auditoría.", "error");
    } finally {
      setRichExportFormat(null);
    }
  };

  const DRILL_DOWN_LABELS: Record<"role" | "action" | "projectId", string> = {
    role: "rol",
    action: "acción",
    projectId: "proyecto",
  };

  const handleDrillDown = (kind: "role" | "action" | "projectId", value: string) => {
    updateFilter(kind, value);
    if (kind === "projectId") setShowAdvanced(true);
    setFlashedFilter(kind);
    if (flashTimeout.current) clearTimeout(flashTimeout.current);
    flashTimeout.current = setTimeout(() => setFlashedFilter(null), 2200);
    // El resumen ejecutivo vive arriba del todo y la tabla queda fuera de
    // vista al aplicar un drill-down desde ahí — sin este scroll + toast el
    // usuario no notaba que el filtro se había aplicado.
    tableCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(`Filtrando por ${DRILL_DOWN_LABELS[kind]}: "${value}" — resultados actualizados abajo`, "info");
  };

  const flashClass = (key: "role" | "action" | "projectId") =>
    flashedFilter === key ? "ring-2 ring-sky-400 ring-offset-1 rounded-lg animate-pulse" : "";

  return (
    // Mismo patrón que la pestaña Estadísticas: secciones repartidas en flujo
    // normal de página (space-y-6). El resumen ejecutivo (KPIs + gráficos) va
    // primero como bloque de overview independiente; header-de-filtros y
    // tabla van SIEMPRE juntos en una sola tarjeta — los filtros accionan
    // directamente sobre la tabla que tienen debajo, sin nada intercalado
    // entre uno y otro (antes las KPI cards quedaban sandwicheadas ahí,
    // separando visualmente el filtro de lo que filtra).
    <div className="space-y-6">
      {/* ── Resumen ejecutivo — KPIs + gráficos, mismo conjunto filtrado que la tabla de abajo ── */}
      <AuditSummaryStats
        summary={summary}
        isLoading={isSummaryLoading}
        onDrillDown={handleDrillDown}
        activeRole={filters.role}
        activeAction={filters.action}
        activeProjectId={filters.projectId}
      />

      {/* ── Header + filtros + tabla: una sola tarjeta, filtros siempre pegados a lo que filtran ── */}
      <motion.div
        ref={tableCardRef}
        variants={itemVariants}
        animate={flashedFilter ? { boxShadow: "0 0 0 3px rgba(56,189,248,0.45)" } : { boxShadow: "0 0 0 0px rgba(56,189,248,0)" }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden border-l-4 border-l-sky-400 scroll-mt-6"
      >
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-sky-50/60 via-slate-50/50 to-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="relative p-2.5 bg-white rounded-xl border border-sky-100 shadow-xs">
              <Activity className="h-4.5 w-4.5 text-sky-500" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" title="En vivo" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm tracking-tight">Trazabilidad en Tiempo Real</h2>
              <p className="text-[11px] text-slate-500 font-medium">Auditoría Base de Datos • Logs de Control del Sistema</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2.5 py-1.5 rounded-lg bg-white text-slate-600 font-bold border border-slate-200 shadow-xs">
              {total.toLocaleString("es")} {total === 1 ? "registro" : "registros"}
            </span>
            <RefreshButton onRefresh={refresh} />
            <button
              type="button"
              onClick={() => handleRichExport("excel")}
              disabled={richExportFormat !== null || total === 0}
              aria-label="Exportar auditoría a Excel"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              {richExportFormat === "excel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
              Excel
            </button>
            <button
              type="button"
              onClick={() => handleRichExport("pdf")}
              disabled={richExportFormat !== null || total === 0}
              aria-label="Exportar auditoría a PDF"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              {richExportFormat === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              PDF
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || total === 0}
              title="Exporta el histórico completo del filtro activo, sin límite de filas (streaming)."
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none shadow-xs"
            >
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              CSV
            </button>
          </div>
        </div>
        {/* ── Quick presets ── */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mr-1">Accesos rápidos:</span>
          {QUICK_PRESETS.map((preset) => {
            const active = preset.isActive(filters);
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => (active ? preset.clear(updateFilter) : preset.apply(updateFilter))}
                aria-pressed={active}
                title={active ? "Clic para quitar este filtro rápido" : undefined}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                  active
                    ? "text-white bg-sky-600 border-sky-600 shadow-sm shadow-sky-500/30"
                    : "text-sky-700 bg-sky-50 border-sky-100 hover:bg-sky-100"
                }`}
              >
                {active && "✓ "}{preset.label}
              </button>
            );
          })}
        </div>

        {/* ── Search + filter bar ── */}
        <div className="flex flex-wrap gap-2.5 mt-3">
          <SearchInput
            id="audit-search"
            value={filters.q}
            onChange={(v) => updateFilter("q", v)}
            placeholder="Buscar por acción, proyecto, usuario o detalles..."
            ariaLabel="Buscar en auditoría"
          />
          <DatePicker
            id="audit-date-from"
            value={filters.dateFrom}
            onChange={(v) => updateFilter("dateFrom", v)}
            max={filters.dateTo || undefined}
            ariaLabel="Fecha desde"
            className="w-36"
          />
          <div className={flashClass("role")}>
            <SelectFilter
              id="audit-filter-role"
              value={filters.role}
              onChange={(v) => updateFilter("role", v)}
              ariaLabel="Filtrar por rol"
              options={AUDIT_ROLE_OPTIONS}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
              showAdvanced || filters.dateTo || filters.projectId || filters.user
                ? "text-sky-700 bg-sky-50 border-sky-100"
                : "text-slate-500 bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros avanzados
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          </button>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar filtros
              <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-slate-700 text-white text-[9px] font-mono font-black">
                {activeFilterCount}
              </span>
            </button>
          )}
        </div>

        {/* ── Resumen consolidado de filtros activos — de un vistazo, sin escanear cada control ── */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-dashed border-slate-200">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mr-0.5">Filtros activos:</span>
            {(Object.keys(FILTER_CHIP_LABELS) as (keyof AuditLogFilters)[])
              .filter((key) => filters[key].trim() !== "")
              .map((key) => (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-2.5 py-1 ${flashClass(key as "role" | "action" | "projectId")}`}
                >
                  {FILTER_CHIP_LABELS[key]}: <span className="font-mono">{filters[key]}</span>
                  <button
                    type="button"
                    onClick={() => updateFilter(key, "")}
                    className="hover:text-sky-900 cursor-pointer"
                    aria-label={`Quitar filtro de ${FILTER_CHIP_LABELS[key].toLowerCase()}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
          </div>
        )}

        {/* ── Filtros avanzados — colapsados por defecto para no saturar la barra principal ── */}
        <motion.div
          initial={false}
          animate={{ height: showAdvanced ? "auto" : 0, opacity: showAdvanced ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="flex flex-wrap gap-2.5 pt-3">
            <DatePicker
              id="audit-date-to"
              value={filters.dateTo}
              onChange={(v) => updateFilter("dateTo", v)}
              min={filters.dateFrom || undefined}
              ariaLabel="Fecha hasta"
              className="w-36"
            />
            <div className={flashClass("projectId")}>
              <SearchInput
                id="audit-filter-project"
                value={filters.projectId}
                onChange={(v) => updateFilter("projectId", v)}
                placeholder="ID de proyecto..."
                ariaLabel="Filtrar por ID de proyecto"
                className="w-40"
              />
            </div>
            <SearchInput
              id="audit-filter-user"
              value={filters.user}
              onChange={(v) => updateFilter("user", v)}
              placeholder="Usuario..."
              ariaLabel="Filtrar por usuario"
              className="w-40"
            />
          </div>
        </motion.div>

        </div>

        {/* ── La tabla va inmediatamente después del header/filtros, en la misma tarjeta — nada intercalado entre lo que filtra y lo que se filtra ── */}
        <Table
          columns={auditColumns}
          data={logs}
          rowKey={(log) => log.id}
          isLoading={isLoading}
          emptyMessage="No hay logs registrados todavía."
          emptyState={
            <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <div className="text-slate-300 flex justify-center mb-2">
                <Activity className="h-8 w-8" />
              </div>
              <p className="text-xs text-slate-500 font-medium italic">No hay logs que coincidan con los filtros aplicados.</p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-sky-700 bg-white border border-sky-100 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Limpiar los {activeFilterCount} filtros activos
                </button>
              )}
            </div>
          }
          maxHeight="30rem"
          stickyHeader
          containerClassName="border border-slate-100 rounded-lg mx-6 mt-6"
          rowHoverClass="hover:bg-sky-50/30"
          onRowClick={(log) => setInspectedAuditLog(log)}
        />

        {lastPage > 1 ? (
          <div className="flex items-center justify-between gap-2 p-6 pt-4 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || isLoading}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-[11px] font-bold text-slate-500 font-mono">
              Página <span className="text-slate-800">{page}</span> de {lastPage}
            </span>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= lastPage || isLoading}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
            >
              Siguiente →
            </button>
          </div>
        ) : (
          <div className="h-6" />
        )}
      </motion.div>

      <AuditInspectModal
        isOpen={!!inspectedAuditLog}
        log={inspectedAuditLog}
        onClose={() => setInspectedAuditLog(null)}
      />
    </div>
  );
}
