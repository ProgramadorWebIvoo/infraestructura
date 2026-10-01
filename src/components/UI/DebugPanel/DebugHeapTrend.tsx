/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sparkline del heap de JS (últimas muestras) con aviso si crece de forma
 * sostenida sin que el GC lo recupere — posible fuga de memoria (heurística,
 * ver detectHeapGrowth).
 */

import { AlertTriangle } from "lucide-react";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { buildSparklinePoints, detectHeapGrowth } from "@/utils/debugPerformance";

const WIDTH = 240;
const HEIGHT = 36;

export default function DebugHeapTrend({ samplesMb }: { samplesMb: readonly number[] }) {
  const points = buildSparklinePoints(samplesMb, WIDTH, HEIGHT);
  const growing = detectHeapGrowth(samplesMb);
  const warning = SEMANTIC_COLOR_MAP.warning;

  if (!points) {
    return <p className="mt-2 text-[10px] text-text-tertiary">Reuniendo muestras del heap (una cada 2 s)…</p>;
  }

  return (
    <div className="mt-2 space-y-1.5">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-9 w-full" role="img" aria-label="Tendencia del heap de JavaScript">
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" className={growing ? warning.text600 : "text-slate-400"} />
      </svg>
      {growing && (
        <p className={`flex items-center gap-1 rounded-control px-2 py-1 text-[10px] font-bold ${warning.bg50} ${warning.text700}`}>
          <AlertTriangle className="h-3 w-3 shrink-0" />
          El heap crece de forma sostenida sin recuperarse — posible fuga de memoria.
        </p>
      )}
    </div>
  );
}
