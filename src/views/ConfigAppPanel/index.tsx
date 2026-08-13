/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CONFIG APP (Fase 1.4 del plan de 90 días) — parámetros de negocio
 * editables desde administración sin deploy, organizados en 3 macro-grupos:
 * Negocio (presupuesto, ratings, alertas, inflación, moneda, fiscal),
 * Notificaciones (settings de notificaciones + matriz de notificaciones por
 * rol), y Aplicación (ajustes generales).
 *
 * Este contenedor solo orquesta: la lógica de estado vive en useDraftState,
 * el renderizado de cada sección vive en SettingGroupCard/NotificationRulesCard.
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
import { containerVariants } from "../../animations";
import Spinner from "../../components/UI/Spinner";
import Button from "../../components/UI/Button";
import AuditLogPanel from "../../components/UI/AuditLogPanel";
import { useToast } from "../../components/UI/Toast";
import { getErrorMessage } from "../../services/logger";
import { useAppSettings, type AppSettingRecord } from "../../hooks/useAppSettings";
import { useConfigAuditLogs, type ConfigAuditLogRecord } from "../../hooks/useConfigAuditLogs";
import { useNotificationActionsCatalog } from "../../hooks/useNotificationActionsCatalog";
import { useNotificationRules, type NotificationRuleChannels } from "../../hooks/useNotificationRules";
import { useDraftState } from "../../hooks/useDraftState";
import { isDirtySettingValue, isDirtyRuleValue } from "./utils";
import AuditLogValueDiff from "./components/AuditLogValueDiff";
import SettingGroupCard, { type SettingGroupMeta } from "./components/SettingGroupCard";
import NotificationRulesCard from "./components/NotificationRulesCard";

const GROUP_META: Record<string, SettingGroupMeta> = {
  moneda: { title: "Moneda", description: "Moneda base para montos registrados en la app.", icon: <Coins className="h-5 w-5" />, color: "amber" },
  presupuesto: { title: "Presupuesto y anticipos", description: "Anticipo máximo y umbrales del semáforo de ejecución presupuestaria.", icon: <Gauge className="h-5 w-5" />, color: "sky" },
  ratings: { title: "Ratings", description: "Escala mínima y máxima de calificación para proveedores.", icon: <Star className="h-5 w-5" />, color: "purple" },
  notificaciones: { title: "Notificaciones", description: "Correos por departamento y acciones que disparan envío de correo.", icon: <Bell className="h-5 w-5" />, color: "indigo" },
  fiscal: { title: "Datos fiscales", description: "Datos de la empresa usados en comprobantes de pago a proveedores.", icon: <Landmark className="h-5 w-5" />, color: "emerald" },
  alertas: { title: "Alertas de precio", description: "Umbral de variación a partir del cual un precio se marca fuera de rango.", icon: <TrendingUp className="h-5 w-5" />, color: "rose" },
  inflacion: { title: "Inflación", description: "Tasa de inflación de referencia para el análisis de precios.", icon: <BarChart3 className="h-5 w-5" />, color: "slate" },
  app: { title: "Aplicación", description: "Ajustes generales de la aplicación.", icon: <SettingsIcon className="h-5 w-5" />, color: "slate" },
};

/**
 * 3 macro-grupos visuales para no dejar las secciones como una lista plana
 * sin estructura — cada uno con un título separador simple (no otro nivel
 * de Card/colapsable).
 */
const MACRO_GROUPS: { title: string; groups: string[] }[] = [
  { title: "Negocio", groups: ["presupuesto", "ratings", "alertas", "inflacion", "moneda", "fiscal"] },
  { title: "Notificaciones", groups: ["notificaciones", "__notification_rules__"] },
  { title: "Aplicación", groups: ["app"] },
];

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

  const {
    actions: ruleActions,
    roles: ruleRoles,
    rules,
    unconfigured,
    isLoading: isLoadingRules,
    updateRule,
  } = useNotificationRules(authToken, isSuperadmin);

  const allSettings = useMemo(() => Object.values(settings).flat(), [settings]);
  const settingById = useMemo(() => new Map(allSettings.map(s => [s.id, s])), [allSettings]);

  const settingLabelByKey = useMemo(() => {
    const map: Record<string, string> = {};
    for (const setting of allSettings) map[setting.key] = setting.label;
    return map;
  }, [allSettings]);

  /**
   * El interruptor maestro (`acciones_con_notificacion_app`/`acciones_con_correo`)
   * y la matriz por rol son dos capas independientes que se combinan con AND
   * en el backend — una acción desmarcada acá no notifica a nadie sin
   * importar qué roles tenga configurados en la matriz. Sin esto, la matriz
   * mostraba filas con apariencia normal aunque estuvieran completamente
   * silenciadas, generando confusión ("desactivé la acción pero sigo viendo
   * roles marcados y no entiendo por qué no cambia nada").
   */
  const masterSwitchByChannel = useMemo(() => {
    const parseList = (key: string): string[] | null => {
      const raw = allSettings.find(s => s.key === key)?.value;
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    };
    return { app: parseList("acciones_con_notificacion_app"), mail: parseList("acciones_con_correo") };
  }, [allSettings]);

  const silencedChannelsFor = (action: string): ("app" | "mail")[] => {
    const silenced: ("app" | "mail")[] = [];
    if (masterSwitchByChannel.app !== null && !masterSwitchByChannel.app.includes(action)) silenced.push("app");
    if (masterSwitchByChannel.mail !== null && !masterSwitchByChannel.mail.includes(action)) silenced.push("mail");
    return silenced;
  };

  /**
   * `useDraftState` compara valores por clave sin conocer nada del dominio
   * — pero decidir si un AppSetting está dirty depende de su `type` (ver
   * `isDirtySettingValue`). Como la clave es el `id` numérico, se resuelve
   * el setting completo desde `settingById` dentro del comparador.
   */
  const settingsDraft = useDraftState<number, string>({
    numericKeys: true,
    savedValueOf: id => settingById.get(id)?.value ?? "",
    isDirty: (draftValue, savedValue, id) => {
      const type = settingById.get(id)?.type ?? "string";
      return isDirtySettingValue(type, draftValue, savedValue);
    },
    save: async (id, value) => {
      const updated = await updateSetting(id, value);
      if (updated.auditLog && isSuperadmin) prependAuditLog(updated.auditLog);
    },
    fallbackErrorMessage: "Valor inválido.",
  });

  const rulesDraft = useDraftState<string, NotificationRuleChannels>({
    savedValueOf: action => rules[action] ?? { app: [], mail: [] },
    isDirty: isDirtyRuleValue,
    save: async (action, channels) => {
      await updateRule(action, channels);
    },
    fallbackErrorMessage: "No se pudo guardar la regla.",
  });

  const [savingAll, setSavingAll] = useState(false);

  const hasSettingsFor = (group: string) => settings[group]?.length > 0;
  const hasPendingChanges = settingsDraft.dirtyKeys.length > 0 || rulesDraft.dirtyKeys.length > 0;
  const pendingCount = settingsDraft.dirtyKeys.length + rulesDraft.dirtyKeys.length;

  const handleSaveAll = async () => {
    if (!hasPendingChanges) return;
    setSavingAll(true);
    try {
      const [{ failedKeys: failedIds }, { failedKeys: failedActions }] = await Promise.all([
        settingsDraft.persist(),
        rulesDraft.persist(),
      ]);

      const totalFailed = failedIds.length + failedActions.length;
      if (totalFailed > 0) {
        showToast(
          totalFailed === 1
            ? "Un campo tiene un valor inválido. Revísalo antes de continuar."
            : `${totalFailed} campos tienen valores inválidos. Revísalos antes de continuar.`,
          "error",
        );
        if (failedIds.length > 0) {
          document.getElementById(`setting-row-${failedIds[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (failedActions.length > 0) {
          document.getElementById(`notification-rule-${failedActions[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
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
    settingsDraft.discard();
    rulesDraft.discard();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className={isSuperadmin ? "grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start" : ""}>
        <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
          {MACRO_GROUPS.map(macro => {
            const visibleGroups = macro.groups.filter(g => (g === "__notification_rules__" ? isSuperadmin : hasSettingsFor(g)));
            if (visibleGroups.length === 0) return null;

            return (
              <div key={macro.title}>
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 px-1">{macro.title}</h2>
                <div className="space-y-6">
                  {visibleGroups.map(group =>
                    group === "__notification_rules__" ? (
                      <NotificationRulesCard
                        key={group}
                        actions={ruleActions}
                        roles={ruleRoles}
                        isLoading={isLoadingRules}
                        valueOf={rulesDraft.valueOf}
                        onChange={rulesDraft.onChange}
                        isDirty={rulesDraft.isDirty}
                        unconfigured={unconfigured}
                        errors={rulesDraft.errors}
                        silencedChannelsFor={silencedChannelsFor}
                      />
                    ) : (
                      <SettingGroupCard
                        key={group}
                        group={group}
                        meta={GROUP_META[group] ?? { title: group, description: "", icon: <SettingsIcon className="h-5 w-5" />, color: "slate" }}
                        settings={settings[group]}
                        valueOf={setting => settingsDraft.valueOf(setting.id)}
                        onChange={settingsDraft.onChange}
                        errors={settingsDraft.errors}
                        notificationActionsCatalog={notificationActionsCatalog}
                      />
                    ),
                  )}
                </div>
              </div>
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
              {pendingCount} {pendingCount === 1 ? "cambio pendiente" : "cambios pendientes"}
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
