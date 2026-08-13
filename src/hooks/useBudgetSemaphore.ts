/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Semáforo de ejecución presupuestaria: clasifica un % de ejecución
 * (liberado / aprobado) en verde/amarillo/naranja/rojo según los umbrales
 * configurables en CONFIG APP (`presupuesto.semaforo_umbral_*`), en vez de
 * un corte fijo en código — un cambio de política de riesgo no requiere
 * deploy.
 */

import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { logError } from "../services/logger";

export type SemaphoreLevel = "verde" | "amarillo" | "naranja" | "rojo";

export interface SemaphoreThresholds {
  verde: number;
  amarillo: number;
  naranja: number;
}

const DEFAULT_THRESHOLDS: SemaphoreThresholds = { verde: 80, amarillo: 95, naranja: 100 };

interface RawSetting {
  key: string;
  value: string | null;
}

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
  const [thresholds, setThresholds] = useState<SemaphoreThresholds>(DEFAULT_THRESHOLDS);

  useEffect(() => {
    let cancelled = false;

    apiFetch<Record<string, RawSetting[]>>("/settings", { token: "authenticated" })
      .then(data => {
        if (cancelled) return;
        const presupuesto = data.presupuesto ?? [];
        const find = (key: string, fallback: number) => {
          const raw = presupuesto.find(s => s.key === key)?.value;
          const parsed = raw !== null && raw !== undefined ? Number(raw) : NaN;
          return Number.isFinite(parsed) ? parsed : fallback;
        };
        setThresholds({
          verde: find("semaforo_umbral_verde", DEFAULT_THRESHOLDS.verde),
          amarillo: find("semaforo_umbral_amarillo", DEFAULT_THRESHOLDS.amarillo),
          naranja: find("semaforo_umbral_naranja", DEFAULT_THRESHOLDS.naranja),
        });
      })
      .catch(err => logError("useBudgetSemaphore", err));

    return () => {
      cancelled = true;
    };
  }, []);

  return { thresholds, levelOf: (pct: number) => levelOf(pct, thresholds) };
}
