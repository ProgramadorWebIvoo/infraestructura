/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de configuración de materiales (catálogo maestro).
 * CRUD completo + soft delete (Activo/Inactivo).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Package, Plus, Search } from "lucide-react";
import { Table } from "../../components/UI/Table";
import Button from "../../components/UI/Button";
import ConfirmDialog from "../../components/UI/ConfirmDialog";
import { useToast } from "../../components/UI/Toast";
import { apiFetch } from "../../services/api";
import { logError, getErrorMessage } from "../../services/logger";
import { containerVariants, itemVariants } from "../../animations";
import { getMaterialColumns } from "./columns";
import MaterialFormModal from "./MaterialFormModal";
import { EMPTY_FORM, type ConfigMaterial, type MaterialForm } from "./types";

export default function MaterialConfigPanel({ authToken }: { authToken: string }) {
  const { showToast } = useToast();

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
        const created = await apiFetch<ConfigMaterial>("/materials/config", {
          method: "POST",
          token: authToken,
          body: JSON.stringify(payload),
        });
        setMaterials((prev) => [...prev, created]);
        showToast("Material creado correctamente.", "success");
      } else if (editingId) {
        const updated = await apiFetch<ConfigMaterial>(`/materials/config/${editingId}`, {
          method: "PATCH",
          token: authToken,
          body: JSON.stringify(payload),
        });
        setMaterials((prev) => prev.map((m) => (m.id === editingId ? updated : m)));
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
      const result = await apiFetch<{ id: number; isActive: boolean }>(
        `/materials/config/${id}/toggle-status`,
        { method: "POST", token: authToken },
      );
      setMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isActive: result.isActive } : m)),
      );
      showToast(`Material ${result.isActive ? "activado" : "desactivado"}.`, "success");
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
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 border-l-4 border-l-emerald-400 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
            <Package className="h-3.5 w-3.5" />
            Configuración
          </div>
          <h1 className="font-sans text-lg font-black tracking-tight text-slate-900">
            Materiales
          </h1>
          <p className="text-xs font-medium text-slate-500">
            Catálogo maestro de materiales. Crea, edita y administra el estado de cada registro.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          variant="primary"
          colorScheme="emerald"
          size="md"
          icon={<Plus className="h-4 w-4" />}
        >
          Nuevo material
        </Button>
      </motion.div>

      {/* ── Table card ── */}
      <motion.div variants={itemVariants} className="overflow-hidden rounded-2xl border border-slate-200/80 border-l-4 border-l-emerald-400 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 p-5 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o unidad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-2.5 text-xs font-bold text-slate-600">
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
    </motion.div>
  );
}
