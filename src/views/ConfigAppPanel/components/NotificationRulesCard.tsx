/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección "Notificaciones por rol" de CONFIG APP: header + NotificationMatrix.
 * Extraído de ConfigAppPanel/index.tsx junto con SettingGroupCard, para que
 * el contenedor no mezcle JSX de renderizado con lógica de estado.
 */

import { motion } from "motion/react";
import { Users } from "lucide-react";
import { itemVariants } from "../../../animations";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import type { NotificationActionOption, NotificationRuleChannels } from "../../../hooks/useNotificationRules";
import NotificationMatrix from "./NotificationMatrix";

interface NotificationRulesCardProps {
  actions: NotificationActionOption[];
  roles: string[];
  isLoading: boolean;
  valueOf: (action: string) => NotificationRuleChannels;
  onChange: (action: string, channels: NotificationRuleChannels) => void;
  isDirty: (action: string) => boolean;
  unconfigured: string[];
  errors: Partial<Record<string, string>>;
  silencedChannelsFor: (action: string) => ("app" | "mail")[];
}

export default function NotificationRulesCard({
  actions,
  roles,
  isLoading,
  valueOf,
  onChange,
  isDirty,
  unconfigured,
  errors,
  silencedChannelsFor,
}: NotificationRulesCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card>
        <SectionHeader
          icon={<Users className="h-5 w-5" />}
          title="Notificaciones por rol"
          description="Qué roles reciben cada tipo de notificación (app y correo) — reemplaza la lógica fija anterior."
          color="indigo"
        />
        <NotificationMatrix
          actions={actions}
          roles={roles}
          isLoading={isLoading}
          valueOf={valueOf}
          onChange={onChange}
          isDirty={isDirty}
          unconfigured={unconfigured}
          errors={errors as Record<string, string>}
          silencedChannelsFor={silencedChannelsFor}
        />
      </Card>
    </motion.div>
  );
}
