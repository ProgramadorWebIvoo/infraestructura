/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Configuración de Inteligencia Artificial.
 * Usage Analytics + LLM Selector + API Keys CRUD.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Activity,
  AlertCircle,
  Brain,
  Check,
  CheckCircle,
  ChevronDown,
  Database,
  Eye,
  EyeOff,
  LayoutDashboard,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Server,
  Settings2,
  Shield,
  Sliders,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { Table, type Column } from "../components/UI/Table";
import Modal from "../components/UI/Modal";
import { useToast } from "../components/UI/Toast";
import { apiFetch } from "../services/api";
import { containerVariants, itemVariants } from "../animations";
import {
  useAIConfig,
  type AiConfigRecord,
  type AiConfigForm,
  EMPTY_CONFIG_FORM,
  PROVIDER_LABELS,
  PROVIDER_MODELS,
  PROVIDER_COLORS,
} from "../hooks/useAIConfig";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AIConfigPanel({ authToken }: { authToken: string }) {
  const { showToast } = useToast();

  const {
    configs,
    isLoading,
    usage,
    isUsageLoading,
    syncMessage,
    loadUsage,
    createConfig,
    updateConfig,
    deleteConfig,
    testConfig,
    syncConfig,
    setSyncMessage,
  } = useAIConfig(authToken);

  // Usage days filter
  const [usageDays, setUsageDays] = useState(30);

  // Load usage on mount and when days change
  useEffect(() => {
    loadUsage(usageDays);
  }, [loadUsage, usageDays]);

  // ---- Modal state ----
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AiConfigForm>(EMPTY_CONFIG_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // ---- Testing state ----
  const [testingId, setTestingId] = useState<number | null>(null);

  // ---- Delete confirm ----
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ---- Syncing ----
  const [isSyncing, setIsSyncing] = useState(false);

  // ── Open Create ──
  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setForm(EMPTY_CONFIG_FORM);
    setShowApiKey(false);
    setIsModalOpen(true);
  };

  // ── Open Edit ──
  const handleOpenEdit = (c: AiConfigRecord) => {
    setModalMode("edit");
    setEditingId(c.id);
    setForm({
      provider: c.provider,
      model: c.model,
      apiKey: "",
      baseUrl: c.baseUrl ?? "",
      maxTokens: c.maxTokens,
      isActive: c.isActive,
      isFallback: c.isFallback,
      sortOrder: c.sortOrder,
    });
    setShowApiKey(false);
    setIsModalOpen(true);
  };

  // ── Close Modal ──
  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingId(null);
  };

  // ── Save ──
  const handleSave = async () => {
    if (!form.model.trim()) {
      showToast("El nombre del modelo es obligatorio.", "error");
      return;
    }
    if (modalMode === "create" && !form.apiKey.trim()) {
      showToast("La API Key es obligatoria.", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (modalMode === "create") {
        await createConfig(form);
        showToast("Configuración creada correctamente.", "success");
      } else if (editingId) {
        const payload: Record<string, unknown> = { model: form.model };
        if (form.apiKey.trim()) payload.apiKey = form.apiKey;
        payload.baseUrl = form.baseUrl || null;
        payload.maxTokens = form.maxTokens === "" ? 4096 : form.maxTokens;
        payload.isActive = form.isActive;
        payload.isFallback = form.isFallback;
        payload.sortOrder = form.sortOrder;
        await updateConfig(editingId, payload as Partial<AiConfigForm>);
        showToast("Configuración actualizada correctamente.", "success");
      }
      handleCloseModal();
    } catch (err) {
      showToast((err as Error).message || "Error al guardar.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Test Connection ──
  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const result = await testConfig(id);
      if (result.success) {
        showToast(result.message, "success");
      } else {
        showToast(result.message, "error");
      }
    } catch (err) {
      showToast((err as Error).message || "Error al probar conexión.", "error");
    } finally {
      setTestingId(null);
    }
  };

  // ── Delete ──
  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteConfig(id);
      showToast("Configuración eliminada.", "success");
    } catch (err) {
      showToast((err as Error).message || "Error al eliminar.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Sync ──
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncConfig();
      showToast("Configuración sincronizada en tiempo real.", "success");
    } catch (err) {
      showToast((err as Error).message || "Error al sincronizar.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Toggle active ──
  const handleToggleActive = async (c: AiConfigRecord) => {
    try {
      await updateConfig(c.id, { isActive: !c.isActive });
      showToast(`Modelo ${c.isActive ? "desactivado" : "activado"}.`, "success");
    } catch (err) {
      showToast((err as Error).message || "Error al cambiar estado.", "error");
    }
  };

  // ── Provider icon ──
  const ProviderIcon = ({ provider }: { provider: string }) => {
    const color = PROVIDER_COLORS[provider] ?? PROVIDER_COLORS.openai;
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${color.badge}`}>
        <Brain className="h-3 w-3" />
        {PROVIDER_LABELS[provider] ?? provider}
      </span>
    );
  };

  // ── Table Columns ──
  const columns: Column<AiConfigRecord>[] = [
    {
      key: "provider",
      label: "Proveedor",
      sortable: true,
      render: (c) => <ProviderIcon provider={c.provider} />,
    },
    {
      key: "model",
      label: "Modelo",
      sortable: true,
      render: (c) => (
        <span className="font-mono text-xs font-bold text-slate-800">{c.model}</span>
      ),
    },
    {
      key: "apiKey",
      label: "API Key",
      render: (c) => (
        <span className="font-mono text-[11px] text-slate-500 tracking-wider">{c.apiKey}</span>
      ),
    },
    {
      key: "isActive",
      label: "Estado",
      sortable: true,
      render: (c) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
            c.isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-100 text-slate-500"
          }`}
        >
          {c.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {c.isActive ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "isFallback",
      label: "Respaldo",
      align: "center",
      render: (c) =>
        c.isFallback ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            <Shield className="h-3 w-3" />
            Fallback
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: "actions",
      label: "Acciones",
      align: "center",
      render: (c) => (
        <div className="flex items-center justify-center gap-1">
          {/* Test */}
          <button
            onClick={() => handleTest(c.id)}
            disabled={testingId === c.id || !c.isActive}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition-all duration-200 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Probar conexión ${c.model}`}
            title="Probar conexión"
          >
            {testingId === c.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Server className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Edit */}
          <button
            onClick={() => handleOpenEdit(c)}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-md"
            aria-label={`Editar ${c.model}`}
            title="Editar configuración"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          {/* Toggle Active */}
          <button
            onClick={() => handleToggleActive(c)}
            className={`rounded-lg border p-1.5 transition-all duration-200 hover:shadow-md ${
              c.isActive
                ? "border-amber-200 bg-white text-amber-400 hover:bg-amber-50 hover:text-amber-600"
                : "border-emerald-200 bg-white text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
            }`}
            aria-label={c.isActive ? "Desactivar" : "Activar"}
            title={c.isActive ? "Desactivar modelo" : "Activar modelo"}
          >
            {c.isActive ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          </button>

          {/* Delete */}
          <button
            onClick={() => handleDelete(c.id)}
            disabled={deletingId === c.id}
            className="rounded-lg border border-red-200 bg-white p-1.5 text-red-400 transition-all duration-200 hover:bg-red-50 hover:text-red-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Eliminar ${c.model}`}
            title="Eliminar configuración"
          >
            {deletingId === c.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      ),
    },
  ];

  // ── Provider model options for the form ──
  const availableModels = PROVIDER_MODELS[form.provider] ?? [];

  // ── Sync banner ──
  const SyncBanner = () => {
    if (!syncMessage) return null;
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        className={`flex items-center gap-2 rounded-xl border-l-4 px-4 py-3 text-xs font-semibold ${
          syncMessage.includes("Error")
            ? "border-l-rose-400 bg-rose-50 text-rose-700"
            : "border-l-emerald-400 bg-emerald-50 text-emerald-700"
        }`}
      >
        {syncMessage.includes("Error") ? (
          <AlertCircle className="h-4 w-4 shrink-0" />
        ) : (
          <CheckCircle className="h-4 w-4 shrink-0" />
        )}
        {syncMessage}
        <button onClick={() => setSyncMessage(null)} className="ml-auto text-current opacity-60 hover:opacity-100">
          <X className="h-3.5 w-3.5" />
        </button>
      </motion.div>
    );
  };

  // ── KPI Card ──
  const KpiCard = ({
    icon,
    label,
    value,
    sub,
    color,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    color: string;
  }) => (
    <div className={`rounded-xl border border-slate-200/80 border-l-4 ${color} bg-white p-4 shadow-xs`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
          {sub && <p className="text-[10px] font-medium text-slate-400">{sub}</p>}
        </div>
        <div className="rounded-lg bg-slate-50 p-2 text-slate-400">{icon}</div>
      </div>
    </div>
  );

  // ── Simple Bar Chart (ASCII style with tabs) ──
  const MiniBarChart = ({ data }: { data: { date: string; total_tokens: number }[] }) => {
    const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");

    if (!data || data.length === 0) {
      return (
        <div className="flex h-40 items-center justify-center text-xs text-slate-400">
          Sin datos de uso en este período.
        </div>
      );
    }

    // Prepare data for each view
    const dailyData = data.slice(-14); // last 14 days
    const weeklyData = data.slice(-7); // last 7 days

    const currentData = viewMode === "daily" ? dailyData : weeklyData;
    const maxVal = Math.max(...currentData.map((d) => d.total_tokens), 1);

    // ASCII bar generator for horizontal (daily)
    const renderHorizontalBar = (value: number, max: number, width = 24) => {
      const filled = Math.max(1, Math.round((value / max) * width));
      const empty = width - filled;
      return "█".repeat(filled) + "░".repeat(empty);
    };

    // Vertical bar generator for weekly (7 days)
    const renderVerticalBars = (data: { date: string; total_tokens: number }[], max: number) => {
      const rows = 8; // height in rows
      const barWidth = 3; // character width per bar
      const gap = 1;

      // Build rows from top to bottom
      const lines: string[] = [];
      for (let row = rows; row >= 1; row--) {
        let line = "";
        data.forEach((d, i) => {
          const barHeight = Math.max(1, Math.round((d.total_tokens / max) * rows));
          const isFilled = barHeight >= row;
          const barChar = isFilled ? "█" : "░";
          line += barChar.repeat(barWidth);
          if (i < data.length - 1) line += " ".repeat(gap);
        });
        lines.push(line);
      }
      return lines;
    };

    const isDaily = viewMode === "daily";

    if (isDaily) {
      // HORIZONTAL - Daily view with gray remainder
      return (
        <div className="space-y-3">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200 pb-2">
            <button
              onClick={() => setViewMode("daily")}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-t-md transition-colors ${
                isDaily
                  ? "bg-violet-100 text-violet-700 border-b-2 border-violet-500"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Diario (14d)
            </button>
            <button
              onClick={() => setViewMode("weekly")}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-t-md transition-colors ${
                !isDaily
                  ? "bg-violet-100 text-violet-700 border-b-2 border-violet-500"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              7 días
            </button>
          </div>

          {/* Horizontal ASCII Chart */}
          <div className="font-mono text-[10px] text-slate-600 leading-tight">
            {currentData.map((d) => {
              const bar = renderHorizontalBar(d.total_tokens, maxVal, 24);
              const shortDate = d.date.slice(5); // "MM-DD"
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

          {/* Legend */}
          <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-2">
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 bg-gradient-to-r from-sky-500 to-sky-400 rounded" />
              Tokens
            </span>
            <span className="ml-auto">Max: {maxVal.toLocaleString()}</span>
          </div>
        </div>
      );
    } else {
      // VERTICAL - Weekly (7 days) view
      const verticalLines = renderVerticalBars(currentData, maxVal);

      return (
        <div className="space-y-3">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200 pb-2">
            <button
              onClick={() => setViewMode("daily")}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-t-md transition-colors ${
                isDaily
                  ? "bg-violet-100 text-violet-700 border-b-2 border-violet-500"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Diario (14d)
            </button>
            <button
              onClick={() => setViewMode("weekly")}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-t-md transition-colors ${
                !isDaily
                  ? "bg-violet-100 text-violet-700 border-b-2 border-violet-500"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              7 días
            </button>
          </div>

          {/* Vertical ASCII Chart */}
          <div className="font-mono text-[9px] text-slate-600 leading-tight">
            <div className="flex items-end gap-1 h-32 pb-4">
              {currentData.map((d, i) => {
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

          {/* Legend */}
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
  };

  // ── Provider usage breakdown ──
  const providerColors: Record<string, string> = {
    openai: "bg-emerald-500",
    anthropic: "bg-amber-500",
    gemini: "bg-blue-500",
  };

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      {/* ── Sync Banner ── */}
      <SyncBanner />

      {/* ── SECTION 1: Usage Dashboard ── */}
      <motion.div variants={itemVariants}>
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200/80 border-l-4 border-l-violet-400 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700">
              <Activity className="h-3.5 w-3.5" />
              Analytics
            </div>
            <h2 className="font-sans text-lg font-black tracking-tight text-slate-900">
              Dashboard de Uso
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Monitoreo de consumo de tokens, peticiones y costos por proveedor.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500">Período:</span>
            <select
              value={usageDays}
              onChange={(e) => setUsageDays(Number(e.target.value))}
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
            {/* KPI Cards */}
            <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard
                icon={<Activity className="h-5 w-5" />}
                label="Peticiones"
                value={usage?.totals?.total_requests?.toLocaleString() ?? "0"}
                sub={`${usage?.totals?.successful_requests?.toLocaleString() ?? 0} exitosas`}
                color="border-l-violet-400"
              />
              <KpiCard
                icon={<Brain className="h-5 w-5" />}
                label="Tokens"
                value={usage?.totals?.total_tokens?.toLocaleString() ?? "0"}
                sub={`${usage?.totals?.prompt_tokens?.toLocaleString() ?? 0} prompt / ${usage?.totals?.completion_tokens?.toLocaleString() ?? 0} completion`}
                color="border-l-sky-400"
              />
              <KpiCard
                icon={<Database className="h-5 w-5" />}
                label="Costo estimado"
                value={`$${Number(usage?.totals?.total_cost ?? 0).toFixed(4)}`}
                color="border-l-emerald-400"
              />
              <KpiCard
                icon={<Activity className="h-5 w-5" />}
                label="Tasa de éxito"
                value={
                  usage?.totals?.total_requests
                    ? `${((usage.totals.successful_requests / usage.totals.total_requests) * 100).toFixed(1)}%`
                    : "—"
                }
                sub={`${usage?.totals?.failed_requests ?? 0} fallidas`}
                color="border-l-amber-400"
              />
            </div>

            {/* Daily Chart + Provider breakdown */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Chart */}
              <div className="rounded-xl border border-slate-200/80 border-l-4 border-l-violet-400 bg-white p-4 shadow-xs lg:col-span-2">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Consumo diario de tokens
                </h3>
                <MiniBarChart data={usage?.daily ?? []} />
              </div>

              {/* Provider breakdown */}
              <div className="rounded-xl border border-slate-200/80 border-l-4 border-l-violet-400 bg-white p-4 shadow-xs">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Por proveedor
                </h3>
                <div className="space-y-3">
                  {(usage?.byProvider && usage.byProvider.length > 0 ? (
                    usage.byProvider.map((p) => (
                      <div key={p.provider} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">
                            {PROVIDER_LABELS[p.provider] ?? p.provider}
                          </span>
                          <span className="font-mono text-[11px] font-black text-slate-900">
                            {p.total_tokens.toLocaleString()} tokens
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${providerColors[p.provider] ?? "bg-slate-400"}`}
                            style={{
                              width: `${
                                usage.totals.total_tokens > 0
                                  ? (p.total_tokens / usage.totals.total_tokens) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>{p.requests} peticiones</span>
                          <span>${Number(p.cost ?? 0).toFixed(4)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-8 text-center text-xs text-slate-400">Sin actividad registrada.</p>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* ── SECTION 2: LLM Configuration ── */}
      <motion.div variants={itemVariants}>
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200/80 border-l-4 border-l-indigo-400 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-700">
              <Sliders className="h-3.5 w-3.5" />
              LLM Selector
            </div>
            <h2 className="font-sans text-lg font-black tracking-tight text-slate-900">
              Modelos de IA
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Selección dinámica de modelos por proveedor. Los cambios se aplican en tiempo real sin reinicio.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-xs transition-all duration-200 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sincronizar
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition-all duration-200 hover:from-indigo-700 hover:to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              Nueva config.
            </button>
          </div>
        </div>

        {/* Config Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 border-l-4 border-l-indigo-400 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
            <Settings2 className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">
              {configs.length} configuración(es)
            </span>
          </div>
          <Table
            columns={columns}
            data={configs}
            rowKey={(c) => c.id}
            isLoading={isLoading}
            emptyMessage="No hay configuraciones de IA. Crea una nueva para comenzar."
            maxHeight="30rem"
            pageSize={20}
          />
        </div>
      </motion.div>

      {/* ── Create / Edit Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={modalMode === "create" ? "Nueva configuración de IA" : "Editar configuración"}
        badge={modalMode === "create" ? "Creación" : `Editando #${editingId ?? ""}`}
        icon={<Brain className="h-5 w-5" />}
        iconColor="indigo"
        maxWidth="max-w-lg"
        closeDisabled={isSaving}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCloseModal}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:shadow-md disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-xs font-black text-white shadow-md shadow-indigo-500/20 transition-all duration-200 hover:from-indigo-700 hover:to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  {modalMode === "create" ? "Crear" : "Guardar cambios"}
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Provider */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Proveedor *
            </label>
            <select
              value={form.provider}
              onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as AiConfigForm["provider"], model: "" }))}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="openai">{PROVIDER_LABELS.openai}</option>
              <option value="anthropic">{PROVIDER_LABELS.anthropic}</option>
              <option value="gemini">{PROVIDER_LABELS.gemini}</option>
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Modelo *
            </label>
            <select
              value={form.model}
              onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Seleccionar modelo...</option>
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              API Key {modalMode === "create" && "*"}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={form.apiKey}
                onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                placeholder={
                  modalMode === "edit" ? "Dejar vacío para mantener la actual" : "sk-proj-..."
                }
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-10 text-xs font-mono font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showApiKey ? "Ocultar API Key" : "Mostrar API Key"}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-[10px] font-medium text-slate-400">
              Se almacenará cifrada (AES-256-GCM) en la base de datos.
            </p>
          </div>

          {/* Base URL + Max Tokens inline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Base URL
              </label>
              <input
                type="text"
                value={form.baseUrl}
                onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                placeholder="https://api.openai.com/v1"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Max Tokens
              </label>
              <input
                type="number"
                min={1}
                max={100000}
                value={form.maxTokens}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    setForm((f) => ({ ...f, maxTokens: "" }));
                    return;
                  }
                  setForm((f) => ({ ...f, maxTokens: Math.max(1, parseInt(v, 10) || 1) }));
                }}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-center text-xs font-mono font-bold text-slate-700 outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Active + Fallback toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Estado
              </label>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
                  form.isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-500"
                }`}
              >
                {form.isActive ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {form.isActive ? "Activo" : "Inactivo"}
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Respaldo (Fallback)
              </label>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isFallback: !f.isFallback }))}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
                  form.isFallback
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-slate-100 text-slate-500"
                }`}
              >
                <Shield className="h-4 w-4" />
                {form.isFallback ? "Fallback activo" : "Principal"}
              </button>
            </div>
          </div>
          <p className="text-[10px] font-medium text-slate-400">
            {form.isFallback
              ? "Este modelo se usará como respaldo si el principal falla."
              : "Marca como respaldo para usarlo cuando el modelo principal no esté disponible."}
          </p>
        </div>
      </Modal>
    </motion.div>
  );
}
