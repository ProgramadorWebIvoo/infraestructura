/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de configuración de proveedores (catálogo maestro).
 * CRUD completo + gestión de estado.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Building2, Plus, UserCog } from "lucide-react";
import { Table } from "../../components/UI/Table";
import TableToolbar from "../../components/UI/TableToolbar";
import Button from "../../components/UI/Button";
import Card from "../../components/UI/Card";
import ConfirmDialog from "../../components/UI/ConfirmDialog";
import SectionHeader from "../../components/UI/SectionHeader";
import { SEMANTIC_COLOR_MAP } from "../../components/UI/colorTokens";
import { useToast } from "../../components/UI/Toast";
import { apiFetch } from "../../services/api";
import { logError, getErrorMessage } from "../../services/logger";
import { containerVariants, itemVariants } from "../../animations";
import { getContractorColumns } from "./columns";
import ContractorFormModal from "./components/ContractorFormModal";
import ContractorDetailModal from "./components/ContractorDetailModal";
import { EMPTY_FORM, type ConfigContractor, type ContractorForm } from "./types";
import { isValidEmail, isValidPhone } from "../../utils/validators";
import ConfigAuditLogPanel from "@/components/UI/ConfigAuditLogPanel";
import { useConfigAuditLogs, type ConfigAuditLogRecord } from "@/hooks/useConfigAuditLogs";

interface ProveedoresConfigPanelProps {
  authToken: string
  onContractorMutated: () => void
  activeRole?: string
}

export default function ProveedoresConfigPanel({ authToken, onContractorMutated, activeRole }: ProveedoresConfigPanelProps ) {
  const { showToast } = useToast();

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

  // ---- Data state ----
  const [contractors, setContractors] = useState<ConfigContractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ---- Modal state ----
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ContractorForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // ---- Toggle state ----
  const [togglingCode, setTogglingCode] = useState<string | null>(null);
  const [confirmToggleCode, setConfirmToggleCode] = useState<string | null>(null);

  // ---- Detail modal state ----
  const [detailContractor, setDetailContractor] = useState<ConfigContractor | null>(null);

  const prevToken = useRef(authToken);

  // ---- Reset loading on login ----
  useEffect(() => {
    if (!prevToken.current && authToken) {
      setIsLoading(true);
    }
    prevToken.current = authToken;
  }, [authToken]);

  // ---- Fetch contractors ----
  const loadContractors = useCallback(async () => {
    if (!authToken) return;
    try {
      const data = await apiFetch<ConfigContractor[]>("/contractors/config", { token: authToken });
      setContractors(data);
    } catch (error) {
      logError("ProveedoresConfigPanel.loadContractors", error);
      showToast("No se pudieron cargar los proveedores.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, showToast]);

  useEffect(() => {
    loadContractors();
  }, [loadContractors]);

  // ---- Filter ----
  const filtered = useMemo(
    () =>
      contractors.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.specialty.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase()) ||
          (c.phone?.toLowerCase().includes(search.toLowerCase()) ?? false),
      ),
    [contractors, search],
  );

  // ---- Modal handlers ----
  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingCode(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: ConfigContractor) => {
    setModalMode("edit");
    setEditingCode(c.code);
    setForm({
      name: c.name,
      specialty: c.specialty,
      email: c.email,
      phone: c.phone ?? "",
      rating: c.rating,
      status: c.status,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingCode(null);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.specialty.trim()) {
      showToast("Completa todos los campos obligatorios.", "error");
      return;
    }

    const hasEmail = form.email.trim() !== "";
    const hasPhone = form.phone.trim() !== "";

    if (!hasEmail && !hasPhone) {
      showToast("Ingresa al menos un email o teléfono de contacto.", "error");
      return;
    }

    if (hasEmail && !isValidEmail(form.email)) {
      showToast("Ingresa un email válido.", "error");
      return;
    }

    if (hasPhone && !isValidPhone(form.phone)) {
      showToast("Ingresa un teléfono válido.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        specialty: form.specialty.trim(),
        email: hasEmail ? form.email.trim() : null,
        phone: hasPhone ? form.phone.trim() : null,
        rating: form.rating === "" ? EMPTY_FORM.rating : form.rating,
        status: form.status,
      };

      if (modalMode === "create") {
        const created = await apiFetch<ConfigContractor & { auditLog?: ConfigAuditLogRecord }>("/contractors/config", {
          method: "POST",
          token: authToken,
          body: JSON.stringify(payload),
        });
        setContractors((prev) => [...prev, created]);
        if (created.auditLog && isSuperadmin) prependAuditLog(created.auditLog);
        showToast("Proveedor creado correctamente.", "success");
        onContractorMutated?.();
      } else if (editingCode) {
        const updated = await apiFetch<ConfigContractor & { auditLog?: ConfigAuditLogRecord }>(`/contractors/config/${editingCode}`, {
          method: "PATCH",
          token: authToken,
          body: JSON.stringify(payload),
        });
        setContractors((prev) => prev.map((c) => (c.code === editingCode ? updated : c)));
        if (updated.auditLog && isSuperadmin) prependAuditLog(updated.auditLog);
        showToast("Proveedor actualizado correctamente.", "success");
        onContractorMutated?.();
      }
      handleCloseModal();
    } catch (err) {
      showToast(getErrorMessage(err, "Error al guardar el proveedor."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Toggle status ----
  const handleToggleStatus = async (code: string) => {
    setConfirmToggleCode(null);
    setTogglingCode(code);
    try {
      const result = await apiFetch<{ code: string; status: string; auditLog?: ConfigAuditLogRecord }>(`/contractors/config/${code}/toggle-status`, {
        method: "POST",
        token: authToken,
      });
      setContractors((prev) =>
        prev.map((c) =>
          c.code === code ? { ...c, status: result.status as ConfigContractor["status"] } : c,
        ),
      );
      if (result.auditLog && isSuperadmin) prependAuditLog(result.auditLog);
      showToast(
        `Proveedor ${result.status === "ACTIVE" ? "activado" : result.status === "INACTIVE" ? "desactivado" : "puesto en revisión"} correctamente.`,
        "success",
      );
      onContractorMutated?.();
    } catch (err) {
      showToast(getErrorMessage(err, "Error al cambiar estado."), "error");
    } finally {
      setTogglingCode(null);
    }
  };

  const columns = getContractorColumns({
    togglingCode,
    onEdit: handleOpenEdit,
    onRequestToggle: setConfirmToggleCode,
    onViewDetail: setDetailContractor,
  });

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <div className={isSuperadmin ? "grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-6 item-start" : ""}>
        <div
          className={`space-y-6 ${isSuperadmin ? "flex min-h-0 flex-col lg:sticky lg:top-6" : ""}`}
          style={isSuperadmin ? { height: "calc(100vh - 3rem)" } : undefined}
        >
          {/* ── Header ── */}
          <motion.div variants={itemVariants} className="shrink-0">
            <Card hoverable={false} className={`border-l-4 ${SEMANTIC_COLOR_MAP.info.borderL400}`}>
              <SectionHeader
                icon={<UserCog className="h-5 w-5" />}
                title="Proveedores"
                description="Catálogo maestro de proveedores. Crea, edita y administra el estado de cada registro."
                color="indigo"
                actions={
                  <Button
                    onClick={handleOpenCreate}
                    variant="primary"
                    colorScheme="indigo"
                    size="md"
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Nuevo proveedor
                  </Button>
                }
              />
            </Card>
          </motion.div>

          {/* ── Table card ── */}
          <motion.div variants={itemVariants} className={isSuperadmin ? "flex-1 min-h-0 flex flex-col" : ""}>
            <Card hoverable={false} className={`p-0 overflow-hidden border-l-4 ${SEMANTIC_COLOR_MAP.info.borderL400} ${isSuperadmin ? "flex flex-col min-h-0" : ""}`}>
              <TableToolbar
                searchId="proveedores-search"
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar por nombre, código, especialidad, email o teléfono..."
                searchAriaLabel="Buscar proveedor"
                countIcon={<Building2 />}
                filteredCount={filtered.length}
                totalCount={contractors.length}
                noun="proveedor"
                nounPlural="proveedores"
              />

              <Table
                columns={columns}
                data={filtered}
                rowKey={(c) => c.code}
                isLoading={isLoading}
                emptyMessage="No se encontraron proveedores con ese criterio."
                fillViewport
                pageSize={20}
              />
            </Card>
          </motion.div>

          <ContractorFormModal
            isOpen={isModalOpen}
            mode={modalMode}
            editingCode={editingCode}
            form={form}
            onFormChange={setForm}
            isSaving={isSaving}
            onClose={handleCloseModal}
            onSave={handleSave}
          />

          <ContractorDetailModal
            contractor={detailContractor}
            onClose={() => setDetailContractor(null)}
          />

          {/* ── Confirm Toggle Status ── */}
          <ConfirmDialog
            isOpen={confirmToggleCode !== null}
            onClose={() => setConfirmToggleCode(null)}
            onConfirm={() => {
              if (confirmToggleCode !== null) handleToggleStatus(confirmToggleCode);
            }}
            title="Cambiar estado del proveedor"
            message={(() => {
              const contractor = contractors.find((c) => c.code === confirmToggleCode);
              if (contractor?.status === "ACTIVE") return "¿Desactivar este proveedor? Dejará de estar disponible para nuevas licitaciones.";
              if (contractor?.status === "INACTIVE") return "¿Activar este proveedor? Volverá a estar disponible para licitaciones.";
              return "¿Aprobar este proveedor pendiente de revisión? Pasará a estado Activo.";
            })()}
            variant="warning"
            confirmLabel="Cambiar estado"
            isLoading={togglingCode === confirmToggleCode}
          />
        </div>

        {isSuperadmin && (
          <ConfigAuditLogPanel
            logs={auditLogs}
            isLoading={isLoadingAuditLogs}
            pagination={{ page: auditLogPage, lastPage: auditLogLastPage, total: auditLogTotal, onPageChange: goToAuditLogPage }}
          />
        )}
      </div>
    </motion.div>
  );
}
