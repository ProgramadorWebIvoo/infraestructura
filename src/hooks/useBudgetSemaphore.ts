/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Semáforo de ejecución presupuestaria: clasifica un % de ejecución
 * (liberado / aprobado) en verde/amarillo/naranja/rojo según los umbrales
 * configurables en CONFIG APP (`presupuesto.semaforo_umbral_*`), en vez de
 * un corte fijo en código — un cambio de política de riesgo no requiere
 * deploy.
 *
 * Proyección pura sobre PublicSettingsProvider (fetch único y compartido de
 * /settings para toda la sesión) — antes este hook hacía su propio fetch
 * independiente; vistas que montan varios de estos hooks juntos (ej.
 * BidEvaluationSection) disparaban un GET /settings por cada uno.
 */

import { usePublicSettings } from "../components/UI/PublicSettingsProvider";

export type SemaphoreLevel = "verde" | "amarillo" | "naranja" | "rojo";

export interface SemaphoreThresholds {
  verde: number;
  amarillo: number;
  naranja: number;
}

const DEFAULT_THRESHOLDS: SemaphoreThresholds = { verde: 80, amarillo: 95, naranja: 100 };

export function levelOf(pct: number, thresholds: SemaphoreThresholds): SemaphoreLevel {
  if (pct <= thresholds.verde) return "verde";
  if (pct <= thresholds.amarillo) return "amarillo";
  if (pct <= thresholds.naranja) return "naranja";
  return "rojo";
}

export const SEMAPHORE_COLORS: Record<SemaphoreLevel, { bar: string; text: string; bg: string; label: string }> = {
  verde: { bar: "bg-gradient-to-r from-emerald-400 to-emerald-600", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Normal" },
  amarillo: { bar: "bg-gradient-to-r from-amber-400 to-amber-500", text: "text-amber-700", bg: "bg-amber-50 border-amber-200", label: "Atención" },
  naranja: { bar: "bg-gradient-to-r from-orange-400 to-orange-600", text: "text-orange-700", bg: "bg-orange-50 border-orange-200", label: "Al límite" },
  rojo: { bar: "bg-gradient-to-r from-rose-400 to-rose-600", text: "text-rose-700", bg: "bg-rose-50 border-rose-200", label: "Sobre-ejecución" },
};

export function useBudgetSemaphore() {
  const { settings } = usePublicSettings();
  const presupuesto = settings.presupuesto ?? [];

  const find = (key: string, fallback: number) => {
    const raw = presupuesto.find(s => s.key === key)?.value;
    const parsed = raw !== null && raw !== undefined ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const thresholds: SemaphoreThresholds = {
    verde: find("semaforo_umbral_verde", DEFAULT_THRESHOLDS.verde),
    amarillo: find("semaforo_umbral_amarillo", DEFAULT_THRESHOLDS.amarillo),
    naranja: find("semaforo_umbral_naranja", DEFAULT_THRESHOLDS.naranja),
  };

  return { thresholds, levelOf: (pct: number) => levelOf(pct, thresholds) };
}
