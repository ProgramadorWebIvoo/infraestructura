/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ¿El rol del usuario en sesión está en el setting `tasa_switch_roles`
 * (CONFIG APP → Monedas)? Proyección pura sobre `publicSettingsStore` y
 * `usdRateModeStore.sessionRole`, sin fetch propio. Mientras los settings no
 * cargan (o el JSON es inválido) devuelve false: nadie queda en modo USDT ni
 * ve el switch por error. Lo consumen useCurrencyConversion (modo efectivo)
 * y RateModeSwitch (visibilidad).
 */

import { useMemo } from "react";
import { usePublicSettingsStore } from "@/stores/publicSettingsStore";
import { useUsdRateModeStore } from "@/stores/usdRateModeStore";

export const RATE_SWITCH_ROLES_KEY = "tasa_switch_roles";

function parseRoles(raw: string | null | undefined): string[] | null {
  if (raw == null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((r): r is string => typeof r === "string") : null;
  } catch {
    return null;
  }
}

export function useRateSwitchRoleAllowed(): boolean {
  const sessionRole = useUsdRateModeStore(s => s.sessionRole);
  const rawRoles = usePublicSettingsStore(
    s => s.settings.sincronizacion_tasa?.find(setting => setting.key === RATE_SWITCH_ROLES_KEY)?.value,
  );

  return useMemo(() => {
    if (!sessionRole) return false;
    return parseRoles(rawRoles)?.includes(sessionRole) ?? false;
  }, [sessionRole, rawRoles]);
}
