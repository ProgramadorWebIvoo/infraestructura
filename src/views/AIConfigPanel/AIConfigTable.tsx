import { useMemo } from "react";
import {
  Check,
  CheckCircle,
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
import { motion } from "motion/react";
import { Table, type Column } from "../../components/UI/Table";
import { itemVariants } from "../../animations";
import type { AiConfigRecord } from "../../hooks/useAIConfig";
import ProviderIcon from "./ProviderIcon";

export default function AIConfigTable({
  configs,
  isLoading,
  testingId,
  deletingId,
  isSyncing,
  onTest,
  onEdit,
  onDelete,
  onToggleActive,
  onSync,
  onCreateNew,
}: {
  configs: AiConfigRecord[];
  isLoading: boolean;
  testingId: number | null;
  deletingId: number | null;
  isSyncing: boolean;
  onTest: (id: number) => void;
  onEdit: (config: AiConfigRecord) => void;
  onDelete: (id: number) => void;
  onToggleActive: (config: AiConfigRecord) => void;
  onSync: () => void;
  onCreateNew: () => void;
}) {
  const columns: Column<AiConfigRecord>[] = useMemo(() => [
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
        <span
          className="font-mono text-[11px] text-slate-500 tracking-wider"
          title={c.hasApiKey ? "Clave configurada (solo últimos 4 visibles)" : "Sin clave"}
        >
          {c.hasApiKey ? (
            c.apiKey
          ) : (
            <span className="text-slate-300 italic">—</span>
          )}
        </span>
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
          <button
            onClick={() => onTest(c.id)}
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
          <button
            onClick={() => onEdit(c)}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-md"
            aria-label={`Editar ${c.model}`}
            title="Editar configuración"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onToggleActive(c)}
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
          <button
            onClick={() => onDelete(c.id)}
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
  ], [testingId, deletingId, onTest, onEdit, onToggleActive, onDelete]);

  return (
    <motion.div variants={itemVariants}>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200/80 border-l-4 border-l-indigo-400 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-700">
            <Sliders className="h-3.5 w-3.5" />
            LLM Selector
          </div>
          <h1 className="font-sans text-lg font-black tracking-tight text-slate-900">
            Modelos de IA
          </h1>
          <p className="text-xs font-medium text-slate-500">
            Selección dinámica de modelos por proveedor. Los cambios se aplican en tiempo real sin reinicio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSync}
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
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition-all duration-200 hover:from-indigo-700 hover:to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Nueva config.
          </button>
        </div>
      </div>

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
  );
}
