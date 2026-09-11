/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Barra de ranking: fila label + valor + barra cuyo ancho es proporcional a
 * `amount` contra el máximo del grupo (`max`), no contra un string ya
 * formateado. Extraído de InsightsSection (Presidencia) al necesitarse
 * también en FinancialSummarySection (Finanzas) — mismo patrón visual para
 * "top N por monto", DRY entre ambas vistas.
 */

interface RankBarProps {
  label: string;
  value: string;
  amount: number;
  max: number;
  /** Atenúa la barra para el caso "sin dato" (ej. "Sin ubicación") — resalta que es un cajón residual, no un valor real. */
  muted?: boolean;
}

export default function RankBar({ label, value, amount, max, muted = false }: RankBarProps) {
  const pct = max > 0 ? Math.min(100, (amount / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-700 truncate group-hover:text-slate-900">{label}</span>
          <span className="text-[10px] font-mono font-black text-slate-600 whitespace-nowrap">{value}</span>
        </div>
        <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1">
          <div
            className="bg-gradient-to-r from-sky-400 to-sky-600 h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, opacity: muted ? 0.5 : 1 }}
          />
        </div>
      </div>
    </div>
  );
}
