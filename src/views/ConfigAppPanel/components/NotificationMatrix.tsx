/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Matriz configurable rol × acción × canal (CONFIG APP, exclusivo
 * SUPERADMIN) — reemplaza la lógica fija anterior (quién se entera de cada
 * acción, indexada por estado del proyecto). Lista por acción con selector
 * de roles por fila (no una matriz de casillas 35×9×2, inmanejable), cada
 * fila colapsada por defecto — agrupada por categoría, con buscador.
 *
 * Componente controlado: no hace fetch ni guardado propio (eso vive en
 * ConfigAppPanel, junto con el resto del borrador de CONFIG APP, para que
 * todo se guarde desde la única barra "Guardar todo").
 */

import { useMemo, useState } from "react";
import { Search, AlertTriangle } from "lucide-react";
import InfoBanner from "../../../components/UI/InfoBanner";
import Spinner from "../../../components/UI/Spinner";
import type { NotificationActionOption, NotificationRuleChannels } from "../../../hooks/useNotificationRules";
import ActionRuleRow from "./ActionRuleRow";

const GROUP_LABELS: Record<string, string> = {
  proyectos: "Flujo de proyectos",
  documentos: "Documentos",
  usuarios: "Usuarios",
  catalogos: "Catálogos (proveedores y materiales)",
  proveedores: "Proveedores (portal público)",
  sistema: "Sistema",
};

const GROUP_ORDER = ["proyectos", "documentos", "usuarios", "catalogos", "proveedores", "sistema"];

interface NotificationMatrixProps {
  actions: NotificationActionOption[];
  roles: string[];
  isLoading: boolean;
  valueOf: (action: string) => NotificationRuleChannels;
  onChange: (action: string, channels: NotificationRuleChannels) => void;
  isDirty: (action: string) => boolean;
  unconfigured: string[];
  errors: Record<string, string>;
  /** Canales silenciados por el interruptor maestro (`acciones_con_notificacion_app`/`acciones_con_correo`) para esta acción. */
  silencedChannelsFor: (action: string) => ("app" | "mail")[];
}

export default function NotificationMatrix({ actions, roles, isLoading, valueOf, onChange, isDirty, unconfigured, errors, silencedChannelsFor }: NotificationMatrixProps) {
  const [search, setSearch] = useState("");

  const filteredActions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(a => a.label.toLowerCase().includes(q));
  }, [actions, search]);

  const grouped = useMemo(() => {
    const byGroup: Record<string, typeof actions> = {};
    for (const action of filteredActions) {
      const group = action.group ?? "sistema";
      (byGroup[group] ??= []).push(action);
    }
    return byGroup;
  }, [filteredActions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const groupsPresent = GROUP_ORDER.filter(g => grouped[g]?.length);

  return (
    <div className="space-y-4">
      <InfoBanner title="¿Cómo funciona la matriz de notificaciones?" defaultOpen={false} color="indigo">
        <p>
          Cada acción auditada por la app puede notificar a distintos roles por dos canales: <strong>app</strong> (push +
          bandeja interna) y <strong>correo</strong>. Desplegá una fila para elegir los roles — los cambios se guardan
          junto con el resto de CONFIG APP desde "Guardar todo".
        </p>
        <p className="mt-1.5">
          Las acciones marcadas <strong>Crítica</strong> no pueden quedar sin ningún rol en el canal app (siempre al
          menos SUPERADMIN).
        </p>
      </InfoBanner>

      {unconfigured.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>{unconfigured.length}</strong> {unconfigured.length === 1 ? "acción no tiene" : "acciones no tienen"}{" "}
            destinatarios configurados todavía — por ahora solo notifican a SUPERADMIN/ADMIN por defecto.
          </p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar acción..."
          aria-label="Buscar acción"
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-medium text-slate-700"
        />
      </div>

      {groupsPresent.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-8">Sin resultados para esa búsqueda.</p>
      ) : (
        groupsPresent.map(group => (
          <div key={group}>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              {GROUP_LABELS[group] ?? group}
            </h3>
            <div className="rounded-2xl border border-slate-200/80 bg-white px-4">
              {grouped[group].map(action => (
                <ActionRuleRow
                  key={action.value}
                  action={action.value}
                  label={action.label}
                  roles={roles}
                  value={valueOf(action.value)}
                  onChange={channels => onChange(action.value, channels)}
                  isCritical={action.critical}
                  isUnconfigured={unconfigured.includes(action.value)}
                  isDirty={isDirty(action.value)}
                  error={errors[action.value]}
                  silencedChannels={silencedChannelsFor(action.value)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
