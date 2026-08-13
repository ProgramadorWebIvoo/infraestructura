/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CONFIG APP (Fase 1.4 del plan de 90 días) — parámetros de negocio
 * editables desde administración sin deploy, agrupados por sección:
 * moneda, presupuesto, ratings, notificaciones, datos fiscales, alertas de
 * precio, inflación, y ajustes generales de la app.
 *
 * Guardado estilo Odoo: los cambios quedan en un borrador local (no se
 * persisten al tipear). Una barra global con "Guardar todo" / "Descartar
 * cambios" aparece solo mientras hay cambios pendientes en cualquier sección.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Coins,
  Gauge,
  Star,
  Bell,
  Landmark,
  TrendingUp,
  BarChart3,
  Settings as SettingsIcon,
  Check,
  RotateCcw,
} from "lucide-react";
import { containerVariants, itemVariants } from "../../animations";
import Card from "../../components/UI/Card";
import SectionHeader from "../../components/UI/SectionHeader";
import Spinner from "../../components/UI/Spinner";
import Button from "../../components/UI/Button";
import InfoBanner from "../../components/UI/InfoBanner";
import AuditLogPanel from "../../components/UI/AuditLogPanel";
import { useToast } from "../../components/UI/Toast";
import { getErrorMessage } from "../../services/logger";
import { useAppSettings, type AppSettingRecord } from "../../hooks/useAppSettings";
import { useConfigAuditLogs, type ConfigAuditLogRecord } from "../../hooks/useConfigAuditLogs";
import { useNotificationActionsCatalog } from "../../hooks/useNotificationActionsCatalog";
import SettingRow from "./components/SettingRow";
import AuditLogValueDiff from "./components/AuditLogValueDiff";

const GROUP_META: Record<string, { title: string; description: string; icon: React.ReactNode; color: string }> = {
  moneda: { title: "Moneda", description: "Moneda base para montos registrados en la app.", icon: <Coins className="h-5 w-5" />, color: "amber" },
  presupuesto: { title: "Presupuesto y anticipos", description: "Anticipo máximo y umbrales del semáforo de ejecución presupuestaria.", icon: <Gauge className="h-5 w-5" />, color: "sky" },
  ratings: { title: "Ratings", description: "Escala mínima y máxima de calificación para proveedores.", icon: <Star className="h-5 w-5" />, color: "purple" },
  notificaciones: { title: "Notificaciones", description: "Correos por departamento y acciones que disparan envío de correo.", icon: <Bell className="h-5 w-5" />, color: "indigo" },
  fiscal: { title: "Datos fiscales", description: "Datos de la empresa usados en comprobantes de pago a proveedores.", icon: <Landmark className="h-5 w-5" />, color: "emerald" },
  alertas: { title: "Alertas de precio", description: "Umbral de variación a partir del cual un precio se marca fuera de rango.", icon: <TrendingUp className="h-5 w-5" />, color: "rose" },
  inflacion: { title: "Inflación", description: "Tasa de inflación de referencia para el análisis de precios.", icon: <BarChart3 className="h-5 w-5" />, color: "slate" },
  app: { title: "Aplicación", description: "Ajustes generales de la aplicación.", icon: <SettingsIcon className="h-5 w-5" />, color: "slate" },
};

// Orden de despliegue de secciones — no depende del orden alfabético de `group`.
const GROUP_ORDER = ["presupuesto", "notificaciones", "fiscal", "moneda", "ratings", "alertas", "inflacion", "app"];

type Draft = Record<number, string>;

/**
 * Compara el valor en borrador contra el original para decidir si un
 * setting está "dirty". Para `json` (hoy: listas de acciones vía
 * TagMultiSelect) no alcanza con comparar el string crudo: togglear un tag
 * fuera y volver a seleccionarlo lo reinserta al final del array, cambiando
 * el orden serializado aunque el conjunto de valores sea idéntico — eso
 * disparaba falsamente la barra de "cambios pendientes". Se comparan como
 * conjuntos ordenados en vez de string a string.
 */
function isDirtyValue(type: AppSettingRecord["type"], draftValue: string, originalValue: string): boolean {
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

interface ConfigAppPanelProps {
  authToken: string;
  activeRole?: string;
}

export default function ConfigAppPanel({ authToken, activeRole }: ConfigAppPanelProps) {
  const { showToast } = useToast();
  const { settings, isLoading, updateSetting } = useAppSettings(authToken);

  const isSuperadmin = activeRole === "SUPERADMIN";
  const {
    logs: auditLogs,
    isLoading: isLoadingAuditLogs,
    page: auditLogPage,
    lastPage: auditLogLastPage,
    total: auditLogTotal,
    goToPage: goToAuditLogPage,
    prependLocal: prependAuditLog,
  } = useConfigAuditLogs(authToken, isSuperadmin);

  const { actions: notificationActionsCatalog } = useNotificationActionsCatalog(authToken);

  const settingLabelByKey = useMemo(() => {
    const map: Record<string, string> = {};
    for (const setting of Object.values(settings).flat()) {
      map[setting.key] = setting.label;
    }
    return map;
  }, [settings]);

  const [draft, setDraft] = useState<Draft>({});
  const [savingAll, setSavingAll] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<number, string>>({});

  const valueOf = (setting: AppSettingRecord) =>
    Object.prototype.hasOwnProperty.call(draft, setting.id) ? draft[setting.id] : setting.value ?? "";

  const handleChange = (id: number, value: string) => {
    setDraft(prev => ({ ...prev, [id]: value }));
    setFieldErrors(prev => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const allSettings = useMemo(() => Object.values(settings).flat(), [settings]);

  const dirtyIds = useMemo(
    () =>
      allSettings
        .filter(s => Object.prototype.hasOwnProperty.call(draft, s.id) && isDirtyValue(s.type, draft[s.id], s.value ?? ""))
        .map(s => s.id),
    [allSettings, draft],
  );

  /**
   * Persiste cada setting dirty de forma independiente: un error de
   * validación en uno no debe descartar los demás cambios pendientes. Los
   * ids que fallan quedan con su mensaje en `fieldErrors` (mostrado inline
   * en el SettingRow correspondiente) y siguen en el draft para reintentar;
   * los que sí se guardaron se limpian del draft normalmente.
   */
  const persist = async (ids: number[]) => {
    const succeededIds: number[] = [];
    const errors: Record<number, string> = {};

    for (const id of ids) {
      try {
        const updated = await updateSetting(id, draft[id]);
        if (updated.auditLog && isSuperadmin) {
          prependAuditLog(updated.auditLog);
        }
        succeededIds.push(id);
      } catch (err) {
        errors[id] = getErrorMessage(err, "Valor inválido.");
      }
    }

    setDraft(prev => {
      const next = { ...prev };
      for (const id of succeededIds) delete next[id];
      return next;
    });

    setFieldErrors(prev => {
      const next = { ...prev };
      for (const id of succeededIds) delete next[id];
      return { ...next, ...errors };
    });

    return { failedIds: Object.keys(errors).map(Number) };
  };

  const handleSaveAll = async () => {
    if (dirtyIds.length === 0) return;
    setSavingAll(true);
    try {
      const { failedIds } = await persist(dirtyIds);
      if (failedIds.length > 0) {
        showToast(
          failedIds.length === 1
            ? "Un campo tiene un valor inválido. Revísalo antes de continuar."
            : `${failedIds.length} campos tienen valores inválidos. Revísalos antes de continuar.`,
          "error",
        );
        document.getElementById(`setting-row-${failedIds[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        showToast("Configuración actualizada.", "success");
      }
    } catch (err) {
      showToast(getErrorMessage(err, "Error al guardar la configuración."), "error");
    } finally {
      setSavingAll(false);
    }
  };

  const handleDiscardAll = () => {
    setDraft({});
    setFieldErrors({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="xl" />
      </div>
    );
  }

  const groups = GROUP_ORDER.filter(g => settings[g]?.length);
  const hasPendingChanges = dirtyIds.length > 0;

  return (
    <div className="space-y-6 pb-20">
      <div className={isSuperadmin ? "grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start" : ""}>
      <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
        {groups.map(group => {
          const meta = GROUP_META[group] ?? { title: group, description: "", icon: <SettingsIcon className="h-5 w-5" />, color: "slate" };

          return (
            <motion.div key={group} variants={itemVariants}>
              <Card>
                <SectionHeader
                  icon={meta.icon}
                  title={meta.title}
                  description={meta.description}
                  color={meta.color}
                />
                {group === "presupuesto" && (
                  <InfoBanner title="¿Cómo funciona el semáforo de ejecución presupuestaria?" defaultOpen={false} className="mb-4">
                    <p>
                      Cada umbral es un porcentaje sobre el <strong>100% de la inversión aprobada</strong> de un
                      proyecto u oferta (monto ejecutado o cotizado ÷ monto autorizado). El semáforo toma el color
                      del primer umbral que el porcentaje no supere:
                    </p>
                    <ul className="mt-1.5 space-y-0.5 font-mono">
                      <li>🟢 Verde: hasta el umbral verde ({settings.presupuesto?.find(s => s.key === "semaforo_umbral_verde")?.value ?? "80"}%)</li>
                      <li>🟡 Amarillo: entre el umbral verde y el amarillo ({settings.presupuesto?.find(s => s.key === "semaforo_umbral_amarillo")?.value ?? "95"}%)</li>
                      <li>🟠 Naranja: entre el umbral amarillo y el naranja ({settings.presupuesto?.find(s => s.key === "semaforo_umbral_naranja")?.value ?? "100"}%)</li>
                      <li>🔴 Rojo: al superar el umbral naranja (por defecto, más del 100% — sobre-ejecución)</li>
                    </ul>
                    <p className="mt-1.5">
                      Se usa hoy en el Dashboard de Presidencia (ejecución agregada de toda la cartera) y en la
                      evaluación de ofertas de Procura (cada propuesta, individualmente).
                    </p>
                  </InfoBanner>
                )}
                <div>
                  {settings[group].map(setting => (
                    <SettingRow
                      key={setting.id}
                      setting={setting}
                      value={valueOf(setting)}
                      onChange={handleChange}
                      error={fieldErrors[setting.id]}
                      notificationActionsCatalog={notificationActionsCatalog}
                    />
                  ))}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {isSuperadmin && (
        <AuditLogPanel<ConfigAuditLogRecord>
          title="Historial de cambios (CONFIG APP)"
          entries={auditLogs}
          isLoading={isLoadingAuditLogs}
          defaultOpen
          sticky
          fillViewport
          stickyOffset="1.5rem"
          pagination={{ page: auditLogPage, lastPage: auditLogLastPage, total: auditLogTotal, onPageChange: goToAuditLogPage }}
          searchableText={log => `${settingLabelByKey[log.settingKey] ?? log.settingKey} ${log.userName ?? ""} ${log.oldValue ?? ""} ${log.newValue ?? ""}`}
          keyOf={log => log.id}
          searchPlaceholder="Buscar por parámetro, usuario o valor..."
          emptyMessage="Todavía no se ha modificado ningún parámetro."
          renderEntry={log => (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              <div className="mb-1.5">
                <span className="text-[11px] font-bold text-slate-700 leading-snug wrap-break-word">{settingLabelByKey[log.settingKey] ?? log.settingKey}</span>
                <span className="block text-[9px] font-mono text-slate-400 mt-0.5">{log.changedAt}</span>
              </div>
              <AuditLogValueDiff oldValue={log.oldValue} newValue={log.newValue} />
              {log.userName && <p className="text-[10px] text-slate-400 font-medium mt-1">por {log.userName}</p>}
            </div>
          )}
        />
      )}
      </div>

      <AnimatePresence>
        {hasPendingChanges && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-white border border-slate-200 shadow-xl rounded-2xl px-5 py-3"
          >
            <span className="text-xs font-bold text-slate-600">
              {dirtyIds.length} {dirtyIds.length === 1 ? "cambio pendiente" : "cambios pendientes"}
            </span>
            <Button
              size="sm"
              variant="secondary"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              disabled={savingAll}
              onClick={handleDiscardAll}
            >
              Descartar cambios
            </Button>
            <Button
              size="sm"
              variant="primary"
              colorScheme="emerald"
              icon={<Check className="h-3.5 w-3.5" />}
              isLoading={savingAll}
              onClick={handleSaveAll}
            >
              Guardar todo
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
