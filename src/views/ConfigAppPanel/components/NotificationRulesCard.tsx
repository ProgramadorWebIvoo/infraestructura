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
import { itemVariants } from "@/animations";
import Card from "@/components/UI/Card";
import SectionHeader from "@/components/UI/SectionHeader";
import type { NotificationActionOption, NotificationRuleChannels } from "@/hooks/useNotificationRules";
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
}: NotificationRulesCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card>
        <SectionHeader
          icon={<Users className="h-5 w-5" />}
          title="Notificaciones por rol"
          description="Qué acciones notifican, a qué roles y por qué canal (app / correo)."
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
        />
      </Card>
    </motion.div>
  );
}
