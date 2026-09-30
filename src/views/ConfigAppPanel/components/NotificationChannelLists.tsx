/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Interruptores por canal de la pestaña Notificaciones: dos listas de chips
 * ("Acciones que envían notificación (app)" y "Acciones que envían correo").
 * Cada chip seleccionado = canal encendido para esa acción (`appEnabled` /
 * `mailEnabled`, una sola fuente de verdad junto con la matriz de roles).
 * Las acciones críticas no pueden salir de la lista app y el correo de
 * restablecimiento de contraseña no puede salir de la lista de correo.
 *
 * Componente controlado: el borrador y el guardado viven en ConfigAppPanel.
 */

import { motion } from "motion/react";
import { Bell, Mail } from "lucide-react";
import { itemVariants } from "@/animations";
import Card from "@/components/UI/Card";
import SectionHeader from "@/components/UI/SectionHeader";
import TagMultiSelect from "@/components/UI/TagMultiSelect";
import type { NotificationActionOption, NotificationRuleChannels } from "@/hooks/useNotificationRules";

const ALWAYS_ON_MAIL = "Correo de restablecimiento de contrasena";

interface NotificationChannelListsProps {
  actions: NotificationActionOption[];
  valueOf: (action: string) => NotificationRuleChannels;
  onChange: (action: string, channels: NotificationRuleChannels) => void;
  readOnly?: boolean;
}

export default function NotificationChannelLists({ actions, valueOf, onChange, readOnly }: NotificationChannelListsProps) {
  const appActions = actions.filter(a => a.recipientType === "roles");
  const appOptions = appActions.map(a => ({ value: a.value, label: a.label }));
  const mailOptions = actions.map(a => ({ value: a.value, label: a.label }));

  const appSelected = appActions.filter(a => valueOf(a.value).appEnabled).map(a => a.value);
  const mailSelected = actions.filter(a => valueOf(a.value).mailEnabled).map(a => a.value);

  const lockedApp = appActions.filter(a => a.critical).map(a => a.value);
  const lockedMail = actions.filter(a => a.value === ALWAYS_ON_MAIL).map(a => a.value);

  const apply = (channel: "app" | "mail", options: { value: string }[], locked: string[], next: string[]) => {
    const wanted = new Set([...next, ...locked]);
    for (const option of options) {
      const current = valueOf(option.value);
      const isOn = channel === "app" ? current.appEnabled : current.mailEnabled;
      const shouldBeOn = wanted.has(option.value);
      if (isOn === shouldBeOn) continue;
      onChange(option.value, channel === "app" ? { ...current, appEnabled: shouldBeOn } : { ...current, mailEnabled: shouldBeOn });
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <Card>
        <SectionHeader
          icon={<Bell className="h-5 w-5" />}
          title="Canales de notificación"
          description="Qué acciones notifican y por qué canal. A qué roles les llega cada una se elige más abajo."
          color="indigo"
        />

        <div className="space-y-6 mt-4">
          <section>
            <div className="mb-2 flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5 text-text-muted" />
              <p className="text-sm font-bold text-text-secondary">Acciones que envían notificación (app)</p>
            </div>
            <p className="text-xs text-text-muted mb-2">
              Lista de acciones auditadas que generan notificación push y bandeja interna. Quite las que no ameriten aviso
              para no generar ruido.
            </p>
            <TagMultiSelect
              options={appOptions}
              value={appSelected}
              onChange={next => apply("app", appOptions, lockedApp, next)}
              disabled={readOnly}
            />
          </section>

          <section>
            <div className="mb-2 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-text-muted" />
              <p className="text-sm font-bold text-text-secondary">Acciones que envían correo</p>
            </div>
            <p className="text-xs text-text-muted mb-2">
              Lista de acciones auditadas que además de push y bandeja interna disparan un correo (para no generar spam con
              cada acción). Incluye los correos a proveedores y al usuario, que no tienen selección de roles.
            </p>
            <TagMultiSelect
              options={mailOptions}
              value={mailSelected}
              onChange={next => apply("mail", mailOptions, lockedMail, next)}
              disabled={readOnly}
            />
          </section>

          <p className="text-[11px] text-text-muted">
            Las acciones críticas y el correo de restablecimiento de contraseña no pueden desactivarse.
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
