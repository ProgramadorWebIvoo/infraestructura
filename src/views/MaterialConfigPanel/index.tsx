/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de configuración de materiales (catálogo maestro).
 * CRUD completo + soft delete (Activo/Inactivo).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Package, Plus } from "lucide-react";
import { Table } from "../../components/UI/Table";
import Button from "../../components/UI/Button";
import ConfirmDialog from "../../components/UI/ConfirmDialog";
import SectionHeader from "../../components/UI/SectionHeader";
import { SearchInput } from "../../components/UI/FilterBar";
import { useToast } from "../../components/UI/Toast";
import { apiFetch } from "../../services/api";
import { logError, getErrorMessage } from "../../services/logger";
import { containerVariants, itemVariants } from "../../animations";
import { getMaterialColumns } from "./columns";
import MaterialFormModal from "./components/MaterialFormModal";
import { EMPTY_FORM, type ConfigMaterial, type MaterialForm } from "./types";
import { useConfigAuditLogs, type ConfigAuditLogRecord } from "@/hooks/useConfigAuditLogs";
import ConfigAuditLogPanel from "../../components/UI/ConfigAuditLogPanel";

interface MaterialConfigPanelProps {
  authToken: string;
  activeRole?: string;
}

export default function MaterialConfigPanel({ authToken, activeRole }: MaterialConfigPanelProps) {
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
  const [materials, setMaterials] = useState<ConfigMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ---- Modal state ----
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<MaterialForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // ---- Toggle state ----
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [confirmToggleId, setConfirmToggleId] = useState<number | null>(null);

  const prevToken = useRef(authToken);

  // ---- Reset loading on login ----
  useEffect(() => {
    if (!prevToken.current && authToken) {
      setIsLoading(true);
    }
    prevToken.current = authToken;
  }, [authToken]);

  // ---- Fetch materials ----
  const loadMaterials = useCallback(async () => {
    if (!authToken) return;
    try {
      const data = await apiFetch<ConfigMaterial[]>("/materials/config", { token: authToken });
      setMaterials(data);
    } catch (error) {
      logError("MaterialConfigPanel.loadMaterials", error);
      showToast("No se pudieron cargar los materiales.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, showToast]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // ---- Filter ----
  const filtered = useMemo(
    () =>
      materials.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.unit.toLowerCase().includes(search.toLowerCase()),
      ),
    [materials, search],
  );

  // ---- Modal handlers ----
  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: ConfigMaterial) => {
    setModalMode("edit");
    setEditingId(m.id);
    setForm({
      name: m.name,
      unit: m.unit,
      estimatedUnitPrice: m.estimatedUnitPrice,
      isActive: m.isActive,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.unit.trim()) {
      showToast("Completa todos los campos obligatorios.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        unit: form.unit.trim(),
        estimatedUnitPrice: form.estimatedUnitPrice === "" ? 0 : form.estimatedUnitPrice,
        isActive: form.isActive,
      };

      if (modalMode === "create") {
        const created = await apiFetch<ConfigMaterial & { auditLog?: ConfigAuditLogRecord }>("/materials/config", {
          method: "POST",
          token: authToken,
          body: JSON.stringify(payload),
        });
        setMaterials((prev) => [...prev, created]);
        if (created.auditLog && isSuperadmin) prependAuditLog(created.auditLog);
        showToast("Material creado correctamente.", "success");
      } else if (editingId) {
        const updated = await apiFetch<ConfigMaterial & { auditLog?: ConfigAuditLogRecord }>(`/materials/config/${editingId}`, {
          method: "PATCH",
          token: authToken,
          body: JSON.stringify(payload),
        });
        setMaterials((prev) => prev.map((m) => (m.id === editingId ? updated : m)));
        if (updated.auditLog && isSuperadmin) prependAuditLog(updated.auditLog);
        showToast("Material actualizado correctamente.", "success");
      }
      handleCloseModal();
    } catch (err) {
      showToast(getErrorMessage(err, "Error al guardar el material."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Toggle status ----
  const handleToggleStatus = async (id: number) => {
    setConfirmToggleId(null);
    setTogglingId(id);
    try {
      const result = await apiFetch<{ id: number; isActive: boolean; auditLog?: ConfigAuditLogRecord }>(
        `/materials/config/${id}/toggle-status`,
        { method: "POST", token: authToken },
      );
      setMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isActive: result.isActive } : m)),
      );
      if (result.auditLog && isSuperadmin) prependAuditLog(result.auditLog);
      showToast(`Material ${result.isActive ? "activado" : "desactivado"} correctamente.`, "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Error al cambiar estado."), "error");
    } finally {
      setTogglingId(null);
    }
  };

  const columns = getMaterialColumns({
    togglingId,
    onEdit: handleOpenEdit,
    onRequestToggle: setConfirmToggleId,
  });

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <div className={isSuperadmin ? "grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 item-start" : ""}>
        <div className="space-y-6">
          {/* ── Header ── */}
          <motion.div variants={itemVariants} className="rounded-2xl border border-slate-200/80 border-l-4 border-l-emerald-400 bg-white p-5 shadow-xs">
            <SectionHeader
              icon={<Package className="h-5 w-5" />}
              title="Materiales"
              description="Catálogo maestro de materiales. Crea, edita y administra el estado de cada registro."
              color="emerald"
              actions={
                <Button
                  onClick={handleOpenCreate}
                  variant="primary"
                  colorScheme="emerald"
                  size="md"
                  icon={<Plus className="h-4 w-4" />}
                >
                  Nuevo material
                </Button>
              }
            />
          </motion.div>

          {/* ── Table card ── */}
          <motion.div variants={itemVariants} className="overflow-hidden rounded-2xl border border-slate-200/80 border-l-4 border-l-emerald-400 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 p-5 md:flex-row md:items-center md:justify-between">
              <SearchInput
                id="materiales-search"
                value={search}
                onChange={setSearch}
                placeholder="Buscar por nombre o unidad..."
                ariaLabel="Buscar material"
                className="md:w-96"
              />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-white px-4 py-2.5 text-xs font-bold text-slate-600">
                  <Package className="h-4 w-4 text-slate-400" />
                  Total: <span className="text-slate-950">{materials.length}</span>
                </div>
              </div>
            </div>

            <Table
              columns={columns}
              data={filtered}
              rowKey={(m) => m.id}
              isLoading={isLoading}
              emptyMessage="No se encontraron materiales con ese criterio."
              maxHeight="35rem"
              pageSize={20}
            />
          </motion.div>

          <MaterialFormModal
            isOpen={isModalOpen}
            mode={modalMode}
            editingId={editingId}
            form={form}
            onFormChange={setForm}
            isSaving={isSaving}
            onClose={handleCloseModal}
            onSave={handleSave}
          />

          {/* ── Confirm Toggle Status ── */}
          <ConfirmDialog
            isOpen={confirmToggleId !== null}
            onClose={() => setConfirmToggleId(null)}
            onConfirm={() => {
              if (confirmToggleId !== null) handleToggleStatus(confirmToggleId);
            }}
            title="Cambiar estado del material"
            message={`¿Estás seguro de ${materials.find(m => m.id === confirmToggleId)?.isActive ? "desactivar" : "activar"} este material? ${materials.find(m => m.id === confirmToggleId)?.isActive ? "Los proyectos existentes no se verán afectados, pero el material dejará de estar disponible para nuevas obras." : "El material volverá a estar disponible en el catálogo."}`}
            variant="warning"
            confirmLabel={materials.find(m => m.id === confirmToggleId)?.isActive ? "Desactivar" : "Activar"}
            isLoading={togglingId === confirmToggleId}
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
