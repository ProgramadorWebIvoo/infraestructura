/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tab "Performance" del DEBUG-MODE: Web Vitals (LCP/CLS/FCP + long tasks,
 * ver installPerfObservers en debugStore.ts), memoria del heap de JS
 * (Chrome-only, performance.memory) y un resumen de red derivado de las
 * entradas `kind: "http"` ya capturadas por el tab Network — no duplica
 * captura, solo agrega otra lectura sobre el mismo buffer.
 */

import { useEffect, useMemo, useState } from "react";
import { Activity, Gauge, HardDrive, Timer } from "lucide-react";
import { useDebugStore, usePerfStore } from "@/stores/debugStore";

const MEMORY_POLL_MS = 2000;

interface MemorySnapshot {
  usedMb: number;
  totalMb: number;
  limitMb: number;
}

/** performance.memory es no-estándar (solo Chromium) — undefined en Firefox/Safari. */
function readMemory(): MemorySnapshot | null {
  const perf = performance as Performance & {
    memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
  };
  if (!perf.memory) return null;
  const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;
  return {
    usedMb: toMb(perf.memory.usedJSHeapSize),
    totalMb: toMb(perf.memory.totalJSHeapSize),
    limitMb: toMb(perf.memory.jsHeapSizeLimit),
  };
}

function useMemorySnapshot(): MemorySnapshot | null {
  const [memory, setMemory] = useState<MemorySnapshot | null>(() => readMemory());
  useEffect(() => {
    const interval = setInterval(() => setMemory(readMemory()), MEMORY_POLL_MS);
    return () => clearInterval(interval);
  }, []);
  return memory;
}

function ratingFor(metric: "lcp" | "cls" | "fcp", value: number): "good" | "needs-improvement" | "poor" {
  // Umbrales estándar de Web Vitals (web.dev/vitals) — no configurables, son
  // el criterio público con el que Google/Lighthouse clasifican estas métricas.
  if (metric === "lcp") return value <= 2500 ? "good" : value <= 4000 ? "needs-improvement" : "poor";
  if (metric === "cls") return value <= 0.1 ? "good" : value <= 0.25 ? "needs-improvement" : "poor";
  return value <= 1800 ? "good" : value <= 3000 ? "needs-improvement" : "poor";
}

const RATING_CLASS: Record<string, string> = {
  good: "bg-success-50 text-success-700",
  "needs-improvement": "bg-warning-50 text-warning-700",
  poor: "bg-danger-50 text-danger-700",
};

export default function DebugPerformancePanel() {
  const perfMetrics = usePerfStore(s => s.perfMetrics);
  const memory = useMemorySnapshot();
  const entries = useDebugStore(s => s.entries);

  const networkSummary = useMemo(() => {
    const httpEntries = entries.filter(e => e.kind === "http" && typeof e.durationMs === "number");
    if (httpEntries.length === 0) return null;
    const durations = httpEntries.map(e => e.durationMs as number);
    const total = durations.reduce((sum, d) => sum + d, 0);
    const slowest = httpEntries
      .slice()
      .sort((a, b) => (b.durationMs as number) - (a.durationMs as number))
      .slice(0, 5);
    return {
      count: httpEntries.length,
      avgMs: Math.round(total / httpEntries.length),
      maxMs: Math.round(Math.max(...durations)),
      slowest,
    };
  }, [entries]);

  return (
    <div className="space-y-4">
      <section>
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-text-tertiary">Web Vitals (esta pestaña)</p>
        <div className="grid grid-cols-3 gap-2">
          <VitalCard label="LCP" value={perfMetrics.lcpMs} unit="ms" metric="lcp" />
          <VitalCard label="CLS" value={perfMetrics.clsScore} unit="" metric="cls" decimals={3} />
          <VitalCard label="FCP" value={perfMetrics.fcpMs} unit="ms" metric="fcp" />
        </div>
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-text-tertiary">
          <Timer className="h-3 w-3 shrink-0" />
          {perfMetrics.longTasksCount} long task{perfMetrics.longTasksCount === 1 ? "" : "s"} (&gt;50ms bloqueando el hilo principal) desde que se abrió la pestaña.
        </p>
      </section>

      <section>
        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-text-tertiary">
          <HardDrive className="h-3 w-3" /> Memoria (heap de JS)
        </p>
        {memory ? (
          <div className="rounded-control border border-border-default bg-white p-3">
            <div className="h-2 w-full overflow-hidden rounded-pill bg-slate-100">
              <div
                className="h-full rounded-pill bg-brand-500"
                style={{ width: `${Math.min(100, (memory.usedMb / memory.limitMb) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-text-secondary">
              {memory.usedMb} MB usados de {memory.totalMb} MB asignados (límite del navegador: {memory.limitMb} MB)
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-text-tertiary">performance.memory no disponible en este navegador (solo Chromium).</p>
        )}
      </section>

      <section>
        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-text-tertiary">
          <Activity className="h-3 w-3" /> Red (buffer actual del tab Network)
        </p>
        {networkSummary ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Requests" value={String(networkSummary.count)} />
              <MiniStat label="Promedio" value={`${networkSummary.avgMs}ms`} />
              <MiniStat label="Más lento" value={`${networkSummary.maxMs}ms`} />
            </div>
            <ul className="space-y-1">
              {networkSummary.slowest.map(e => (
                <li key={e.id} className="flex items-center justify-between rounded-control border border-border-default bg-white px-2.5 py-1.5">
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-text-primary">{e.label}</span>
                  <span className="shrink-0 pl-2 font-mono text-[11px] font-bold text-text-tertiary">{e.durationMs}ms</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[11px] text-text-tertiary">Sin requests capturados todavía en este buffer.</p>
        )}
      </section>
    </div>
  );
}

function VitalCard({
  label,
  value,
  unit,
  metric,
  decimals = 0,
}: {
  label: string;
  value: number | undefined;
  unit: string;
  metric: "lcp" | "cls" | "fcp";
  decimals?: number;
}) {
  const rating = value !== undefined ? ratingFor(metric, value) : null;
  return (
    <div className="rounded-control border border-border-default bg-white p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-text-tertiary">
        <Gauge className="h-3 w-3" /> {label}
      </div>
      <p className="mt-1 font-mono text-base font-black text-text-primary">
        {value !== undefined ? `${value.toFixed(decimals)}${unit}` : "—"}
      </p>
      {rating && (
        <span className={`mt-1 inline-block rounded-pill px-1.5 py-0.5 text-[9px] font-black uppercase ${RATING_CLASS[rating]}`}>
          {rating}
        </span>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control border border-border-default bg-white p-2">
      <p className="font-mono text-sm font-black text-text-primary">{value}</p>
      <p className="text-[9px] font-bold uppercase text-text-tertiary">{label}</p>
    </div>
  );
}
