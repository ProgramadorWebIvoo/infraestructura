import { useEffect, useState } from "react";
import { motion } from "motion/react";
import ConfigAuditLogPanel from "../../components/UI/ConfigAuditLogPanel";
import { containerVariants } from "../../animations";
import { useToast } from "../../components/UI/Toast";
import ConfirmDialog from "../../components/UI/ConfirmDialog";
import { getErrorMessage } from "../../services/logger";
import {
  useAIConfig,
  type AiConfigRecord,
  type AiConfigForm,
  EMPTY_CONFIG_FORM,
} from "../../hooks/useAIConfig";
import SyncBanner from "./components/SyncBanner";
import UsageDashboard from "./components/UsageDashboard";
import AIConfigTable from "./components/AIConfigTable";
import { validateConfigForm, buildUpdatePayload } from "./aiConfigForm";
import AIConfigFormModal from "../../components/Modals/AIConfigFormModal";
import { useConfigAuditLogs } from "../../hooks/useConfigAuditLogs";

interface AIConfigPanelProps {
  authToken: string;
  activeRole?: string;
}


export default function AIConfigPanel({ authToken, activeRole }: AIConfigPanelProps) {
  const { showToast } = useToast();

  const {
    configs,
    isLoading,
    usage,
    isUsageLoading,
    providerModels,
    syncMessage,
    syncIsError,
    loadUsage,
    createConfig,
    updateConfig,
    deleteConfig,
    testConfig,
    syncConfig,
    dismissSyncMessage,
  } = useAIConfig(authToken);

  const isSuperadmin = activeRole === "SUPERADMIN";
  const {
    logs: auditLogs,
    isLoading: isLoadingAuditLogs,
    page: auditLogPage,
    lastPage: auditLogLastPage,
    total: auditLogTotal,
    goToPage: goToAuditLogPage,
    prependLocal: prependAuditLog,
  } = useConfigAuditLogs(authToken, isSuperadmin);

  const [usageDays, setUsageDays] = useState(30);

  useEffect(() => {
    loadUsage(usageDays);
  }, [loadUsage, usageDays]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AiConfigForm>(EMPTY_CONFIG_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [testingId, setTestingId] = useState<number | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setForm(EMPTY_CONFIG_FORM);
    setShowApiKey(false);
    setIsModalOpen(true);
  };

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

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    const validationError = validateConfigForm(form, modalMode);
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    setIsSaving(true);
    try {
      if (modalMode === "create") {
        const created = await createConfig(form);
        if (created.auditLog && isSuperadmin) prependAuditLog(created.auditLog);
        showToast("Configuración creada correctamente.", "success");
      } else if (editingId) {
        const updated = await updateConfig(editingId, buildUpdatePayload(form));
        if (updated.auditLog && isSuperadmin) prependAuditLog(updated.auditLog);
        showToast("Configuración actualizada correctamente.", "success");
      }
      handleCloseModal();
    } catch (err) {
      showToast(getErrorMessage(err, "Error al guardar."), "error");
    } finally {
      setIsSaving(false);
    }
  };

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
      showToast(getErrorMessage(err, "Error al probar conexión."), "error");
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmDeleteId(null);
    setDeletingId(id);
    try {
      const result = await deleteConfig(id);
      if (result.auditLog && isSuperadmin) prependAuditLog(result.auditLog);
      showToast("Configuración eliminada correctamente.", "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Error al eliminar."), "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncConfig();
      showToast("Configuración sincronizada en tiempo real.", "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Error al sincronizar."), "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleActive = async (c: AiConfigRecord) => {
    try {
      const updated = await updateConfig(c.id, { isActive: !c.isActive });
      if (updated.auditLog && isSuperadmin) prependAuditLog(updated.auditLog);
      showToast(`Modelo ${c.isActive ? "desactivado" : "activado"} correctamente.`, "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Error al cambiar estado."), "error");
    }
  };

  return (
    <motion.div className={isSuperadmin ? "grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-6 item-start" : ""} variants={containerVariants} initial="hidden" animate="visible">
      <div className="space-y-6">
        <SyncBanner message={syncMessage} isError={syncIsError} onDismiss={dismissSyncMessage} />

        <UsageDashboard
          usage={usage}
          isUsageLoading={isUsageLoading}
          usageDays={usageDays}
          onUsageDaysChange={setUsageDays}
        />

        <AIConfigTable
          configs={configs}
          isLoading={isLoading}
          testingId={testingId}
          deletingId={deletingId}
          isSyncing={isSyncing}
          onTest={handleTest}
          onEdit={handleOpenEdit}
          onDelete={(id) => setConfirmDeleteId(id)}
          onToggleActive={handleToggleActive}
          onSync={handleSync}
          onCreateNew={handleOpenCreate}
        />

        {/* ── Confirm Delete ── */}
        <ConfirmDialog
          isOpen={confirmDeleteId !== null}
          onClose={() => setConfirmDeleteId(null)}
          onConfirm={() => {
            if (confirmDeleteId !== null) handleDelete(confirmDeleteId);
          }}
          title="Eliminar configuración de IA"
          message="¿Estás seguro de eliminar esta configuración? Esta acción no se puede deshacer."
          variant="danger"
          confirmLabel="Eliminar"
          isLoading={deletingId === confirmDeleteId}
        />

        <AIConfigFormModal
          isOpen={isModalOpen}
          mode={modalMode}
          editingId={editingId}
          form={form}
          isSaving={isSaving}
          showApiKey={showApiKey}
          availableModels={providerModels[form.provider] ?? []}
          onClose={handleCloseModal}
          onSave={handleSave}
          onFormChange={setForm}
          onShowApiKeyChange={setShowApiKey}
        />
      </div>

      {isSuperadmin && (
        <ConfigAuditLogPanel
          logs={auditLogs}
          isLoading={isLoadingAuditLogs}
          pagination={{ page: auditLogPage, lastPage: auditLogLastPage, total: auditLogTotal, onPageChange: goToAuditLogPage }}
        />
      )}
    </motion.div>
  );
}
