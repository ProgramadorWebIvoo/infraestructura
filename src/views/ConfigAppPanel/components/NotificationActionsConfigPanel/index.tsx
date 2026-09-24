/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Catálogo de acciones notificables — solo edición de metadatos
 * (label/grupo/alcance/crítica) + activo/inactivo, sin alta (ver
 * NotificationActionController). Vive DENTRO de la sección "Notificaciones"
 * de Config App, como una tarjeta más junto a NotificationRulesCard (ver
 * ConfigAppPanel/index.tsx, grupo "__notification_rules__") — no es un tab
 * propio: separarlo como tab rompía la cohesión de "todo lo de
 * notificaciones vive junto" (antes vivía en "Catálogos", un grupo distinto
 * al de la matriz de roles).
 *
 * Responde "¿qué eventos existen y cómo se llaman?" (listado plano);
 * NotificationRulesCard, debajo, responde "¿a quién le llega cada uno?"
 * (matriz rol×canal) — se complementan, no se pisan.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Bell } from "lucide-react";
import { Table } from "@/components/UI/Table";
import TableToolbar from "@/components/UI/TableToolbar";
import Card from "@/components/UI/Card";
import ConfirmDialog from "@/components/UI/ConfirmDialog";
import SectionHeader from "@/components/UI/SectionHeader";
import { useToast } from "@/components/UI/Toast";
import { apiFetch } from "@/services/api";
import { logError, getErrorMessage } from "@/services/logger";
import { itemVariants } from "@/animations";
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
      setActions(data ?? []);
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
  const groupOptions = useMemo(
    () => Array.from(new Set(actions.map((a) => a.group))).sort(),
    [actions],
  );

  return (
    <motion.div variants={itemVariants}>
      <Card hoverable={false} className="p-0 overflow-hidden">
        <div className="p-5 pb-0">
          <SectionHeader
            icon={<Bell className="h-5 w-5" />}
            title="Catálogo de acciones notificables"
            description="Qué eventos existen, su etiqueta, agrupación y criticidad — alimenta el selector de arriba y la matriz de abajo. Desactivar una acción la oculta de ambos sin perder su histórico."
            color="indigo"
          />
        </div>
        <div className="mt-4">
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
            maxHeight="26rem"
            pageSize={20}
            onRefresh={loadActions}
          />
        </div>
      </Card>

      <NotificationActionEditModal
        isOpen={isModalOpen}
        actionKey={editingKey}
        form={form}
        onFormChange={setForm}
        groupOptions={groupOptions}
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
    </motion.div>
  );
}
