import { motion } from "motion/react";
import { Activity, Brain, Database, Loader2 } from "lucide-react";
import { itemVariants } from "../../animations";
import { PROVIDER_LABELS, providerColor } from "../../constants/aiProviders";
import type { AiUsageByProvider, AiUsageData, AiUsageTotals } from "../../hooks/useAIConfig";
import KpiCard from "../../components/UI/KpiCard";
import MiniBarChart from "./MiniBarChart";
import { formatAiCost } from "../../utils/aiFormat";

// ---------------------------------------------------------------------------
// KPIs del período
// ---------------------------------------------------------------------------
const EMPTY_TOTALS: AiUsageTotals = {
  prompt_tokens: 0,
  completion_tokens: 0,
  total_tokens: 0,
  total_cost: 0,
  total_requests: 0,
  successful_requests: 0,
  failed_requests: 0,
};

function UsageKpis({ totals }: { totals: AiUsageTotals | null }) {
  const { total_requests: totalRequests, successful_requests: successfulRequests, failed_requests: failedRequests } = totals ?? EMPTY_TOTALS;
  const successRate =
    totalRequests > 0
      ? `${((successfulRequests / totalRequests) * 100).toFixed(1)}%`
      : "—";

  return (
    <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        icon={<Activity className="h-5 w-5" />}
        label="Peticiones"
        value={(totals?.total_requests ?? 0).toLocaleString()}
        sub={`${(totals?.successful_requests ?? 0).toLocaleString()} exitosas`}
        color="border-l-violet-400"
      />
      <KpiCard
        icon={<Brain className="h-5 w-5" />}
        label="Tokens"
        value={(totals?.total_tokens ?? 0).toLocaleString()}
        sub={`${(totals?.prompt_tokens ?? 0).toLocaleString()} prompt / ${(totals?.completion_tokens ?? 0).toLocaleString()} completion`}
        color="border-l-sky-400"
      />
      <KpiCard
        icon={<Database className="h-5 w-5" />}
        label="Costo estimado"
        value={formatAiCost(totals?.total_cost)}
        color="border-l-emerald-400"
      />
      <KpiCard
        icon={<Activity className="h-5 w-5" />}
        label="Tasa de éxito"
        value={successRate}
        sub={`${failedRequests.toLocaleString()} fallidas`}
        color="border-l-amber-400"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Barra de consumo por proveedor
// ---------------------------------------------------------------------------
interface ProviderUsage {
  provider: AiUsageByProvider;
  /** Fracción 0–1 del total de tokens del período. */
  pctOfTotal: number;
}

function ProviderUsageBar({ provider }: { provider: ProviderUsage }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-700">
          {PROVIDER_LABELS[provider.provider.provider] ?? provider.provider.provider}
        </span>
        <span className="font-mono text-[11px] font-black text-slate-900">
          {provider.provider.total_tokens.toLocaleString()} tokens
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${providerColor(provider.provider.provider).bar}`}
          style={{ width: `${provider.pctOfTotal * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{provider.provider.requests} peticiones</span>
        <span>{formatAiCost(provider.provider.cost)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard de uso
// ---------------------------------------------------------------------------
export default function UsageDashboard({
  usage,
  isUsageLoading,
  usageDays,
  onUsageDaysChange,
}: {
  usage: AiUsageData | null;
  isUsageLoading: boolean;
  usageDays: number;
  onUsageDaysChange: (days: number) => void;
}) {
  const totalTokens = usage?.totals.total_tokens ?? 0;
  const providersWithShare: ProviderUsage[] =
    usage?.byProvider.map((p) => ({
      provider: p,
      pctOfTotal: totalTokens > 0 ? p.total_tokens / totalTokens : 0,
    })) ?? [];

  return (
    <motion.div variants={itemVariants}>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200/80 border-l-4 border-l-violet-400 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700">
            <Activity className="h-3.5 w-3.5" />
            Analytics
          </div>
          <h1 className="font-sans text-lg font-black tracking-tight text-slate-900">
            Dashboard de Uso
          </h1>
          <p className="text-xs font-medium text-slate-500">
            Monitoreo de consumo de tokens, peticiones y costos por proveedor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500">Período:</span>
          <select
            value={usageDays}
            onChange={(e) => onUsageDaysChange(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-hidden focus:ring-2 focus:ring-violet-200"
          >
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
          </select>
        </div>
      </div>

      {isUsageLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      ) : (
        <>
          <UsageKpis totals={usage?.totals ?? null} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200/80 border-l-4 border-l-violet-400 bg-white p-4 shadow-xs lg:col-span-2">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                Consumo diario de tokens
              </h3>
              <MiniBarChart data={usage?.daily ?? []} />
            </div>

            <div className="rounded-xl border border-slate-200/80 border-l-4 border-l-violet-400 bg-white p-4 shadow-xs">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                Por proveedor
              </h3>
              <div className="space-y-3">
                {providersWithShare.length > 0 ? (
                  providersWithShare.map((p) => (
                    <ProviderUsageBar key={p.provider.provider} provider={p} />
                  ))
                ) : (
                  <p className="py-8 text-center text-xs text-slate-400">Sin actividad registrada.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
