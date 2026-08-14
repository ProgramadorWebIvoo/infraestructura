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
import Button from "../../components/UI/Button";
import ConfirmDialog from "../../components/UI/ConfirmDialog";
import SectionHeader from "../../components/UI/SectionHeader";
import { SearchInput } from "../../components/UI/FilterBar";
import { useToast } from "../../components/UI/Toast";
import { apiFetch } from "../../services/api";
import { logError, getErrorMessage } from "../../services/logger";
import { containerVariants, itemVariants } from "../../animations";
import { getContractorColumns } from "./columns";
import ContractorFormModal from "./components/ContractorFormModal";
import { EMPTY_FORM, type ConfigContractor, type ContractorForm } from "./types";
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
          c.contact.toLowerCase().includes(search.toLowerCase()),
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
      contact: c.contact,
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
    if (!form.name.trim() || !form.specialty.trim() || !form.contact.trim()) {
      showToast("Completa todos los campos obligatorios.", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (modalMode === "create") {
        const created = await apiFetch<ConfigContractor & { auditLog?: ConfigAuditLogRecord }>("/contractors/config", {
          method: "POST",
          token: authToken,
          body: JSON.stringify({
            name: form.name.trim(),
            specialty: form.specialty.trim(),
            contact: form.contact.trim(),
            rating: form.rating === "" ? 4.0 : form.rating,
            status: form.status,
          }),
        });
        setContractors((prev) => [...prev, created]);
        if (created.auditLog && isSuperadmin) prependAuditLog(created.auditLog);
        showToast("Proveedor creado correctamente.", "success");
        onContractorMutated?.();
      } else if (editingCode) {
        const updated = await apiFetch<ConfigContractor & { auditLog?: ConfigAuditLogRecord }>(`/contractors/config/${editingCode}`, {
          method: "PATCH",
          token: authToken,
          body: JSON.stringify({
            name: form.name.trim(),
            specialty: form.specialty.trim(),
            contact: form.contact.trim(),
            rating: form.rating === "" ? 0 : form.rating,
            status: form.status,
          }),
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
  });

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <div className={isSuperadmin ? "grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 item-start" : ""}>
        <div className="space-y-6">
          {/* ── Header ── */}
          <motion.div variants={itemVariants} className="rounded-2xl border border-slate-200/80 border-l-4 border-l-sky-400 bg-white p-5 shadow-xs">
            <SectionHeader
              icon={<UserCog className="h-5 w-5" />}
              title="Proveedores"
              description="Catálogo maestro de proveedores. Crea, edita y administra el estado de cada registro."
              color="sky"
              actions={
                <Button
                  onClick={handleOpenCreate}
                  variant="primary"
                  colorScheme="sky"
                  size="md"
                  icon={<Plus className="h-4 w-4" />}
                >
                  Nuevo proveedor
                </Button>
              }
            />
          </motion.div>

          {/* ── Table card ── */}
          <motion.div variants={itemVariants} className="overflow-hidden rounded-2xl border border-slate-200/80 border-l-4 border-l-indigo-400 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 p-5 md:flex-row md:items-center md:justify-between">
              <SearchInput
                id="proveedores-search"
                value={search}
                onChange={setSearch}
                placeholder="Buscar por nombre, código, especialidad o contacto..."
                ariaLabel="Buscar proveedor"
                className="md:w-96"
              />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-white px-4 py-2.5 text-xs font-bold text-slate-600">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  Total: <span className="text-slate-950">{contractors.length}</span>
                </div>
              </div>
            </div>

            <Table
              columns={columns}
              data={filtered}
              rowKey={(c) => c.code}
              isLoading={isLoading}
              emptyMessage="No se encontraron proveedores con ese criterio."
              maxHeight="35rem"
              pageSize={20}
            />
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

          {/* ── Confirm Toggle Status ── */}
          <ConfirmDialog
            isOpen={confirmToggleCode !== null}
            onClose={() => setConfirmToggleCode(null)}
            onConfirm={() => {
              if (confirmToggleCode !== null) handleToggleStatus(confirmToggleCode);
            }}
            title="Cambiar estado del proveedor"
            message={`¿Estás seguro de cambiar el estado de este proveedor?`}
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
