/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de gestión de usuarios del sistema.
 * CRUD completo: crear, editar (nombre/correo/rol/estado), activar/desactivar,
 * y envío de link de restablecimiento de contraseña.
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Plus, Users } from "lucide-react";
import { Table } from "../../components/UI/Table";
import TableToolbar from "../../components/UI/TableToolbar";
import { useToast } from "../../components/UI/Toast";
import { useUsuarios, type UserRecord } from "../../hooks/useUsuarios";
import { containerVariants, itemVariants } from "../../animations";
import { ROLE_LABELS, roleLabel } from "../../constants/roles";
import SectionHeader from "../../components/UI/SectionHeader";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import { SEMANTIC_COLOR_MAP } from "../../components/UI/colorTokens";
import UserFormModal from "./components/UserFormModal";
import { getUserColumns } from "./columns";
import { EMPTY_FORM, type UserForm } from "./types";
import { getErrorMessage } from "../../services/logger";
import ConfigAuditLogPanel from "@/components/UI/ConfigAuditLogPanel";
import { useConfigAuditLogs } from "@/hooks/useConfigAuditLogs";

interface UsuariosPanelProps {
  authToken: string;
  activeRole?: string;
}

export default function UsuariosPanel({ authToken, activeRole }: UsuariosPanelProps) {
  const { showToast } = useToast();
  const {
    users, isLoading, roles,
    handleCreateUser, handleUpdateUser,
    handleToggleUserStatus, handleSendPasswordReset,
  } = useUsuarios(authToken, showToast);
  const roleOptions = roles.map((value) => ({ value, label: ROLE_LABELS[value] ?? value }));

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

  // ---- Modal state ----
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const [togglingId, setTogglingId] = useState<number | string | null>(null);
  const [sendingId, setSendingId] = useState<number | string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Inactive">("all");

  const filteredUsers = useMemo(() => users.filter(u => {
    const matchesSearch =
      !searchQuery.trim() ||
      u.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [users, searchQuery, statusFilter]);

  // ---- Modal handlers ----
  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingUser(null);
    setForm({ ...EMPTY_FORM, role: roleOptions[0]?.value ?? EMPTY_FORM.role });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserRecord) => {
    setModalMode("edit");
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      password_confirmation: "",
      role: user.role,
      status: user.status,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      showToast("Completa todos los campos obligatorios.", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (modalMode === "create") {
        if (form.password.length < 8) {
          showToast("La contraseña debe tener al menos 8 caracteres.", "error");
          return;
        }
        if (form.password !== form.password_confirmation) {
          showToast("Las contraseñas no coinciden.", "error");
          return;
        }
        const created = await handleCreateUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          password_confirmation: form.password_confirmation,
          role: form.role,
        });
        if (created.auditLog && isSuperadmin) prependAuditLog(created.auditLog);
        showToast(`Usuario "${created.name}" registrado correctamente.`, "success");
      } else if (editingUser) {
        const updated = await handleUpdateUser(editingUser.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          status: form.status,
        });
        // Se inserta en reverso: cada prependAuditLog pone la entrada al
        // frente, así que iterar en el orden en que el backend las generó
        // (más vieja primero) dejaría la más reciente abajo — reversa
        // preserva el orden cronológico visible en el panel.
        if (updated.auditLogs && isSuperadmin) {
          for (const log of [...updated.auditLogs].reverse()) prependAuditLog(log);
        }
      }
      handleCloseModal();
    } catch (err) {
      showToast(getErrorMessage(err, "Error al guardar el usuario."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (user: UserRecord) => {
    setTogglingId(user.id);
    try {
      const result = await handleToggleUserStatus(user.id);
      if (result.auditLog && isSuperadmin) prependAuditLog(result.auditLog);
    } catch {
      // Toast already shown by hook
    } finally {
      setTogglingId(null);
    }
  };

  const handleSendReset = async (user: UserRecord) => {
    setSendingId(user.id);
    try {
      await handleSendPasswordReset(user.id);
    } catch {
      // Toast already shown by hook
    } finally {
      setSendingId(null);
    }
  };

  const columns = getUserColumns({
    roleLabel,
    togglingId,
    sendingId,
    onEdit: handleOpenEdit,
    onToggleStatus: handleToggle,
    onSendReset: handleSendReset,
  });

  return (
    <motion.div
      className={isSuperadmin ? "grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-6 item-start" : ""}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="space-y-6">
        {/* ── Panel header ────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card hoverable={false} className={`border-l-4 ${SEMANTIC_COLOR_MAP.brand.borderL400}`}>
            <SectionHeader
              icon={<Users className="h-5 w-5" />}
              title="Gestión de Usuarios"
              description="Registro y administración de accesos al sistema."
              color="sky"
              actions={
                <Button
                  onClick={handleOpenCreate}
                  variant="primary"
                  colorScheme="sky"
                  size="md"
                  icon={<Plus className="h-4 w-4" />}
                >
                  Nuevo usuario
                </Button>
              }
            />
          </Card>
        </motion.div>

        {/* ── Users table ───────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card hoverable={false} className={`p-0 overflow-hidden border-l-4 ${SEMANTIC_COLOR_MAP.info.borderL400}`}>
            <TableToolbar
              searchId="usuarios-search"
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Buscar por nombre o correo..."
              searchAriaLabel="Buscar usuario"
              filter={{
                id: "usuarios-status-filter",
                value: statusFilter,
                onChange: (v) => setStatusFilter(v as "all" | "Active" | "Inactive"),
                ariaLabel: "Filtrar por estado",
                options: [
                  { value: "all", label: "Todos" },
                  { value: "Active", label: "Activos" },
                  { value: "Inactive", label: "Inactivos" },
                ],
              }}
              countIcon={<Users />}
              filteredCount={filteredUsers.length}
              totalCount={users.length}
              noun="usuario"
              nounPlural="usuarios"
            />

            <Table
              columns={columns}
              data={filteredUsers}
              rowKey={(u) => u.id}
              isLoading={isLoading}
              emptyMessage={
                users.length === 0
                  ? "No hay usuarios registrados. Crea el primero con el botón «Nuevo usuario»."
                  : "Ningún usuario coincide con los filtros aplicados."
              }
              maxHeight="35rem"
              pageSize={20}
            />
          </Card>
        </motion.div>

        <UserFormModal
          isOpen={isModalOpen}
          mode={modalMode}
          editingName={editingUser?.name ?? null}
          form={form}
          onFormChange={setForm}
          roleOptions={roleOptions}
          isSaving={isSaving}
          onClose={handleCloseModal}
          onSave={handleSave}
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
