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
import Card from "../../components/UI/Card";
import ConfirmDialog from "../../components/UI/ConfirmDialog";
import SectionHeader from "../../components/UI/SectionHeader";
import { SearchInput } from "../../components/UI/FilterBar";
import { SEMANTIC_COLOR_MAP } from "../../components/UI/colorTokens";
import { useToast } from "../../components/UI/Toast";
import { apiFetch } from "../../services/api";
import { logError, getErrorMessage } from "../../services/logger";
import { containerVariants, itemVariants, springs } from "../../animations";
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

    if (form.estimatedUnitPrice === "" || form.estimatedUnitPrice <= 0) {
      showToast("El precio unitario estimado debe ser mayor a 0.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        unit: form.unit.trim(),
        estimatedUnitPrice: form.estimatedUnitPrice as number,
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

  const materialPendingToggle = materials.find((m) => m.id === confirmToggleId);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <div className={isSuperadmin ? "grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-6 item-start" : ""}>
        <div className="space-y-6">
          {/* ── Header ── */}
          <motion.div variants={itemVariants}>
            <Card hoverable={false} className={`border-l-4 ${SEMANTIC_COLOR_MAP.success.borderL400}`}>
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
            </Card>
          </motion.div>

          {/* ── Table card ── */}
          <motion.div variants={itemVariants}>
            <Card hoverable={false} className={`p-0 overflow-hidden border-l-4 ${SEMANTIC_COLOR_MAP.success.borderL400}`}>
              <div className="flex flex-col gap-4 border-b border-border-subtle bg-surface-sunken/60 p-5 md:flex-row md:items-center md:justify-between">
                <SearchInput
                  id="materiales-search"
                  value={search}
                  onChange={setSearch}
                  placeholder="Buscar por nombre o unidad..."
                  ariaLabel="Buscar material"
                  className="md:w-96"
                />
                <div className="flex items-center gap-1.5 rounded-control border border-border-default bg-surface px-4 py-2.5 text-xs font-bold text-text-secondary">
                  <Package className="h-4 w-4 text-text-muted" />
                  <motion.span
                    key={filtered.length}
                    initial={{ scale: 1.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={springs.snappy}
                    className="text-text-primary"
                  >
                    {filtered.length}{filtered.length !== materials.length ? ` / ${materials.length}` : ""}
                  </motion.span>
                  {filtered.length === 1 ? "material" : "materiales"}
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
            </Card>
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
            message={`¿Estás seguro de ${materialPendingToggle?.isActive ? "desactivar" : "activar"} este material? ${materialPendingToggle?.isActive ? "Los proyectos existentes no se verán afectados, pero el material dejará de estar disponible para nuevas obras." : "El material volverá a estar disponible en el catálogo."}`}
            variant="warning"
            confirmLabel={materialPendingToggle?.isActive ? "Desactivar" : "Activar"}
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
