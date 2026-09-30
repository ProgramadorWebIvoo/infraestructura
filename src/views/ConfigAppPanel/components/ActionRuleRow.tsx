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
 * Cada canal (App / Correo) tiene su propio toggle: apagado, la acción no
 * notifica por ese canal sin importar los roles marcados (el selector queda
 * deshabilitado pero visible). Las acciones de destinatario externo
 * (`recipientType: "external"`: proveedores / usuario que pide un reset) solo
 * tienen el toggle de correo, sin selector de roles. El correo de
 * restablecimiento de contraseña es un flujo de cuenta y no se puede apagar.
 */

import { useState } from "react";
import { ChevronDown, AlertTriangle, BellOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import RoleMultiSelect from "@/components/UI/RoleMultiSelect";
import FieldError from "@/components/UI/FieldError";
import Tooltip from "@/components/UI/Tooltip";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { springs } from "@/animations";
import type { NotificationRuleChannels } from "@/hooks/useNotificationRules";

const ALWAYS_ON_MAIL = "Correo de restablecimiento de contrasena";

interface ChannelToggleProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
}

function ChannelToggle({ label, checked, onChange, disabled, disabledReason }: ChannelToggleProps) {
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-success-500" : "bg-border-default"} ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${checked ? "translate-x-3.5" : "translate-x-0.5"}`} />
    </button>
  );

  return disabledReason ? <Tooltip content={disabledReason}>{button}</Tooltip> : button;
}

interface ActionRuleRowProps {
  action: string;
  label: string;
  roles: string[];
  value: NotificationRuleChannels;
  onChange: (channels: NotificationRuleChannels) => void;
  isCritical: boolean;
  recipientType?: "roles" | "external";
  isUnconfigured: boolean;
  isDirty: boolean;
  error?: string;
}

export default function ActionRuleRow({
  action,
  label,
  roles,
  value,
  onChange,
  isCritical,
  recipientType = "roles",
  isUnconfigured,
  isDirty,
  error,
}: ActionRuleRowProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isExternal = recipientType === "external";
  const isMailLocked = action === ALWAYS_ON_MAIL;
  const isAppOff = isExternal || !value.appEnabled;
  const isMailOff = !value.mailEnabled && !isMailLocked;
  const isFullyOff = isAppOff && isMailOff;

  const danger = SEMANTIC_COLOR_MAP.danger;
  const warning = SEMANTIC_COLOR_MAP.warning;

  return (
    <div id={`notification-rule-${action}`} className="border-b border-border-subtle last:border-0">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-2.5 -mx-2 px-2 py-3 rounded-control text-left cursor-pointer transition-colors hover:bg-surface-sunken"
      >
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={springs.snappy} className="shrink-0">
          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
        </motion.span>

        <span className={`flex-1 min-w-0 text-sm font-bold truncate ${isFullyOff ? "text-text-muted" : "text-text-secondary"}`}>{label}</span>

        <div className="flex items-center gap-1.5 shrink-0">
          {isFullyOff && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-text-tertiary bg-surface-raised border border-border-default rounded-pill px-1.5 py-0.5">
              <BellOff className="h-2.5 w-2.5" />
              Apagado
            </span>
          )}
          {isDirty && (
            <Tooltip content="Cambios sin guardar">
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-warning-400"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
            </Tooltip>
          )}
          {isUnconfigured && (
            <Tooltip content="Sin configurar — usando SUPERADMIN/ADMIN por defecto">
              <AlertTriangle className={`h-3.5 w-3.5 ${warning.icon500}`} />
            </Tooltip>
          )}
          {isCritical && (
            <span className={`text-[10px] font-bold uppercase tracking-wide ${danger.text600} ${danger.bg50} border ${danger.border100} rounded-pill px-1.5 py-0.5`}>
              Crítica
            </span>
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: { height: springs.gentle, opacity: { duration: 0.2, delay: 0.05 } } }}
            exit={{ height: 0, opacity: 0, transition: { height: springs.gentle, opacity: { duration: 0.1 } } }}
            className="overflow-hidden"
          >
            <div className="pb-3.5 space-y-3">
              {isUnconfigured && (
                <p className={`flex items-center gap-1 text-[10px] font-semibold ${warning.text600}`}>
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Sin configurar — usando SUPERADMIN/ADMIN por defecto
                </p>
              )}
              {!isExternal && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ChannelToggle
                      label="Canal app activo"
                      checked={value.appEnabled}
                      onChange={appEnabled => onChange({ ...value, appEnabled })}
                      disabled={isCritical}
                      disabledReason={isCritical ? "Acción crítica: el canal app no se puede apagar" : undefined}
                    />
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Notificación (app)</span>
                    {isAppOff && <span className="text-[10px] font-semibold text-text-tertiary bg-surface-raised rounded-pill px-1.5 py-0.5">Canal apagado</span>}
                  </div>
                  <RoleMultiSelect roles={roles} value={value.app} onChange={app => onChange({ ...value, app })} disabled={isAppOff} />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ChannelToggle
                    label="Canal correo activo"
                    checked={isMailLocked ? true : value.mailEnabled}
                    onChange={mailEnabled => onChange({ ...value, mailEnabled })}
                    disabled={isMailLocked}
                    disabledReason={isMailLocked ? "Flujo de cuenta: no se puede desactivar" : undefined}
                  />
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Correo</span>
                  {isMailOff && <span className="text-[10px] font-semibold text-text-tertiary bg-surface-raised rounded-pill px-1.5 py-0.5">Canal apagado</span>}
                </div>
                {isExternal ? (
                  <p className="text-xs text-text-muted">Destinatario externo (proveedor / usuario)</p>
                ) : (
                  <RoleMultiSelect roles={roles} value={value.mail} onChange={mail => onChange({ ...value, mail })} disabled={isMailOff} />
                )}
              </div>
              <FieldError message={error} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
