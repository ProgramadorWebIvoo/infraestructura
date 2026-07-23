/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de configuración de proveedores (catálogo maestro).
 * CRUD completo + gestión de estado.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Building2,
  CheckCircle,
  Loader2,
  Pencil,
  Plus,
  Search,
  Shield,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  UserCog,
  UserMinus,
  UserX,
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

interface ConfigContractor {
  code: string;
  name: string;
  specialty: string;
  rating: number;
  contact: string;
  registrationSource: "SEED" | "PUBLIC_PORTAL" | "INTERNAL";
  status: "PENDING_REVIEW" | "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

type ContractorForm = {
  name: string;
  specialty: string;
  contact: string;
  rating: number | "";
  status: "PENDING_REVIEW" | "ACTIVE" | "INACTIVE";
};

const EMPTY_FORM: ContractorForm = {
  name: "",
  specialty: "",
  contact: "",
  rating: 4.0,
  status: "ACTIVE",
};

// Status options for SelectModal
const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Activo", description: "Proveedor activo y disponible para licitaciones", raw: "ACTIVE" },
  { value: "INACTIVE", label: "Inactivo", description: "Proveedor desactivado temporalmente", raw: "INACTIVE" },
  { value: "PENDING_REVIEW", label: "Pendiente de revisión", description: "Proveedor pendiente de aprobación", raw: "PENDING_REVIEW" },
];

const SOURCE_BADGE: Record<string, { label: string; class: string }> = {
  INTERNAL:      { label: "Interno",        class: "bg-sky-50 text-sky-700 border-sky-200" },
  PUBLIC_PORTAL: { label: "Portal público", class: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  SEED:          { label: "Seed",           class: "bg-slate-100 text-slate-500 border-slate-200" },
};

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  ACTIVE:         { label: "Activo",              class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  INACTIVE:       { label: "Inactivo",            class: "bg-red-50 text-red-700 border-red-200" },
  PENDING_REVIEW: { label: "Pendiente de revisión", class: "bg-amber-50 text-amber-700 border-amber-200" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProveedoresConfigPanel({ authToken, onContractorMutated }: { authToken: string; onContractorMutated?: () => void }) {
  const { showToast } = useToast();

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
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

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
  const filtered = contractors.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.specialty.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.toLowerCase().includes(search.toLowerCase()),
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
        const created = await apiFetch<ConfigContractor>("/contractors/config", {
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
        showToast("Proveedor creado correctamente.", "success");
        onContractorMutated?.();
      } else if (editingCode) {
        const updated = await apiFetch<ConfigContractor>(`/contractors/config/${editingCode}`, {
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
      const result = await apiFetch<{ code: string; status: string }>(`/contractors/config/${code}/toggle-status`, {
        method: "POST",
        token: authToken,
      });
      setContractors((prev) =>
        prev.map((c) =>
          c.code === code ? { ...c, status: result.status as ConfigContractor["status"] } : c,
        ),
      );
      showToast(`Proveedor ${result.status === "ACTIVE" ? "activado" : result.status === "INACTIVE" ? "desactivado" : "pendiente"}.`, "success");
      onContractorMutated?.();
    } catch (err) {
      showToast(getErrorMessage(err, "Error al cambiar estado."), "error");
    } finally {
      setTogglingCode(null);
    }
  };

  // ---- Columns ----
  const columns: Column<ConfigContractor>[] = [
    {
      key: "code",
      label: "Código",
      render: (c) => (
        <span className="rounded-lg border border-sky-100 bg-sky-50/80 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-600">
          {c.code}
        </span>
      ),
    },
    {
      key: "name",
      label: "Nombre",
      sortable: true,
      render: (c) => <span className="font-bold text-slate-800">{c.name}</span>,
    },
    {
      key: "specialty",
      label: "Especialidad",
      sortable: true,
      render: (c) => (
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
          {c.specialty}
        </span>
      ),
    },
    {
      key: "contact",
      label: "Contacto",
      render: (c) => (
        <span className="font-mono text-xs font-semibold text-slate-500">{c.contact}</span>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      align: "center",
      sortable: true,
      render: (c) => (
        <span className="font-mono text-sm font-black text-amber-600">{c.rating.toFixed(1)}</span>
      ),
    },
    {
      key: "registrationSource",
      label: "Origen",
      render: (c) => {
        const s = SOURCE_BADGE[c.registrationSource] ?? SOURCE_BADGE.INTERNAL;
        return (
          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${s.class}`}>
            {s.label}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Estado",
      sortable: true,
      render: (c) => {
        const s = STATUS_BADGE[c.status] ?? STATUS_BADGE.PENDING_REVIEW;
        return (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${s.class}`}>
            {c.status === "ACTIVE" ? (
              <CheckCircle className="h-3 w-3" />
            ) : c.status === "INACTIVE" ? (
              <XCircle className="h-3 w-3" />
            ) : (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {s.label}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Acciones",
      align: "center",
      render: (c) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => handleOpenEdit(c)}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition-all duration-200 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 hover:shadow-md"
            aria-label={`Editar ${c.name}`}
            title="Editar proveedor"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setConfirmToggleCode(c.code)}
            disabled={togglingCode === c.code}
            className={`rounded-lg border p-1.5 transition-all duration-200 hover:shadow-md ${
              c.status === "ACTIVE"
                ? "border-red-200 bg-white text-red-400 hover:bg-red-50 hover:text-red-600"
                : c.status === "INACTIVE"
                  ? "border-emerald-200 bg-white text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
                  : "border-amber-200 bg-white text-amber-400 hover:bg-amber-50 hover:text-amber-600"
            } disabled:cursor-not-allowed disabled:opacity-50`}
            aria-label={`Cambiar estado de ${c.name}`}
            title={
              c.status === "ACTIVE"
                ? "Desactivar proveedor"
                : c.status === "INACTIVE"
                  ? "Activar proveedor"
                  : "Aprobar proveedor"
            }
          >
            {togglingCode === c.code ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : c.status === "ACTIVE" ? (
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
      <motion.div variants={itemVariants} className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 border-l-4 border-l-sky-400 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-sky-700">
            <UserCog className="h-3.5 w-3.5" />
            Configuración
          </div>
          <h1 className="font-sans text-lg font-black tracking-tight text-slate-900">
            Proveedores
          </h1>
          <p className="text-xs font-medium text-slate-500">
            Catálogo maestro de proveedores. Crea, edita y administra el estado de cada registro.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition-all duration-200 hover:from-sky-700 hover:to-sky-600 hover:shadow-lg hover:shadow-sky-500/30 hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          Nuevo proveedor
        </button>
      </motion.div>

      {/* ── Table card ── */}
      <motion.div variants={itemVariants} className="overflow-hidden rounded-2xl border border-slate-200/80 border-l-4 border-l-indigo-400 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 p-5 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código, especialidad o contacto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-2.5 text-xs font-bold text-slate-600">
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

      {/* ── Create / Edit Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={modalMode === "create" ? "Nuevo proveedor" : "Editar proveedor"}
        badge={modalMode === "create" ? "Creación" : `Editando ${editingCode ?? ""}`}
        infoLine={modalMode === "edit" ? editingCode ?? "" : undefined}
        icon={<UserCog className="h-5 w-5" />}
        iconColor="indigo"
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
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-xs font-black text-white shadow-md shadow-indigo-500/20 transition-all duration-200 hover:from-indigo-700 hover:to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  {modalMode === "create" ? "Crear proveedor" : "Guardar cambios"}
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
              Nombre / Empresa *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={180}
              placeholder="Ej: Construcciones del Sur S.A."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Specialty */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Especialidad *
            </label>
            <input
              type="text"
              value={form.specialty}
              onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
              maxLength={180}
              placeholder="Ej: Obra civil, Instalaciones eléctricas..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Contact */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Contacto (email/teléfono) *
            </label>
            <input
              type="text"
              value={form.contact}
              onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              maxLength={180}
              placeholder="Ej: contacto@constructora.com"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Rating + Status inline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Rating (0.0 – 5.0)
              </label>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={form.rating}
                onChange={(e) => {
                  const v = e.target.value.replace(/[eE]/g, "");
                  if (v === "") { setForm((f) => ({ ...f, rating: "" })); return; }
                  const val = Math.min(5, Math.max(0, parseFloat(v) || 0));
                  setForm((f) => ({ ...f, rating: Math.round(val * 10) / 10 }));
                }}
                onKeyDown={(e) => {
                  if (e.key === "e" || e.key === "E" || e.key === "-" || e.key === "Subtract") e.preventDefault();
                }}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-center font-mono text-sm font-black text-amber-600 outline-hidden focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Estado
              </label>
              <SelectModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                onOpen={() => setIsStatusModalOpen(true)}
                onSelect={(opt) => setForm((f) => ({ ...f, status: opt.value as ContractorForm["status"] }))}
                options={STATUS_OPTIONS}
                selectedValue={form.status}
                triggerLabel="Seleccionar estado..."
                title="Seleccionar Estado"
                infoLine={`${STATUS_OPTIONS.length} opciones disponibles`}
                icon={<Shield className="h-5 w-5" />}
                iconColor="amber"
                maxWidth="max-w-md"
                searchPlaceholder="Buscar estado..."
              />
            </div>
          </div>

          {/* Origin hint on create */}
          {modalMode === "create" && (
            <p className="text-[11px] font-medium text-slate-400 italic">
              <Shield className="inline h-3 w-3 mr-1" />
              El proveedor se registrará con origen "Interno".
            </p>
          )}
        </div>
      </Modal>

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
    </motion.div>
  );
}
