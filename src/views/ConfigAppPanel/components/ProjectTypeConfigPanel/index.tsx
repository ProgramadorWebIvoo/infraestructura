/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de configuración de tipos de proyecto (catálogo maestro).
 * CRUD completo + soft delete (Activo/Inactivo) — mismo patrón que
 * MaterialConfigPanel. Cierra la brecha de "INFRAESTRUCTURA"/"MANTENIMIENTO"
 * hardcodeados en StoreProjectRequest: ahora es administrable sin deploy.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Hammer, Plus } from "lucide-react";
import { Table } from "@/components/UI/Table";
import TableToolbar from "@/components/UI/TableToolbar";
import Button from "@/components/UI/Button";
import Card from "@/components/UI/Card";
import ConfirmDialog from "@/components/UI/ConfirmDialog";
import SectionHeader from "@/components/UI/SectionHeader";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { useToast } from "@/components/UI/Toast";
import { apiFetch } from "@/services/api";
import { logError, getErrorMessage } from "@/services/logger";
import { containerVariants, itemVariants } from "@/animations";
import { getProjectTypeColumns } from "./columns";
import ProjectTypeFormModal from "./components/ProjectTypeFormModal";
import { EMPTY_FORM, type ConfigProjectType, type ProjectTypeForm } from "./types";
import { useConfigAuditLogs, type ConfigAuditLogRecord } from "@/hooks/useConfigAuditLogs";
import { projectTypeConfigSchema } from "@/schemas/projectTypeConfig.schema";

interface ProjectTypeConfigPanelProps {
  authToken: string;
  activeRole?: string;
}

export default function ProjectTypeConfigPanel({ authToken, activeRole }: ProjectTypeConfigPanelProps) {
  const { showToast } = useToast();

  const isSuperadmin = activeRole === "SUPERADMIN";
  const { prependLocal: prependAuditLog } = useConfigAuditLogs(authToken, isSuperadmin);

  // ---- Data state ----
  const [projectTypes, setProjectTypes] = useState<ConfigProjectType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ---- Modal state ----
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ProjectTypeForm>(EMPTY_FORM);
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

  const loadProjectTypes = useCallback(async () => {
    if (!authToken) return;
    try {
      const data = await apiFetch<ConfigProjectType[]>("/project-types/config", { token: authToken });
      setProjectTypes(data);
    } catch (error) {
      logError("ProjectTypeConfigPanel.loadProjectTypes", error);
      showToast("No se pudieron cargar los tipos de proyecto.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, showToast]);

  useEffect(() => {
    loadProjectTypes();
  }, [loadProjectTypes]);

  const filtered = useMemo(
    () =>
      projectTypes.filter(
        (t) =>
          t.label.toLowerCase().includes(search.toLowerCase()) ||
          t.key.toLowerCase().includes(search.toLowerCase()),
      ),
    [projectTypes, search],
  );

  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = useCallback((t: ConfigProjectType) => {
    setModalMode("edit");
    setEditingId(t.id);
    setForm({
      key: t.key,
      label: t.label,
      isActive: t.isActive,
      sortOrder: t.sortOrder,
    });
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    const result = projectTypeConfigSchema.safeParse(form);
    if (!result.success) {
      showToast(result.error.issues[0].message, "error");
      return;
    }

    setIsSaving(true);
    try {
      if (modalMode === "create") {
        const payload = {
          key: form.key.trim().toUpperCase(),
          label: form.label.trim(),
          isActive: form.isActive,
          sortOrder: form.sortOrder,
        };
        const created = await apiFetch<ConfigProjectType & { auditLog?: ConfigAuditLogRecord }>("/project-types/config", {
          method: "POST",
          token: authToken,
          body: JSON.stringify(payload),
        });
        setProjectTypes((prev) => [...prev, created]);
        if (created.auditLog && isSuperadmin) prependAuditLog(created.auditLog);
        showToast("Tipo de proyecto creado correctamente.", "success");
      } else if (editingId) {
        const payload = {
          label: form.label.trim(),
          isActive: form.isActive,
          sortOrder: form.sortOrder,
        };
        const updated = await apiFetch<ConfigProjectType & { auditLog?: ConfigAuditLogRecord }>(`/project-types/config/${editingId}`, {
          method: "PATCH",
          token: authToken,
          body: JSON.stringify(payload),
        });
        setProjectTypes((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
        if (updated.auditLog && isSuperadmin) prependAuditLog(updated.auditLog);
        showToast("Tipo de proyecto actualizado correctamente.", "success");
      }
      handleCloseModal();
    } catch (err) {
      showToast(getErrorMessage(err, "Error al guardar el tipo de proyecto."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (id: number) => {
    setConfirmToggleId(null);
    setTogglingId(id);
    try {
      const result = await apiFetch<{ id: number; isActive: boolean; auditLog?: ConfigAuditLogRecord }>(
        `/project-types/config/${id}/toggle-status`,
        { method: "POST", token: authToken },
      );
      setProjectTypes((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isActive: result.isActive } : t)),
      );
      if (result.auditLog && isSuperadmin) prependAuditLog(result.auditLog);
      showToast(`Tipo ${result.isActive ? "activado" : "desactivado"} correctamente.`, "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Error al cambiar estado."), "error");
    } finally {
      setTogglingId(null);
    }
  };

  const columns = useMemo(() => getProjectTypeColumns({
    togglingId,
    onEdit: handleOpenEdit,
    onRequestToggle: setConfirmToggleId,
  }), [togglingId, handleOpenEdit]);

  const typePendingToggle = projectTypes.find((t) => t.id === confirmToggleId);

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
                icon={<Hammer className="h-5 w-5" />}
                title="Tipos de Proyecto"
                description="Catálogo de tipos que puede tomar una petición de obra. Crea, edita y administra su estado."
                color="emerald"
                actions={
                  <Button
                    onClick={handleOpenCreate}
                    variant="primary"
                    colorScheme="emerald"
                    size="md"
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Nuevo tipo
                  </Button>
                }
              />
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className={isSuperadmin ? "flex-1 min-h-0 flex flex-col" : ""}>
            <Card hoverable={false} fillHeight={isSuperadmin} className={`p-0 overflow-hidden border-l-4 ${SEMANTIC_COLOR_MAP.success.borderL400}`}>
              <TableToolbar
                searchId="project-types-search"
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar por clave o etiqueta..."
                searchAriaLabel="Buscar tipo de proyecto"
                countIcon={<Hammer />}
                filteredCount={filtered.length}
                totalCount={projectTypes.length}
                noun="tipo"
                nounPlural="tipos"
              />

              <Table
                columns={columns}
                data={filtered}
                rowKey={(t) => t.id}
                isLoading={isLoading}
                emptyMessage="No se encontraron tipos de proyecto con ese criterio."
                fillViewport
                pageSize={20}
              />
            </Card>
          </motion.div>

          <ProjectTypeFormModal
            isOpen={isModalOpen}
            mode={modalMode}
            editingId={editingId}
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
            title="Cambiar estado del tipo de proyecto"
            message={`¿Estás seguro de ${typePendingToggle?.isActive ? "desactivar" : "activar"} este tipo? ${typePendingToggle?.isActive ? "Los proyectos existentes no se verán afectados, pero el tipo dejará de estar disponible para nuevas peticiones." : "El tipo volverá a estar disponible en el formulario de alta."}`}
            variant="warning"
            confirmLabel={typePendingToggle?.isActive ? "Desactivar" : "Activar"}
            isLoading={togglingId === confirmToggleId}
          />
        </div>
      </div>
    </motion.div>
  );
}
