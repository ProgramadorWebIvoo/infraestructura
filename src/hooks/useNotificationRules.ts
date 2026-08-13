/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Matriz configurable rol × acción × canal (CONFIG APP, exclusivo
 * SUPERADMIN) — quién recibe cada tipo de notificación, reemplazando la
 * lógica fija anterior (indexada por estado del proyecto). `rules` es el
 * estado ya guardado (equivalente a `settings` en useAppSettings); el
 * borrador local y cuándo llamar a `updateRule()` por acción los maneja
 * ConfigAppPanel, igual que hace con AppSetting — todo se persiste desde la
 * única barra "Guardar todo".
 */

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { logError } from "../services/logger";

export interface NotificationRuleChannels {
  app: string[];
  mail: string[];
}

export type NotificationRulesByAction = Record<string, NotificationRuleChannels>;

export interface NotificationActionOption {
  value: string;
  label: string;
  group: string | null;
  critical: boolean;
}

interface NotificationRulesResponse {
  actions: NotificationActionOption[];
  roles: string[];
  rules: NotificationRulesByAction;
  unconfigured: string[];
}

export function useNotificationRules(authToken: string, enabled: boolean) {
  const [actions, setActions] = useState<NotificationActionOption[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [rules, setRules] = useState<NotificationRulesByAction>({});
  const [unconfigured, setUnconfigured] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!authToken || !enabled) return;
    setIsLoading(true);
    try {
      const data = await apiFetch<NotificationRulesResponse>("/notification-rules", { token: authToken });
      setActions(data.actions ?? []);
      setRoles(data.roles ?? []);
      setRules(data.rules ?? {});
      setUnconfigured(data.unconfigured ?? []);
    } catch (err) {
      logError("useNotificationRules.load", err);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [authToken, enabled]);

  useEffect(() => {
    if (enabled && !hasLoaded) load();
  }, [enabled, hasLoaded, load]);

  const updateRule = useCallback(
    async (action: string, channels: NotificationRuleChannels): Promise<void> => {
      const updated = await apiFetch<{ action: string; app: string[]; mail: string[] }>("/notification-rules", {
        method: "PUT",
        body: JSON.stringify({ action, app: channels.app, mail: channels.mail }),
        token: authToken,
      });

      setRules(prev => ({ ...prev, [updated.action]: { app: updated.app, mail: updated.mail } }));
      setUnconfigured(prev => prev.filter(a => a !== updated.action));
    },
    [authToken],
  );

  return { actions, roles, rules, unconfigured, isLoading, updateRule, reload: load };
}
