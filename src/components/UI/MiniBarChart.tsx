import { useState } from "react";
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

  const renderHorizontalBar = (value: number, max: number, width = 24) => {
    const filled = Math.max(1, Math.round((value / max) * width));
    const empty = width - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  };

  const isDaily = viewMode === "daily";

  const tabButton = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-t-md transition-colors ${
        active
          ? "bg-violet-100 text-violet-700 border-b-2 border-violet-500"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
    </button>
  );

  if (isDaily) {
    return (
      <div className="space-y-3">
        <div className="flex gap-1 border-b border-slate-200 pb-2">
          {tabButton("Diario (14d)", true, () => setViewMode("daily"))}
          {tabButton("7 días", false, () => setViewMode("weekly"))}
        </div>

        <div className="font-mono text-[10px] text-slate-600 leading-tight">
          {currentData.map((d) => {
            const bar = renderHorizontalBar(d.total_tokens, maxVal, 24);
            const shortDate = d.date.slice(5);
            const tokensStr = d.total_tokens.toLocaleString().padStart(10);

            return (
              <div key={d.date} className="flex items-center gap-2">
                <span className="text-slate-400 w-14 text-right">{shortDate}</span>
                <span className="text-slate-500 w-12 text-right">{tokensStr}</span>
                <span className="text-sky-500" style={{ letterSpacing: "0.5px" }}>{bar}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-2">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 bg-gradient-to-r from-sky-500 to-sky-400 rounded" />
            Tokens
          </span>
          <span className="ml-auto">Max: {maxVal.toLocaleString()}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-slate-200 pb-2">
        {tabButton("Diario (14d)", false, () => setViewMode("daily"))}
        {tabButton("7 días", true, () => setViewMode("weekly"))}
      </div>

      <div className="font-mono text-[9px] text-slate-600 leading-tight">
        <div className="flex items-end gap-1 h-32 pb-4">
          {currentData.map((d) => {
            const barHeight = Math.max(1, Math.round((d.total_tokens / maxVal) * 8));
            const shortDate = d.date.slice(5);
            const tokensStr = d.total_tokens.toLocaleString();

            return (
              <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <span className="text-slate-500 text-right w-full">{tokensStr}</span>
                <div className="flex flex-col items-center" style={{ height: "100%" }}>
                  {Array.from({ length: 8 }, (_, row) => {
                    const isFilled = barHeight >= 8 - row;
                    return (
                      <span
                        key={row}
                        className={`w-6 text-center transition-colors ${
                          isFilled ? "text-sky-500" : "text-slate-200"
                        }`}
                        style={{ letterSpacing: "0.5px" }}
                      >
                        {isFilled ? "█" : "░"}
                      </span>
                    );
                  })}
                </div>
                <span className="text-slate-400">{shortDate}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-2">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-gradient-to-r from-sky-500 to-sky-400 rounded" />
          Tokens
        </span>
        <span className="ml-auto">Max: {maxVal.toLocaleString()}</span>
      </div>
    </div>
  );
}
