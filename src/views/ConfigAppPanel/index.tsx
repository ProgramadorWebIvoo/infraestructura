/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CONFIG APP — módulo único de Configuración, con navegación interna por
 * tabs (Tabs + TabPanel, sin depender de rutas). Cubre tanto los
 * macro-grupos de parámetros de negocio editables sin deploy (Negocio,
 * Monedas, Notificaciones, Aplicación — ver MACRO_GROUPS) como las 4 vistas
 * que antes eran rutas independientes del sidebar: Usuarios, Proveedores,
 * Materiales y Modelos de IA (ver EXTRA_TABS), montadas tal cual sin
 * modificar su lógica interna.
 *
 * Este contenedor solo orquesta: la lógica de estado de los macro-grupos
 * vive en useDraftState, el renderizado de cada sección vive en
 * SettingGroupCard/NotificationRulesCard; las EXTRA_TABS gestionan su
 * propio estado de forma autónoma.
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Gauge,
  Star,
  Bell,
  Landmark,
  TrendingUp,
  BarChart3,
  Settings as SettingsIcon,
  Lock,
  Check,
  RotateCcw,
  RefreshCw,
  BrainCircuit,
} from "lucide-react";
import { itemVariants, springs } from "@/animations";
import { SkeletonBlock, SkeletonCard, SkeletonGroup, SkeletonGroupItem } from "@/components/SkeletonLoader";
import Button from "@/components/UI/Button";
import AlertBanner from "@/components/UI/AlertBanner";
import ConfigAuditLogPanel from "@/components/UI/ConfigAuditLogPanel";
import Tabs from "@/components/UI/Tabs";
import TabPanel from "@/components/UI/TabPanel";
import { useToast } from "@/components/UI/Toast";
import { getErrorMessage } from "@/services/logger";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useConfigAuditLogs } from "@/hooks/useConfigAuditLogs";
import { useNotificationActionsCatalog } from "@/hooks/useNotificationActionsCatalog";
import { useNotificationRules, type NotificationRuleChannels } from "@/hooks/useNotificationRules";
import { useCurrencies, type CurrencyRecord } from "@/hooks/useCurrencies";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useExchangeRateSyncLogs } from "@/hooks/useExchangeRateSyncLogs";
import { useRatingIaBatch } from "@/hooks/useRatingIaBatch";
import { useDraftState } from "@/hooks/useDraftState";
import { isDirtySettingValue, isDirtyRuleValue } from "./utils";
import SettingGroupCard, { type SettingGroupMeta } from "./components/SettingGroupCard";
import NotificationRulesCard from "./components/NotificationRulesCard";
import CurrencyCard from "./components/CurrencyCard";
import ExchangeRateSyncLogsPanel from "./components/ExchangeRateSyncLogsPanel";
import ExchangeRateEditModal from "./components/ExchangeRateEditModal";
import RatingIaPanel from "./components/RatingIaPanel";
import UsuariosPanel from "./components/UsuariosPanel";
import ProveedoresConfigPanel from "./components/ProveedoresConfigPanel";
import MaterialConfigPanel from "./components/MaterialConfigPanel";
import AIConfigPanel from "./components/AIConfigPanel";
import KeysConfigPanel from "./components/KeysConfigPanel";
import DebugModeCard from "./components/DebugModeCard";

const GROUP_META: Record<string, SettingGroupMeta> = {
  presupuesto: { title: "Presupuesto y anticipos", description: "Anticipo máximo y umbrales del semáforo de ejecución presupuestaria.", icon: <Gauge className="h-5 w-5" />, color: "sky" },
  ratings: { title: "Ratings", description: "Escala mínima y máxima de calificación para proveedores.", icon: <Star className="h-5 w-5" />, color: "purple" },
  notificaciones: { title: "Notificaciones", description: "Correos por departamento y acciones que disparan envío de correo.", icon: <Bell className="h-5 w-5" />, color: "indigo" },
  fiscal: { title: "Datos fiscales", description: "Datos de la empresa usados en comprobantes de pago a proveedores.", icon: <Landmark className="h-5 w-5" />, color: "emerald" },
  alertas: { title: "Alertas de precio", description: "Umbral de variación a partir del cual un precio se marca fuera de rango.", icon: <TrendingUp className="h-5 w-5" />, color: "rose" },
  inflacion: { title: "Inflación", description: "Tasa de inflación de referencia para el análisis de precios.", icon: <BarChart3 className="h-5 w-5" />, color: "slate" },
  app: { title: "Aplicación", description: "Umbrales operativos, límites de carga de archivos, vigencia de invitaciones y tiempo de sesión.", icon: <SettingsIcon className="h-5 w-5" />, color: "slate" },
  congelacion_tasa: { title: "Congelación de tasa de cambio", description: "Qué triggers de negocio fijan la tasa BCV vigente, para que los montos en Bs. ya contratados/pagados dejen de recalcularse con la tasa del día.", icon: <Lock className="h-5 w-5" />, color: "indigo" },
  sincronizacion_tasa: { title: "Sincronización de tasa", description: "Hora, activación y modo debug del cronjob que sincroniza las tasas BCV.", icon: <RefreshCw className="h-5 w-5" />, color: "sky" },
  rating_ia: { title: "Cronjob de RatingIA", description: "Activación, frecuencia (en días), hora y modo debug del batch que evalúa la sugerencia de rating IA de todos los proveedores activos.", icon: <BrainCircuit className="h-5 w-5" />, color: "purple" },
};

/**
 * 3 macro-grupos, cada uno su propia tab — antes se apilaban en scroll
 * vertical continuo separados solo por un <h2>, lo que obligaba a scrollear
 * mucho para llegar a "Aplicación" aunque el usuario solo quisiera tocar un
 * único setting ahí. El historial de auditoría (columna lateral) y la barra
 * de guardado quedan fuera de las tabs a propósito: son bitácora/acciones
 * globales de TODA la configuración, no de la sección que se esté mirando.
 */
const MACRO_GROUPS: { key: string; title: string; groups: string[] }[] = [
  { key: "negocio", title: "Negocio", groups: ["presupuesto", "ratings", "alertas", "inflacion", "fiscal"] },
  { key: "monedas", title: "Monedas", groups: ["sincronizacion_tasa", "__currencies__", "congelacion_tasa"] },
  { key: "notificaciones", title: "Notificaciones", groups: ["notificaciones", "__notification_rules__"] },
  { key: "aplicacion", title: "Aplicación", groups: ["app", "__debug_mode__"] },
  { key: "cronjobs", title: "CronJobs App", groups: ["rating_ia", "__rating_ia_batch__"] },
];

/**
 * Tabs que antes vivían como vistas/rutas separadas (Usuarios,
 * Proveedores, Materiales, Modelos de IA). A diferencia de MACRO_GROUPS,
 * no iteran `settings[group]` — montan directo el componente de vista
 * completo, que ya fetchea y gestiona su propia data. `route` es el
 * identificador de vista que devuelve /api/auth/permissions (canAccess),
 * heredado de cuando estas eran rutas independientes.
 */
const EXTRA_TABS: { key: string; title: string; route: string }[] = [
  { key: "usuarios", title: "Usuarios", route: "/usuarios" },
  { key: "proveedores", title: "Proveedores", route: "/config-proveedores" },
  { key: "materiales", title: "Materiales", route: "/config-materiales" },
  { key: "modelos-ia", title: "Modelos de IA", route: "/config-ia" },
  { key: "config-keys", title: "Configuración de Keys", route: "/config-keys" },
];

interface ConfigAppPanelProps {
  authToken: string;
  activeRole?: string;
  canAccess: (path: string) => boolean;
  onContractorMutated: () => void;
}

export default function ConfigAppPanel({ authToken, activeRole, canAccess, onContractorMutated }: ConfigAppPanelProps) {
  const { showToast } = useToast();
  const { settings, missingKeys, isLoading, updateSetting } = useAppSettings(authToken);

  const isSuperadmin = activeRole === "SUPERADMIN";
  const canUseDebugMode = activeRole === "SUPERADMIN" || activeRole === "ADMIN";

  const {
    logs: auditLogs,
    isLoading: isLoadingAuditLogs,
    page: auditLogPage,
    lastPage: auditLogLastPage,
    total: auditLogTotal,
    goToPage: goToAuditLogPage,
    prependLocal: prependAuditLog,
    filters: auditLogFilters,
    updateFilter: updateAuditLogFilter,
    clearFilters: clearAuditLogFilters,
    activeFilterCount: auditLogActiveFilterCount,
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

  const {
    currencies,
    isLoading: isLoadingCurrencies,
    updateCurrency,
    deleteCurrency,
  } = useCurrencies(authToken, isSuperadmin);

  const { isSyncing, syncNow } = useExchangeRates(authToken, isSuperadmin);

  const {
    logs: syncLogs,
    lastSync,
    isLoading: isLoadingSyncLogs,
    loadLogs: refreshSyncLogsList,
    loadLastSync: refreshLastSync,
  } = useExchangeRateSyncLogs(authToken, isSuperadmin);

  const refreshSyncLogs = async () => {
    await Promise.all([refreshSyncLogsList(), refreshLastSync()]);
  };

  // Mismos roles que canUseDebugMode (ADMIN/SUPERADMIN) — coincide con el
  // gate de los endpoints /cronjobs/* en el backend.
  const canUseRatingIaBatch = canUseDebugMode;
  const {
    runLogs: ratingIaRunLogs,
    suggestions: ratingIaSuggestions,
    isLoading: isLoadingRatingIa,
    isRunning: isRunningRatingIa,
    runNow: runRatingIaNow,
  } = useRatingIaBatch(authToken, canUseRatingIaBatch);

  const handleUpdateCurrency = async (id: number, input: Partial<Pick<CurrencyRecord, "name" | "symbol" | "is_active">>) => {
    const updated = await updateCurrency(id, input);
    if (updated.auditLog && isSuperadmin) prependAuditLog(updated.auditLog);
  };

  const handleDeleteCurrency = async (id: number) => {
    const result = await deleteCurrency(id);
    if (result.auditLog && isSuperadmin) prependAuditLog(result.auditLog);
  };

  const allSettings = useMemo(() => Object.values(settings).flat(), [settings]);
  const cronHour = allSettings.find(s => s.key === "tasa_cambio_cron_hora")?.value || "10:00";
  const cronEnabled = allSettings.find(s => s.key === "tasa_cambio_cron_habilitado")?.value !== "false";
  const ratingIaFrecuenciaDias = allSettings.find(s => s.key === "rating_ia_cron_frecuencia_dias")?.value || "30";
  const ratingIaCronEnabled = allSettings.find(s => s.key === "rating_ia_cron_habilitado")?.value === "true";
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
  const [exchangeRateEditModalOpen, setExchangeRateEditModalOpen] = useState(false);

  const hasSettingsFor = (group: string) => settings[group]?.length > 0;
  const hasPendingChanges = settingsDraft.dirtyKeys.length > 0 || rulesDraft.dirtyKeys.length > 0;
  const pendingCount = settingsDraft.dirtyKeys.length + rulesDraft.dirtyKeys.length;

  const visibleGroupsByMacro = useMemo(
    () =>
      new Map(
        MACRO_GROUPS.map(macro => [
          macro.key,
          macro.groups.filter(g =>
            g === "__notification_rules__" || g === "__currencies__"
              ? isSuperadmin
              : g === "__debug_mode__"
                ? canUseDebugMode
                : g === "__rating_ia_batch__"
                  ? canUseRatingIaBatch
                  : hasSettingsFor(g),
          ),
        ]),
      ),
    [isSuperadmin, canUseDebugMode, canUseRatingIaBatch, settings],
  );
  const visibleSettingsTabs = MACRO_GROUPS.filter(macro => (visibleGroupsByMacro.get(macro.key)?.length ?? 0) > 0);
  // "usuarios" y "config-keys" ahora son 100% SUPERADMIN en backend (ver
  // routes/api.php: UserController, AccessAdminController, SystemKeyConfigController)
  // — se filtran también aquí para no depender solo de role_view_access
  // (editable por ADMIN antes del endurecimiento) y evitar mostrar un panel
  // cuyas acciones el backend rechazará con 403.
  const SUPERADMIN_ONLY_TABS = new Set(["usuarios", "config-keys"]);
  const visibleExtraTabs = EXTRA_TABS.filter(tab =>
    SUPERADMIN_ONLY_TABS.has(tab.key) ? isSuperadmin : canAccess(tab.route),
  );
  const visibleMacroGroups = [...visibleSettingsTabs, ...visibleExtraTabs];
  const [activeMacroTab, setActiveMacroTab] = useState(MACRO_GROUPS[0].key);
  const activeExtraTab = visibleExtraTabs.find(tab => tab.key === activeMacroTab);

  // Si la tab activa deja de tener contenido visible (ej. pierde isSuperadmin
  // mientras estaba en "Notificaciones" y esa tab solo tenía la matriz de
  // reglas), reconciliar a la primera tab visible en vez de mostrar un panel
  // vacío en silencio.
  //
  // Mientras isLoading es true, `settings` todavía es `{}` — todos los
  // grupos basados en hasSettingsFor() (ej. los de "negocio") se ven vacíos
  // y no cuentan como visibles, pero "Monedas" ya puede parecer visible
  // porque su grupo __currencies__ solo depende de isSuperadmin, no de
  // settings. Sin este guard, este efecto corría durante ESE primer render
  // transitorio, veía que "negocio" (el tab inicial) no estaba en la lista
  // de visibles todavía y reconciliaba a "monedas" — quedando pegado ahí
  // aunque "negocio" sí tuviera contenido una vez cargaran los settings.
  useEffect(() => {
    if (isLoading) return;
    if (visibleMacroGroups.length === 0) return;
    if (!visibleMacroGroups.some(m => m.key === activeMacroTab)) {
      setActiveMacroTab(visibleMacroGroups[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, visibleMacroGroups.map(m => m.key).join(",")]);

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
        showToast("Configuración actualizada correctamente.", "success");
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
      <div className="space-y-6">
        <SkeletonBlock className="h-3 w-24 mb-1" />
        <SkeletonGroup className="space-y-6">
          <SkeletonGroupItem><SkeletonCard /></SkeletonGroupItem>
          <SkeletonGroupItem><SkeletonCard /></SkeletonGroupItem>
        </SkeletonGroup>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {isSuperadmin && !activeExtraTab && missingKeys && missingKeys.length > 0 && (
        <AlertBanner
          type="warning"
          message={
            <>
              <strong>{missingKeys.length}</strong> {missingKeys.length === 1 ? "parámetro documentado no tiene" : "parámetros documentados no tienen"}{" "}
              fila en la base de datos y por eso no aparecen abajo — probablemente falta correr una migración. Claves:{" "}
              <span className="font-mono">{missingKeys.join(", ")}</span>.
            </>
          }
        />
      )}

      <div className={isSuperadmin ? "grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-6 items-start" : ""}>
        <div className="min-w-0">
          <motion.div variants={itemVariants} initial="hidden" animate="visible" className="mb-6">
            <Tabs
              ariaLabel="Secciones de configuración"
              activeKey={activeMacroTab}
              onChange={setActiveMacroTab}
              fullWidth
              tabs={visibleMacroGroups.map(macro => ({ key: macro.key, label: macro.title }))}
            />
          </motion.div>

          {/*
            TabPanel queda deliberadamente FUERA de la cadena de
            containerVariants/itemVariants (a diferencia del resto de esta
            vista): anidarlo dentro de un motion.div con `variants` heredados
            de un ancestro hacía que, al remontar con key={activeKey} en cada
            cambio de tab, Motion resolviera el estado inicial contra los
            variants "hidden"/"visible" del ancestro en vez de respetar el
            `initial`/`animate` inline de TabPanel — el contenido quedaba
            atascado en opacity 0 después del primer cambio de tab. TabPanel
            ya trae su propia transición de entrada, no necesita heredar nada.
          */}
          <TabPanel activeKey={activeMacroTab}>
            {activeExtraTab ? (
              activeExtraTab.key === "usuarios" ? (
                <UsuariosPanel authToken={authToken} activeRole={activeRole} />
              ) : activeExtraTab.key === "proveedores" ? (
                <ProveedoresConfigPanel authToken={authToken} activeRole={activeRole} onContractorMutated={onContractorMutated} />
              ) : activeExtraTab.key === "materiales" ? (
                <MaterialConfigPanel authToken={authToken} activeRole={activeRole} />
              ) : activeExtraTab.key === "config-keys" ? (
                <KeysConfigPanel authToken={authToken} activeRole={activeRole} />
              ) : (
                <AIConfigPanel authToken={authToken} activeRole={activeRole} />
              )
            ) : (
            <div className="space-y-6">
              {(visibleGroupsByMacro.get(activeMacroTab) ?? []).map(group =>
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
                ) : group === "__currencies__" ? (
                  <div key={group} className="space-y-6">
                    <CurrencyCard
                      currencies={currencies}
                      isLoading={isLoadingCurrencies}
                      onUpdate={handleUpdateCurrency}
                      onDelete={handleDeleteCurrency}
                    />
                    <ExchangeRateSyncLogsPanel
                      logs={syncLogs}
                      lastSync={lastSync}
                      isLoading={isLoadingSyncLogs}
                      onEditRate={() => setExchangeRateEditModalOpen(true)}
                      onSyncNow={async () => {
                        const result = await syncNow();
                        await refreshSyncLogs();
                        return result;
                      }}
                      isSyncing={isSyncing}
                      cronHour={cronHour}
                      cronEnabled={cronEnabled}
                    />
                  </div>
                ) : group === "__debug_mode__" ? (
                  <DebugModeCard key={group} />
                ) : group === "__rating_ia_batch__" ? (
                  <RatingIaPanel
                    key={group}
                    runLogs={ratingIaRunLogs}
                    suggestions={ratingIaSuggestions}
                    isLoading={isLoadingRatingIa}
                    isRunning={isRunningRatingIa}
                    onRunNow={runRatingIaNow}
                    cronFrecuenciaDias={ratingIaFrecuenciaDias}
                    cronEnabled={ratingIaCronEnabled}
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
                    readOnly={!isSuperadmin}
                  />
                ),
              )}
            </div>
            )}
          </TabPanel>
        </div>

        {/* Modal para editar tasa */}
        <ExchangeRateEditModal
          isOpen={exchangeRateEditModalOpen}
          onClose={() => setExchangeRateEditModalOpen(false)}
          currencies={currencies}
          authToken={authToken}
          onRateAdded={() => {
            setExchangeRateEditModalOpen(false);
            refreshSyncLogs();
          }}
        />

        {isSuperadmin && (
          <ConfigAuditLogPanel
            title="Historial de cambios"
            logs={auditLogs}
            isLoading={isLoadingAuditLogs}
            settingLabelByKey={settingLabelByKey}
            pagination={{ page: auditLogPage, lastPage: auditLogLastPage, total: auditLogTotal, onPageChange: goToAuditLogPage }}
            filters={auditLogFilters}
            onFilterChange={updateAuditLogFilter}
            onClearFilters={clearAuditLogFilters}
            activeFilterCount={auditLogActiveFilterCount}
          />
        )}
      </div>

      <AnimatePresence>
        {hasPendingChanges && !activeExtraTab && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={springs.gentle}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-surface border border-border-default shadow-xl rounded-container px-5 py-3"
          >
            <span className="text-xs font-bold text-text-secondary">
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
