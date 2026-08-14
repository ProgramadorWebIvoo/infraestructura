/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tope de anticipo configurable desde CONFIG APP
 * (`presupuesto.anticipo_maximo_porcentaje`), para vistas autenticadas que
 * capturan un % de anticipo negociado (ej. registro de ofertas de Analistas).
 * Fallback a 100 mientras carga o si el fetch falla, igual que el backend.
 *
 * Proyección pura sobre PublicSettingsProvider (fetch único y compartido de
 * /settings para toda la sesión) — antes este hook hacía su propio fetch
 * independiente; vistas que montan varios de estos hooks juntos (ej.
 * BidEvaluationSection) disparaban un GET /settings por cada uno.
 */

import { usePublicSettings } from "../components/UI/PublicSettingsProvider";

const DEFAULT_MAX_ADVANCE_PERCENT = 100;

export function useMaxAdvancePercent(): number {
  const { settings } = usePublicSettings();
  const raw = settings.presupuesto?.find(s => s.key === "anticipo_maximo_porcentaje")?.value;
  const parsed = raw !== null && raw !== undefined ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : DEFAULT_MAX_ADVANCE_PERCENT;
}
