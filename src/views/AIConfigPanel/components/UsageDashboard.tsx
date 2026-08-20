import { AnimatePresence, motion, type Variants } from "motion/react";
import { Activity, Brain, Database } from "lucide-react";
import { itemVariants, springs } from "../../../animations";
import { PROVIDER_LABELS, providerColor } from "../../../constants/aiProviders";
import type { AiUsageByProvider, AiUsageData, AiUsageTotals } from "../../../hooks/useAIConfig";
import KpiCard from "../../../components/UI/KpiCard";
import Card from "../../../components/UI/Card";
import { SkeletonBlock, SkeletonStats, SkeletonBarChart, SkeletonProviderList, SkeletonGroup, SkeletonGroupItem } from "../../../components/SkeletonLoader";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";
import Select from "../../../components/UI/Select";
import MiniBarChart from "./MiniBarChart";
import { formatAiCost } from "../../../utils/aiFormat";

// ---------------------------------------------------------------------------
// KPIs del período
// ---------------------------------------------------------------------------
// Variante propia (no reusa itemVariants genérico): itemVariants fue pensado
// para listas verticales con desplazamiento — en un grid de 4 columnas, su
// scale:0.98 + 4 elementos casi simultáneos con staggerChildren:0.04 se
// percibía como un "salto" en bloque en vez de una entrada fluida. Menos
// scale + stagger más pausado da una cascada más legible en grid.
const kpiGridVariants: Variants = {
  hidden: {},
  visible: { transition: { when: "beforeChildren", staggerChildren: 0.08 } },
};
const kpiCardVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: springs.gentle },
};

const USAGE_DAYS_OPTIONS = [
  { value: "7", label: "7 días" },
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
];

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
    <motion.div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4" variants={kpiGridVariants} initial="hidden" animate="visible">
      <motion.div variants={kpiCardVariants}>
        <KpiCard
          icon={<Activity className="h-5 w-5" />}
          label="Peticiones"
          value={(totals?.total_requests ?? 0).toLocaleString()}
          sub={`${(totals?.successful_requests ?? 0).toLocaleString()} exitosas`}
          borderAccent={SEMANTIC_COLOR_MAP.info.borderL400}
        />
      </motion.div>
      <motion.div variants={kpiCardVariants}>
        <KpiCard
          icon={<Brain className="h-5 w-5" />}
          label="Tokens"
          value={(totals?.total_tokens ?? 0).toLocaleString()}
          sub={`${(totals?.prompt_tokens ?? 0).toLocaleString()} prompt / ${(totals?.completion_tokens ?? 0).toLocaleString()} completion`}
          borderAccent={SEMANTIC_COLOR_MAP.brand.borderL400}
        />
      </motion.div>
      <motion.div variants={kpiCardVariants}>
        <KpiCard
          icon={<Database className="h-5 w-5" />}
          label="Costo estimado"
          value={formatAiCost(totals?.total_cost)}
          borderAccent={SEMANTIC_COLOR_MAP.success.borderL400}
        />
      </motion.div>
      <motion.div variants={kpiCardVariants}>
        <KpiCard
          icon={<Activity className="h-5 w-5" />}
          label="Tasa de éxito"
          value={successRate}
          sub={`${failedRequests.toLocaleString()} fallidas`}
          borderAccent={SEMANTIC_COLOR_MAP.warning.borderL400}
        />
      </motion.div>
    </motion.div>
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
  const semantic = providerColor(provider.provider.provider);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-text-secondary">
          {PROVIDER_LABELS[provider.provider.provider] ?? provider.provider.provider}
        </span>
        <span className="font-mono text-[11px] font-black text-text-primary">
          {provider.provider.total_tokens.toLocaleString()} tokens
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
        <motion.div
          className={`h-full rounded-full bg-linear-to-r ${semantic.gradientFrom} ${semantic.gradientTo}`}
          initial={{ width: 0 }}
          animate={{ width: `${provider.pctOfTotal * 100}%` }}
          transition={springs.gentle}
        />
      </div>
      <div className="flex justify-between text-[10px] text-text-muted">
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

  const info = SEMANTIC_COLOR_MAP.info;

  return (
    <motion.div variants={itemVariants}>
      <Card className={`mb-4 flex flex-col gap-3 border-l-4 ${info.borderL400} md:flex-row md:items-center md:justify-between`}>
        <div>
          <div className={`mb-2 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-[10px] font-black uppercase tracking-wider ${info.bg50} ${info.text700}`}>
            <Activity className="h-3.5 w-3.5" />
            Analytics
          </div>
          <h1 className="font-sans text-lg font-black tracking-tight text-text-primary">
            Dashboard de Uso
          </h1>
          <p className="text-xs font-medium text-text-tertiary">
            Monitoreo de consumo de tokens, peticiones y costos por proveedor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-text-tertiary">Período:</span>
          <Select
            value={String(usageDays)}
            onChange={(v) => onUsageDaysChange(Number(v))}
            options={USAGE_DAYS_OPTIONS}
            size="sm"
            className="w-28"
            ariaLabel="Período de uso"
          />
        </div>
      </Card>

      <AnimatePresence mode="wait">
        {isUsageLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <SkeletonGroup className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonGroupItem key={i}><SkeletonStats /></SkeletonGroupItem>
              ))}
            </SkeletonGroup>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card hoverable={false} className={`p-4 border-l-4 ${info.borderL400} lg:col-span-2`}>
                <SkeletonBlock className="h-3 w-40 mb-4" />
                <SkeletonBarChart rows={6} />
              </Card>
              <Card hoverable={false} className={`p-4 border-l-4 ${info.borderL400}`}>
                <SkeletonBlock className="h-3 w-24 mb-4" />
                <SkeletonProviderList items={3} />
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.05 }}
          >
          <UsageKpis totals={usage?.totals ?? null} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card hoverable={false} className={`p-4 border-l-4 ${info.borderL400} lg:col-span-2`}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-secondary">
                Consumo diario de tokens
              </h3>
              <MiniBarChart data={usage?.daily ?? []} />
            </Card>

            <Card hoverable={false} className={`p-4 border-l-4 ${info.borderL400}`}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-secondary">
                Por proveedor
              </h3>
              <div className="space-y-3">
                {providersWithShare.length > 0 ? (
                  providersWithShare.map((p) => (
                    <ProviderUsageBar key={p.provider.provider} provider={p} />
                  ))
                ) : (
                  <p className="py-8 text-center text-xs text-text-muted">Sin actividad registrada.</p>
                )}
              </div>
            </Card>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
