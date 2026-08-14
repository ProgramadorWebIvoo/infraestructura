import { useMemo } from "react";
import {
  Check,
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
} from "lucide-react";
import { motion } from "motion/react";
import { Table, type Column } from "../../../components/UI/Table";
import Button from "../../../components/UI/Button";
import IconActionButton from "../../../components/UI/IconActionButton";
import SectionHeader from "../../../components/UI/SectionHeader";
import ActiveBadge from "../../../components/UI/ActiveBadge";
import { itemVariants } from "../../../animations";
import type { AiConfigRecord } from "../../../hooks/useAIConfig";
import ProviderIcon from "./ProviderIcon";

// ---------------------------------------------------------------------------
// Guard de seguridad (hallazgo ALTO de la auditoría 29/07): el backend
// devuelve solo los últimos 4 chars ("••••wxyz" = 8 chars). Si por cualquier
// escenario (debug, malformación) llegara una clave más larga, se enmascara
// por completo en runtime para no exponerla en el DOM.
// ---------------------------------------------------------------------------
function maskApiKey(record: AiConfigRecord): string {
  if (!record.hasApiKey) return "";
  return record.apiKey.length > 8 ? "••••••••" : record.apiKey;
}

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
            maskApiKey(c)
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
      render: (c) => <ActiveBadge isActive={c.isActive} />,
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
          <IconActionButton
            label={`Probar conexión ${c.model}`}
            tooltip="Probar conexión"
            onClick={() => onTest(c.id)}
            disabled={!c.isActive}
            isBusy={testingId === c.id}
            tone="sky"
            icon={<Server className="h-3.5 w-3.5" />}
          />
          <IconActionButton
            label={`Editar ${c.model}`}
            tooltip="Editar configuración"
            onClick={() => onEdit(c)}
            tone="indigo"
            icon={<Pencil className="h-3.5 w-3.5" />}
          />
          <IconActionButton
            label={c.isActive ? "Desactivar" : "Activar"}
            tooltip={c.isActive ? "Desactivar modelo" : "Activar modelo"}
            onClick={() => onToggleActive(c)}
            tone={c.isActive ? "amber" : "emerald"}
            icon={c.isActive ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          />
          <IconActionButton
            label={`Eliminar ${c.model}`}
            tooltip="Eliminar configuración"
            onClick={() => onDelete(c.id)}
            isBusy={deletingId === c.id}
            tone="rose"
            icon={<Trash2 className="h-3.5 w-3.5" />}
          />
        </div>
      ),
    },
  ], [testingId, deletingId, onTest, onEdit, onToggleActive, onDelete]);

  return (
    <motion.div variants={itemVariants}>
      <div className="mb-4 rounded-2xl border border-slate-200/80 border-l-4 border-l-indigo-400 bg-white p-5 shadow-xs">
        <SectionHeader
          icon={<Sliders className="h-5 w-5" />}
          title="Modelos de IA"
          description="Selección dinámica de modelos por proveedor. Los cambios se aplican en tiempo real sin reinicio."
          color="indigo"
          actions={
            <>
              <Button
                variant="secondary"
                size="md"
                onClick={onSync}
                disabled={isSyncing}
                icon={isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              >
                Sincronizar
              </Button>
              <Button
                variant="primary"
                colorScheme="indigo"
                size="md"
                onClick={onCreateNew}
                icon={<Plus className="h-4 w-4" />}
              >
                Nueva config.
              </Button>
            </>
          }
        />
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
