/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de configuración del catálogo de acciones notificables. Solo
 * edición de metadatos (label/grupo/alcance/crítica) + activo/inactivo —
 * sin alta, ver NotificationActionController. Cierra la brecha de
 * App\Support\NotificationCatalog::ACTIONS hardcodeado: el metadato ya es
 * administrable sin deploy, aunque el disparo de cada acción sigue en código.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Bell } from "lucide-react";
import { Table } from "@/components/UI/Table";
import TableToolbar from "@/components/UI/TableToolbar";
import Card from "@/components/UI/Card";
import ConfirmDialog from "@/components/UI/ConfirmDialog";
import SectionHeader from "@/components/UI/SectionHeader";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { useToast } from "@/components/UI/Toast";
import { apiFetch } from "@/services/api";
import { logError, getErrorMessage } from "@/services/logger";
import { containerVariants, itemVariants } from "@/animations";
import { getNotificationActionColumns } from "./columns";
import NotificationActionEditModal from "./components/NotificationActionEditModal";
import type { ConfigNotificationAction, NotificationActionForm } from "./types";
import { useConfigAuditLogs, type ConfigAuditLogRecord } from "@/hooks/useConfigAuditLogs";
import { notificationActionConfigSchema } from "@/schemas/notificationActionConfig.schema";

interface NotificationActionsConfigPanelProps {
  authToken: string;
  activeRole?: string;
}

export default function NotificationActionsConfigPanel({ authToken, activeRole }: NotificationActionsConfigPanelProps) {
  const { showToast } = useToast();

  const isSuperadmin = activeRole === "SUPERADMIN";
  const { prependLocal: prependAuditLog } = useConfigAuditLogs(authToken, isSuperadmin);

  // ---- Data state ----
  const [actions, setActions] = useState<ConfigNotificationAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ---- Modal state ----
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<NotificationActionForm>({ label: "", group: "", scope: "project", critical: false, isActive: true });
  const [isSaving, setIsSaving] = useState(false);

  // ---- Toggle state ----
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [confirmToggleId, setConfirmToggleId] = useState<number | null>(null);

  const prevToken = useRef(authToken);

  useEffect(() => {
    if (!prevToken.current && authToken) {
      setIsLoading(true);
    }
    prevToken.current = authToken;
  }, [authToken]);

  const loadActions = useCallback(async () => {
    if (!authToken) return;
    try {
      const data = await apiFetch<ConfigNotificationAction[]>("/notification-actions/config", { token: authToken });
      setActions(data);
    } catch (error) {
      logError("NotificationActionsConfigPanel.loadActions", error);
      showToast("No se pudieron cargar las acciones notificables.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, showToast]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const filtered = useMemo(
    () =>
      actions.filter(
        (a) =>
          (a.label ?? a.key).toLowerCase().includes(search.toLowerCase()) ||
          a.key.toLowerCase().includes(search.toLowerCase()) ||
          a.group.toLowerCase().includes(search.toLowerCase()),
      ),
    [actions, search],
  );

  const handleOpenEdit = useCallback((a: ConfigNotificationAction) => {
    setEditingId(a.id);
    setEditingKey(a.key);
    setForm({
      label: a.label ?? "",
      group: a.group,
      scope: a.scope,
      critical: a.critical,
      isActive: a.isActive,
    });
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingId(null);
    setEditingKey(null);
  };

  const handleSave = async () => {
    const result = notificationActionConfigSchema.safeParse(form);
    if (!result.success) {
      showToast(result.error.issues[0].message, "error");
      return;
    }
    if (!editingId) return;

    setIsSaving(true);
    try {
      const payload = {
        label: form.label.trim() === "" ? null : form.label.trim(),
        group: form.group.trim(),
        scope: form.scope,
        critical: form.critical,
        isActive: form.isActive,
      };
      const updated = await apiFetch<ConfigNotificationAction & { auditLog?: ConfigAuditLogRecord }>(`/notification-actions/config/${editingId}`, {
        method: "PATCH",
        token: authToken,
        body: JSON.stringify(payload),
      });
      setActions((prev) => prev.map((a) => (a.id === editingId ? updated : a)));
      if (updated.auditLog && isSuperadmin) prependAuditLog(updated.auditLog);
      showToast("Acción actualizada correctamente.", "success");
      handleCloseModal();
    } catch (err) {
      showToast(getErrorMessage(err, "Error al guardar la acción."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (id: number) => {
    setConfirmToggleId(null);
    setTogglingId(id);
    try {
      const result = await apiFetch<{ id: number; isActive: boolean; auditLog?: ConfigAuditLogRecord }>(
        `/notification-actions/config/${id}/toggle-status`,
        { method: "POST", token: authToken },
      );
      setActions((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: result.isActive } : a)),
      );
      if (result.auditLog && isSuperadmin) prependAuditLog(result.auditLog);
      showToast(`Acción ${result.isActive ? "activada" : "desactivada"} correctamente.`, "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Error al cambiar estado."), "error");
    } finally {
      setTogglingId(null);
    }
  };

  const columns = useMemo(() => getNotificationActionColumns({
    togglingId,
    onEdit: handleOpenEdit,
    onRequestToggle: setConfirmToggleId,
  }), [togglingId, handleOpenEdit]);

  const actionPendingToggle = actions.find((a) => a.id === confirmToggleId);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <div className={isSuperadmin ? "grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-6 item-start" : ""}>
        <div
          className={`space-y-6 ${isSuperadmin ? "flex min-h-0 flex-col lg:sticky lg:top-6" : ""}`}
          style={isSuperadmin ? { height: "calc(100vh - 3rem)" } : undefined}
        >
          <motion.div variants={itemVariants} className="shrink-0">
            <Card hoverable={false} className={`border-l-4 ${SEMANTIC_COLOR_MAP.success.borderL400}`}>
              <SectionHeader
                icon={<Bell className="h-5 w-5" />}
                title="Acciones Notificables"
                description="Catálogo de eventos que la app puede notificar. Edita etiqueta, agrupación, alcance y criticidad, o desactívalos de los selectores."
                color="emerald"
              />
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className={isSuperadmin ? "flex-1 min-h-0 flex flex-col" : ""}>
            <Card hoverable={false} fillHeight={isSuperadmin} className={`p-0 overflow-hidden border-l-4 ${SEMANTIC_COLOR_MAP.success.borderL400}`}>
              <TableToolbar
                searchId="notification-actions-search"
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar por acción o grupo..."
                searchAriaLabel="Buscar acción notificable"
                countIcon={<Bell />}
                filteredCount={filtered.length}
                totalCount={actions.length}
                noun="acción"
                nounPlural="acciones"
              />

              <Table
                columns={columns}
                data={filtered}
                rowKey={(a) => a.id}
                isLoading={isLoading}
                emptyMessage="No se encontraron acciones con ese criterio."
                fillViewport
                pageSize={20}
              />
            </Card>
          </motion.div>

          <NotificationActionEditModal
            isOpen={isModalOpen}
            actionKey={editingKey}
            form={form}
            onFormChange={setForm}
            isSaving={isSaving}
            onClose={handleCloseModal}
            onSave={handleSave}
          />

          <ConfirmDialog
            isOpen={confirmToggleId !== null}
            onClose={() => setConfirmToggleId(null)}
            onConfirm={() => {
              if (confirmToggleId !== null) handleToggleStatus(confirmToggleId);
            }}
            title="Cambiar estado de la acción"
            message={`¿Estás seguro de ${actionPendingToggle?.isActive ? "desactivar" : "activar"} esta acción? ${actionPendingToggle?.isActive ? "Dejará de ofrecerse en selectores nuevos, pero el histórico y las reglas ya configuradas siguen funcionando." : "Volverá a estar disponible en selectores nuevos."}`}
            variant="warning"
            confirmLabel={actionPendingToggle?.isActive ? "Desactivar" : "Activar"}
            isLoading={togglingId === confirmToggleId}
          />
        </div>
      </div>
    </motion.div>
  );
}
