/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Caché compartida de `GET /settings` para toda la sesión. Migrado de
 * Context a Zustand (stores/publicSettingsStore.ts) — un solo fetch al
 * montar (gateado por sesión), cacheado en memoria mientras dure la sesión.
 * Sin revalidación automática: trade-off aceptado a propósito (estos
 * valores casi no cambian).
 *
 * `usePollingSettings`/`useMaxAdvancePercent`/`useBudgetSemaphore` siguen
 * siendo proyecciones puras sobre este store compartido, sin fetch propio.
 */

import { useEffect, type ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePublicSettingsStore, type SettingsByGroup } from "../../stores/publicSettingsStore";

export type { RawSetting, SettingsByGroup } from "../../stores/publicSettingsStore";

interface PublicSettingsContextValue {
  settings: SettingsByGroup;
  isLoading: boolean;
}

export function PublicSettingsProvider({ children }: { children: ReactNode }) {
  const { authToken } = useAuth();
  const load = usePublicSettingsStore(s => s.load);

  useEffect(() => {
    if (authToken) load(authToken);
  }, [authToken, load]);

  return <>{children}</>;
}

export function usePublicSettings(): PublicSettingsContextValue {
  const settings = usePublicSettingsStore(s => s.settings);
  const isLoading = usePublicSettingsStore(s => s.isLoading);
  return { settings, isLoading };
}
