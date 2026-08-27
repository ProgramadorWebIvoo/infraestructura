/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aviso opcional editable desde CONFIG APP (`app.home_anuncio`), mostrado en
 * el banner del Home para todos los roles. Proyección pura sobre
 * PublicSettingsProvider (fetch único y compartido de /settings para toda
 * la sesión) — mismo patrón que useMaxAdvancePercent/useBudgetSemaphore.
 */

import { usePublicSettings } from "../components/UI/PublicSettingsProvider";

export function useHomeAnnouncement(): string | null {
  const { settings } = usePublicSettings();
  const raw = settings.app?.find(s => s.key === "home_anuncio")?.value;
  return raw?.trim() ? raw.trim() : null;
}
