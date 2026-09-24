/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de configuración de roles (catálogo maestro). CRUD completo +
 * soft delete (Activo/Inactivo) — mismo patrón que ProjectTypeConfigPanel.
 * Cierra la brecha de App\Support\Roles::VALID hardcodeado: ahora es
 * administrable sin deploy.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Plus, Shield } from "lucide-react";
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
import { getRoleColumns } from "./columns";
import RoleFormModal from "./components/RoleFormModal";
import { EMPTY_FORM, type ConfigRole, type RoleForm } from "./types";
import { useConfigAuditLogs, type ConfigAuditLogRecord } from "@/hooks/useConfigAuditLogs";
import { roleConfigSchema } from "@/schemas/roleConfig.schema";

interface RolesConfigPanelProps {
  authToken: string;
  activeRole?: string;
}

export default function RolesConfigPanel({ authToken, activeRole }: RolesConfigPanelProps) {
  const { showToast } = useToast();

  const isSuperadmin = activeRole === "SUPERADMIN";
  const { prependLocal: prependAuditLog } = useConfigAuditLogs(authToken, isSuperadmin);

  // ---- Data state ----
  const [roles, setRoles] = useState<ConfigRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ---- Modal state ----
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<RoleForm>(EMPTY_FORM);
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

  const loadRoles = useCallback(async () => {
    if (!authToken) return;
    try {
      const data = await apiFetch<ConfigRole[]>("/roles/config", { token: authToken });
      setRoles(data);
    } catch (error) {
      logError("RolesConfigPanel.loadRoles", error);
      showToast("No se pudieron cargar los roles.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, showToast]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const filtered = useMemo(
    () =>
      roles.filter(
        (r) =>
          r.label.toLowerCase().includes(search.toLowerCase()) ||
          r.key.toLowerCase().includes(search.toLowerCase()),
      ),
    [roles, search],
  );

  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = useCallback((r: ConfigRole) => {
    setModalMode("edit");
    setEditingId(r.id);
    setForm({
      key: r.key,
      label: r.label,
      isActive: r.isActive,
      sortOrder: r.sortOrder,
    });
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    const result = roleConfigSchema.safeParse(form);
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
        const created = await apiFetch<ConfigRole & { auditLog?: ConfigAuditLogRecord }>("/roles/config", {
          method: "POST",
          token: authToken,
          body: JSON.stringify(payload),
        });
        setRoles((prev) => [...prev, created]);
        if (created.auditLog && isSuperadmin) prependAuditLog(created.auditLog);
        showToast("Rol creado correctamente.", "success");
      } else if (editingId) {
        const payload = {
          label: form.label.trim(),
          isActive: form.isActive,
          sortOrder: form.sortOrder,
        };
        const updated = await apiFetch<ConfigRole & { auditLog?: ConfigAuditLogRecord }>(`/roles/config/${editingId}`, {
          method: "PATCH",
          token: authToken,
          body: JSON.stringify(payload),
        });
        setRoles((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
        if (updated.auditLog && isSuperadmin) prependAuditLog(updated.auditLog);
        showToast("Rol actualizado correctamente.", "success");
      }
      handleCloseModal();
    } catch (err) {
      showToast(getErrorMessage(err, "Error al guardar el rol."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (id: number) => {
    setConfirmToggleId(null);
    setTogglingId(id);
    try {
      const result = await apiFetch<{ id: number; isActive: boolean; auditLog?: ConfigAuditLogRecord }>(
        `/roles/config/${id}/toggle-status`,
        { method: "POST", token: authToken },
      );
      setRoles((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isActive: result.isActive } : r)),
      );
      if (result.auditLog && isSuperadmin) prependAuditLog(result.auditLog);
      showToast(`Rol ${result.isActive ? "activado" : "desactivado"} correctamente.`, "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Error al cambiar estado."), "error");
    } finally {
      setTogglingId(null);
    }
  };

  const columns = useMemo(() => getRoleColumns({
    togglingId,
    onEdit: handleOpenEdit,
    onRequestToggle: setConfirmToggleId,
  }), [togglingId, handleOpenEdit]);

  const rolePendingToggle = roles.find((r) => r.id === confirmToggleId);

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
                icon={<Shield className="h-5 w-5" />}
                title="Roles"
                description="Catálogo de roles del sistema. Crea, edita y administra su estado."
                color="emerald"
                actions={
                  <Button
                    onClick={handleOpenCreate}
                    variant="primary"
                    colorScheme="emerald"
                    size="md"
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Nuevo rol
                  </Button>
                }
              />
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className={isSuperadmin ? "flex-1 min-h-0 flex flex-col" : ""}>
            <Card hoverable={false} fillHeight={isSuperadmin} className={`p-0 overflow-hidden border-l-4 ${SEMANTIC_COLOR_MAP.success.borderL400}`}>
              <TableToolbar
                searchId="roles-search"
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar por clave o etiqueta..."
                searchAriaLabel="Buscar rol"
                countIcon={<Shield />}
                filteredCount={filtered.length}
                totalCount={roles.length}
                noun="rol"
                nounPlural="roles"
              />

              <Table
                columns={columns}
                data={filtered}
                rowKey={(r) => r.id}
                isLoading={isLoading}
                emptyMessage="No se encontraron roles con ese criterio."
                fillViewport
                pageSize={20}
                onRefresh={loadRoles}
              />
            </Card>
          </motion.div>

          <RoleFormModal
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
            title="Cambiar estado del rol"
            message={`¿Estás seguro de ${rolePendingToggle?.isActive ? "desactivar" : "activar"} este rol? ${rolePendingToggle?.isActive ? "Los usuarios existentes con este rol no se ven afectados, pero dejará de estar disponible para nuevas asignaciones." : "El rol volverá a estar disponible en los selectores."}`}
            variant="warning"
            confirmLabel={rolePendingToggle?.isActive ? "Desactivar" : "Activar"}
            isLoading={togglingId === confirmToggleId}
          />
        </div>
      </div>
    </motion.div>
  );
}
