/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de configuración de materiales (catálogo maestro).
 * CRUD completo + soft delete (Activo/Inactivo).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  CheckCircle,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  XCircle,
} from "lucide-react";
import { Table, type Column } from "../components/UI/Table";
import Modal from "../components/UI/Modal";
import ConfirmDialog from "../components/UI/ConfirmDialog";
import { useToast } from "../components/UI/Toast";
import { apiFetch } from "../services/api";
import { logError, getErrorMessage } from "../services/logger";
import { containerVariants, itemVariants } from "../animations";
import SelectModal from "../components/UI/SelectModal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConfigMaterial {
  id: number;
  name: string;
  unit: string;
  estimatedUnitPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type MaterialForm = {
  name: string;
  unit: string;
  estimatedUnitPrice: number | "";
  isActive: boolean;
};

const EMPTY_FORM: MaterialForm = {
  name: "",
  unit: "",
  estimatedUnitPrice: 0,
  isActive: true,
};

// Status options for SelectModal
const statusOptions = [
  { value: 1, label: "Activo", description: "Material disponible en obras", raw: true },
  { value: 0, label: "Inactivo", description: "Material oculto (soft delete)", raw: false },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

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

  // ---- Columns ----
  const columns: Column<ConfigMaterial>[] = [
    {
      key: "id",
      label: "ID",
      width: "5rem",
      render: (m) => (
        <span className="rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500">
          #{m.id}
        </span>
      ),
    },
    {
      key: "name",
      label: "Nombre",
      sortable: true,
      render: (m) => <span className="font-bold text-slate-800">{m.name}</span>,
    },
    {
      key: "unit",
      label: "Unidad",
      sortable: true,
      render: (m) => (
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
          {m.unit}
        </span>
      ),
    },
    {
      key: "estimatedUnitPrice",
      label: "Precio est.",
      align: "right",
      sortable: true,
      render: (m) => (
        <span className="font-mono text-sm font-black text-emerald-600">
          ${m.estimatedUnitPrice.toFixed(2)}
        </span>
      ),
    },
    {
      key: "isActive",
      label: "Estado",
      sortable: true,
      render: (m) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
            m.isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-100 text-slate-500"
          }`}
        >
          {m.isActive ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          {m.isActive ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      align: "center",
      render: (m) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => handleOpenEdit(m)}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition-all duration-200 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 hover:shadow-md"
            aria-label={`Editar ${m.name}`}
            title="Editar material"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setConfirmToggleId(m.id)}
            disabled={togglingId === m.id}
            className={`rounded-lg border p-1.5 transition-all duration-200 hover:shadow-md ${
              m.isActive
                ? "border-red-200 bg-white text-red-400 hover:bg-red-50 hover:text-red-600"
                : "border-emerald-200 bg-white text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
            } disabled:cursor-not-allowed disabled:opacity-50`}
            aria-label={`${m.isActive ? "Desactivar" : "Activar"} ${m.name}`}
            title={m.isActive ? "Desactivar material" : "Activar material"}
          >
            {togglingId === m.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : m.isActive ? (
              <ToggleRight className="h-3.5 w-3.5" />
            ) : (
              <ToggleLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      ),
    },
  ];

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
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition-all duration-200 hover:from-emerald-700 hover:to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          Nuevo material
        </button>
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

      {/* ── Create / Edit Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={modalMode === "create" ? "Nuevo material" : "Editar material"}
        badge={modalMode === "create" ? "Creación" : `Editando #${editingId ?? ""}`}
        infoLine={modalMode === "edit" ? `ID: ${editingId}` : undefined}
        icon={<Package className="h-5 w-5" />}
        iconColor="emerald"
        maxWidth="max-w-lg"
        closeDisabled={isSaving}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCloseModal}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:shadow-md disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-xs font-black text-white shadow-md shadow-emerald-500/20 transition-all duration-200 hover:from-emerald-700 hover:to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  {modalMode === "create" ? "Crear material" : "Guardar cambios"}
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Nombre *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={180}
              placeholder="Ej: Cemento Portland (Saco 42.5kg)"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {/* Unit + Price inline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Unidad *
              </label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                maxLength={80}
                placeholder="Ej: Saco, m3, Unidad"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Precio unitario est. ($)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.estimatedUnitPrice}
                onChange={(e) => {
                  const v = e.target.value.replace(/[eE]/g, "");
                  if (v === "") { setForm((f) => ({ ...f, estimatedUnitPrice: "" })); return; }
                  const val = Math.max(0, parseFloat(v) || 0);
                  setForm((f) => ({ ...f, estimatedUnitPrice: Math.round(val * 100) / 100 }));
                }}
                onKeyDown={(e) => {
                  if (e.key === "e" || e.key === "E" || e.key === "-" || e.key === "Subtract") e.preventDefault();
                }}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-center font-mono text-sm font-black text-emerald-600 outline-hidden focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          {/* Status toggle only in edit mode */}
          {modalMode === "edit" && (
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Estado
              </label>
              <SelectModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                onOpen={() => setIsStatusModalOpen(true)}
                onSelect={(opt) => setForm((f) => ({ ...f, isActive: opt.value === 1 }))}
                options={statusOptions}
                selectedValue={form.isActive ? 1 : 0}
                triggerLabel={form.isActive ? "Activo" : "Inactivo"}
                title="Seleccionar Estado"
                infoLine={`${statusOptions.length} opciones disponibles`}
                icon={<Package className="h-5 w-5" />}
                iconColor="emerald"
                maxWidth="max-w-md"
                searchPlaceholder="Buscar estado..."
              />
            </div>
          )}
        </div>
      </Modal>

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
