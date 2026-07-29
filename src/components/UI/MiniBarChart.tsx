import { useState, useMemo } from "react";
import type { AiUsageDaily } from "../../hooks/useAIConfig";

export default function MiniBarChart({ data }: { data: AiUsageDaily[] }) {
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");

  if (!data || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-400">
        Sin datos de uso en este período.
      </div>
    );
  }

  const dailyData = data.slice(-14);
  const weeklyData = data.slice(-7);

  const currentData = viewMode === "daily" ? dailyData : weeklyData;
  const maxVal = Math.max(...currentData.map((d) => d.total_tokens), 1);

  const chartLabel = useMemo(() => {
    const lines = currentData.map(d => `${d.date.slice(5)}: ${d.total_tokens.toLocaleString()} tokens`).join(", ");
    return `Gráfico de uso de tokens. ${lines}. Máximo: ${maxVal.toLocaleString()}`;
  }, [currentData, maxVal]);

  const TabButton = ({ label, mode }: { label: string; mode: "daily" | "weekly" }) => (
    <button
      onClick={() => setViewMode(mode)}
      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-t-md transition-colors cursor-pointer ${
        viewMode === mode
          ? "bg-violet-100 text-violet-700 border-b-2 border-violet-500"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
    </button>
  );

  const isDaily = viewMode === "daily";

  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-slate-200 pb-2">
        <TabButton label="Diario (14d)" mode="daily" />
        <TabButton label="7 días" mode="weekly" />
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
              const pct = Math.max(1, (d.total_tokens / maxVal) * 100);
              const shortDate = d.date.slice(5);
              const tokensStr = d.total_tokens.toLocaleString();

              return (
                <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <span className="text-[9px] text-slate-500 font-mono font-bold">{tokensStr}</span>
                  <div className="w-full flex-1 flex flex-col justify-end rounded-t-md overflow-hidden">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-sky-500 to-sky-400 transition-all duration-500"
                      style={{ height: `${pct}%` }}
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
