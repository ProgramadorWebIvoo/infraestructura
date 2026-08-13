/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tope de anticipo configurable desde CONFIG APP
 * (`presupuesto.anticipo_maximo_porcentaje`), para vistas autenticadas que
 * capturan un % de anticipo negociado (ej. registro de ofertas de Analistas).
 * Fallback a 100 mientras carga o si el fetch falla, igual que el backend.
 */

import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { logError } from "../services/logger";

const DEFAULT_MAX_ADVANCE_PERCENT = 100;

interface RawSetting {
  key: string;
  value: string | null;
}

export function useMaxAdvancePercent(): number {
  const [maxAdvancePercent, setMaxAdvancePercent] = useState(DEFAULT_MAX_ADVANCE_PERCENT);

  useEffect(() => {
    let cancelled = false;

    apiFetch<Record<string, RawSetting[]>>("/settings", { token: "authenticated" })
      .then(data => {
        if (cancelled) return;
        const raw = data.presupuesto?.find(s => s.key === "anticipo_maximo_porcentaje")?.value;
        const parsed = raw !== null && raw !== undefined ? Number(raw) : NaN;
        setMaxAdvancePercent(Number.isFinite(parsed) ? parsed : DEFAULT_MAX_ADVANCE_PERCENT);
      })
      .catch(err => logError("useMaxAdvancePercent", err));

    return () => {
      cancelled = true;
    };
  }, []);

  return maxAdvancePercent;
}
