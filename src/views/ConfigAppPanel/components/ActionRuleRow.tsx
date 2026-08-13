/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Una fila de la matriz de notificaciones: una acción, con dos selectores de
 * roles (App y Correo). Colapsada por defecto — con ~35 acciones, mostrar
 * los dos selectores de todas a la vez hace la sección enorme; cada fila se
 * expande solo si el usuario quiere revisarla o cambiarla.
 *
 * Componente controlado puro (como SettingRow): no tiene guardado propio ni
 * estado de "dirty" local — el borrador y el guardado (global, vía la barra
 * "Guardar todo" de ConfigAppPanel) los maneja el padre.
 *
 * `silencedChannels` refleja el interruptor maestro (`acciones_con_notificacion_app`/
 * `acciones_con_correo`, editable en la sección "Notificaciones" de más
 * arriba): son dos capas independientes que se combinan con AND en el
 * backend — un canal silenciado acá no notifica a nadie sin importar qué
 * roles tenga marcados en esta fila. El selector de ese canal queda
 * deshabilitado (sigue siendo visible, para no ocultar la configuración ya
 * guardada) con un badge explicando por qué.
 */

import { useState } from "react";
import { ChevronDown, AlertTriangle, BellOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import RoleMultiSelect from "../../../components/UI/RoleMultiSelect";
import FieldError from "../../../components/UI/FieldError";
import type { NotificationRuleChannels } from "../../../hooks/useNotificationRules";

type Channel = "app" | "mail";

interface ActionRuleRowProps {
  action: string;
  label: string;
  roles: string[];
  value: NotificationRuleChannels;
  onChange: (channels: NotificationRuleChannels) => void;
  isCritical: boolean;
  isUnconfigured: boolean;
  isDirty: boolean;
  error?: string;
  silencedChannels?: Channel[];
}

export default function ActionRuleRow({
  action,
  label,
  roles,
  value,
  onChange,
  isCritical,
  isUnconfigured,
  isDirty,
  error,
  silencedChannels = [],
}: ActionRuleRowProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isAppSilenced = silencedChannels.includes("app");
  const isMailSilenced = silencedChannels.includes("mail");
  const isFullySilenced = isAppSilenced && isMailSilenced;

  return (
    <div id={`notification-rule-${action}`} className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-2.5 py-3 text-left cursor-pointer"
      >
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.15 }} className="shrink-0">
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </motion.span>

        <span className={`flex-1 min-w-0 text-sm font-bold truncate ${isFullySilenced ? "text-slate-400" : "text-slate-700"}`}>{label}</span>

        <div className="flex items-center gap-1.5 shrink-0">
          {isFullySilenced && (
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-1.5 py-0.5">
              <BellOff className="h-2.5 w-2.5" />
              Silenciada
            </span>
          )}
          {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Cambios sin guardar" />}
          {isUnconfigured && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
          {isCritical && (
            <span className="text-[9px] font-bold uppercase tracking-wide text-rose-500 bg-rose-50 border border-rose-100 rounded-full px-1.5 py-0.5">
              Crítica
            </span>
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pb-3.5 space-y-3">
              {isUnconfigured && (
                <p className="flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Sin configurar — usando SUPERADMIN/ADMIN por defecto
                </p>
              )}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Notificación (app)</span>
                  {isAppSilenced && (
                    <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 rounded-full px-1.5 py-0.5">
                      Desactivada en "Acciones que envían notificación (app)"
                    </span>
                  )}
                </div>
                <RoleMultiSelect roles={roles} value={value.app} onChange={app => onChange({ ...value, app })} disabled={isAppSilenced} />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Correo</span>
                  {isMailSilenced && (
                    <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 rounded-full px-1.5 py-0.5">
                      Desactivada en "Acciones que envían correo"
                    </span>
                  )}
                </div>
                <RoleMultiSelect roles={roles} value={value.mail} onChange={mail => onChange({ ...value, mail })} disabled={isMailSilenced} />
              </div>
              <FieldError message={error} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
