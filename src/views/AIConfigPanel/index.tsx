import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { containerVariants } from "../../animations";
import { useToast } from "../../components/UI/Toast";
import ConfirmDialog from "../../components/UI/ConfirmDialog";
import {
  useAIConfig,
  type AiConfigRecord,
  type AiConfigForm,
  EMPTY_CONFIG_FORM,
  PROVIDER_MODELS,
} from "../../hooks/useAIConfig";
import SyncBanner from "./SyncBanner";
import UsageDashboard from "./UsageDashboard";
import AIConfigTable from "./AIConfigTable";
import AIConfigFormModal from "./AIConfigFormModal";

export default function AIConfigPanel({ authToken }: { authToken: string }) {
  const { showToast } = useToast();

  const {
    configs,
    isLoading,
    usage,
    isUsageLoading,
    syncMessage,
    syncIsError,
    loadUsage,
    createConfig,
    updateConfig,
    deleteConfig,
    testConfig,
    syncConfig,
    setSyncMessage,
    setSyncIsError,
  } = useAIConfig(authToken);

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

  const handleDelete = async (id: number) => {
    setConfirmDeleteId(null);
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

  const handleToggleActive = async (c: AiConfigRecord) => {
    try {
      await updateConfig(c.id, { isActive: !c.isActive });
      showToast(`Modelo ${c.isActive ? "desactivado" : "activado"}.`, "success");
    } catch (err) {
      showToast((err as Error).message || "Error al cambiar estado.", "error");
    }
  };

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <SyncBanner message={syncMessage} isError={syncIsError} onDismiss={() => { setSyncMessage(null); setSyncIsError(false); }} />

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
        availableModels={PROVIDER_MODELS[form.provider] ?? []}
        onClose={handleCloseModal}
        onSave={handleSave}
        onFormChange={setForm}
        onShowApiKeyChange={setShowApiKey}
      />
    </motion.div>
  );
}
