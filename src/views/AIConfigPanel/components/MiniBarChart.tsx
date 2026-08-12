import { useMemo, useState } from "react";
import type { AiUsageDaily } from "../../../hooks/useAIConfig";

type ViewMode = "daily" | "weekly";

function TabButton({
  label,
  mode,
  active,
  onClick,
}: {
  label: string;
  mode: ViewMode;
  active: boolean;
  onClick: (mode: ViewMode) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(mode)}
      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-t-md transition-colors cursor-pointer ${
        active
          ? "bg-violet-100 text-violet-700 border-b-2 border-violet-500"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

export default function MiniBarChart({ data }: { data: AiUsageDaily[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("daily");

  // Todos los hooks se ejecutan incondicionalmente (regla de hooks): el early
  // return de "sin datos" estaba antes de useMemo → cuando `data` pasaba de
  // vacío a no vacío React lanzaba "Rendered fewer hooks than expected".
  const { currentData, maxVal } = useMemo(() => {
    if (!data || data.length === 0) {
      return { currentData: [] as AiUsageDaily[], maxVal: 1 };
    }
    const slice = viewMode === "daily" ? data.slice(-14) : data.slice(-7);
    return {
      currentData: slice,
      maxVal: Math.max(...slice.map((d) => d.total_tokens), 1),
    };
  }, [data, viewMode]);

  const chartLabel = useMemo(() => {
    const lines = currentData
      .map((d) => `${d.date.slice(5)}: ${d.total_tokens.toLocaleString()} tokens`)
      .join(", ");
    return `Gráfico de uso de tokens. ${lines}. Máximo: ${maxVal.toLocaleString()}`;
  }, [currentData, maxVal]);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-400">
        Sin datos de uso en este período.
      </div>
    );
  }

  const isDaily = viewMode === "daily";

  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-slate-200 pb-2">
        <TabButton label="Diario (14d)" mode="daily" active={isDaily} onClick={setViewMode} />
        <TabButton label="7 días" mode="weekly" active={!isDaily} onClick={setViewMode} />
      </div>

      <div role="img" aria-label={chartLabel}>
        {isDaily ? (
          /* ── Horizontal bar chart ── */
          <div className="space-y-1.5">
            {currentData.map((d) => {
              const pct = Math.max(1, (d.total_tokens / maxVal) * 100);
              const shortDate = d.date.slice(5);
              const tokensStr = d.total_tokens.toLocaleString();

              return (
                <div key={d.date} className="flex items-center gap-2 text-[10px]">
                  <span className="text-slate-400 w-14 text-right shrink-0 font-mono">{shortDate}</span>
                  <span className="text-slate-500 w-[72px] text-right shrink-0 font-mono font-bold">{tokensStr}</span>
                  <div className="flex-1 h-5 rounded-md bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-md bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Vertical bar chart ── */
          <div className="flex items-end gap-1 h-32 pb-4">
            {currentData.map((d) => {
              const pct = Math.max(0, (d.total_tokens / maxVal) * 100);
              const barHeightPx = Math.max(3, (d.total_tokens / maxVal) * 96); // 96px = alto útil de h-32
              const shortDate = d.date.slice(5);
              const tokensStr = d.total_tokens.toLocaleString();

              return (
                <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-0 h-full">
                  <span className="text-[9px] text-slate-500 font-mono font-bold">{tokensStr}</span>
                  <div className="w-full flex-1 flex flex-col justify-end rounded-t-md overflow-hidden">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-sky-500 to-sky-400 transition-all duration-500"
                      style={{ height: `${barHeightPx}px` }}
                      title={`${d.date}: ${tokensStr} tokens (${Math.round(pct)}% del máximo)`}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">{shortDate}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gradient-to-r from-sky-500 to-sky-400" />
          Tokens
        </span>
        <span className="ml-auto font-mono font-bold text-slate-500">Max: {maxVal.toLocaleString()}</span>
      </div>
    </div>
  );
}
