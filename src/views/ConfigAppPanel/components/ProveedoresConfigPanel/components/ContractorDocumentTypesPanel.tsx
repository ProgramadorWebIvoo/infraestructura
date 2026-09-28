/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Catálogo configurable de tipos de documento del proveedor (F4 Bloque A, D6):
 * listar, crear, editar nombre/obligatorio/orden, activar/desactivar y
 * eliminar (solo si no tiene documentos cargados).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Pencil, Plus, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import Modal from "@/components/UI/Modal";
import ConfirmDialog from "@/components/UI/ConfirmDialog";
import SectionHeader from "@/components/UI/SectionHeader";
import TextField from "@/components/UI/TextField";
import NumericInput from "@/components/UI/NumericInput";
import ActiveBadge from "@/components/UI/ActiveBadge";
import IconActionButton from "@/components/UI/IconActionButton";
import { Table, type Column } from "@/components/UI/Table";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { useToast } from "@/components/UI/Toast";
import { apiFetch } from "@/services/api";
import { getErrorMessage, logError } from "@/services/logger";
import type { ContractorDocumentType } from "@/services/contractorDocuments";
import type { ConfigAuditLogRecord } from "@/hooks/useConfigAuditLogs";

interface ContractorDocumentTypesPanelProps {
  authToken: string;
  onAuditLog?: (log: ConfigAuditLogRecord) => void;
}

type WithAudit<T> = T & { auditLog?: ConfigAuditLogRecord };

interface TypeForm {
  label: string;
  isRequired: boolean;
  sortOrder: number | "";
}

const EMPTY_FORM: TypeForm = { label: "", isRequired: true, sortOrder: "" };
const BASE_PATH = "/contractor-document-types/config";

export default function ContractorDocumentTypesPanel({ authToken, onAuditLog }: ContractorDocumentTypesPanelProps) {
  const { showToast } = useToast();
  const [types, setTypes] = useState<ContractorDocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TypeForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContractorDocumentType | null>(null);

  const load = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await apiFetch<{ data: ContractorDocumentType[] }>(BASE_PATH, { token: authToken });
      setTypes(res.data ?? []);
    } catch (error) {
      logError("ContractorDocumentTypesPanel.load", error);
      showToast("No se pudieron cargar los tipos de documento.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = useCallback((type: ContractorDocumentType) => {
    setEditingId(type.id);
    setForm({ label: type.label, isRequired: type.isRequired, sortOrder: type.sortOrder });
    setIsModalOpen(true);
  }, []);

  const closeModal = () => {
    if (!isSaving) setIsModalOpen(false);
  };

  const handleSave = async () => {
    const label = form.label.trim();
    if (!label) {
      showToast("Ingresa el nombre del tipo de documento.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const body = JSON.stringify({
        label,
        isRequired: form.isRequired,
        ...(form.sortOrder === "" ? {} : { sortOrder: form.sortOrder }),
      });
      if (editingId === null) {
        const created = await apiFetch<WithAudit<ContractorDocumentType>>(BASE_PATH, { method: "POST", token: authToken, body });
        setTypes((prev) => [...prev, created]);
        if (created.auditLog) onAuditLog?.(created.auditLog);
        showToast("Tipo de documento creado correctamente.", "success");
      } else {
        const updated = await apiFetch<WithAudit<ContractorDocumentType>>(`${BASE_PATH}/${editingId}`, { method: "PATCH", token: authToken, body });
        setTypes((prev) => prev.map((t) => (t.id === editingId ? { ...t, ...updated } : t)));
        if (updated.auditLog) onAuditLog?.(updated.auditLog);
        showToast("Tipo de documento actualizado correctamente.", "success");
      }
      setIsModalOpen(false);
    } catch (error) {
      showToast(getErrorMessage(error, "No se pudo guardar el tipo de documento."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = useCallback(async (type: ContractorDocumentType) => {
    setBusyId(type.id);
    try {
      const result = await apiFetch<WithAudit<{ id: number; isActive: boolean }>>(`${BASE_PATH}/${type.id}/toggle-status`, { method: "POST", token: authToken });
      setTypes((prev) => prev.map((t) => (t.id === type.id ? { ...t, isActive: result.isActive } : t)));
      if (result.auditLog) onAuditLog?.(result.auditLog);
      showToast(`Tipo de documento ${result.isActive ? "activado" : "desactivado"} correctamente.`, "success");
    } catch (error) {
      showToast(getErrorMessage(error, "No se pudo cambiar el estado."), "error");
    } finally {
      setBusyId(null);
    }
  }, [authToken, onAuditLog, showToast]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      const result = await apiFetch<{ auditLog?: ConfigAuditLogRecord }>(`${BASE_PATH}/${deleteTarget.id}`, { method: "DELETE", token: authToken });
      setTypes((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      if (result?.auditLog) onAuditLog?.(result.auditLog);
      showToast("Tipo de documento eliminado correctamente.", "success");
      setDeleteTarget(null);
    } catch (error) {
      showToast(getErrorMessage(error, "No se pudo eliminar el tipo de documento."), "error");
    } finally {
      setBusyId(null);
    }
  };

  const columns = useMemo<Column<ContractorDocumentType>[]>(() => [
    {
      key: "label",
      label: "Documento",
      sortable: true,
      render: (t) => <span className="font-bold text-text-primary">{t.label}</span>,
    },
    {
      key: "isRequired",
      label: "Obligatorio",
      align: "center",
      render: (t) => {
        const c = t.isRequired ? SEMANTIC_COLOR_MAP.warning : SEMANTIC_COLOR_MAP.neutral;
        return (
          <span className={`rounded-pill border px-2.5 py-0.5 text-[10px] font-bold ${c.border100} ${c.bg50} ${c.text700}`}>
            {t.isRequired ? "Obligatorio" : "Opcional"}
          </span>
        );
      },
    },
    { key: "sortOrder", label: "Orden", align: "center", sortable: true, render: (t) => <span className="font-mono text-xs">{t.sortOrder}</span> },
    { key: "documentsCount", label: "Cargados", align: "center", render: (t) => <span className="font-mono text-xs">{t.documentsCount ?? 0}</span> },
    { key: "isActive", label: "Estado", align: "center", render: (t) => <ActiveBadge isActive={t.isActive} /> },
    {
      key: "actions",
      label: "Acciones",
      align: "center",
      render: (t) => (
        <div className="flex items-center justify-center gap-1.5">
          <IconActionButton label={`Editar ${t.label}`} tooltip="Editar tipo" onClick={() => openEdit(t)} tone="indigo" icon={<Pencil className="h-3.5 w-3.5" />} />
          <IconActionButton
            label={`${t.isActive ? "Desactivar" : "Activar"} ${t.label}`}
            tooltip={t.isActive ? "Desactivar tipo" : "Activar tipo"}
            onClick={() => void handleToggle(t)}
            isBusy={busyId === t.id}
            tone={t.isActive ? "rose" : "emerald"}
            icon={t.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
          />
          <IconActionButton
            label={`Eliminar ${t.label}`}
            tooltip={(t.documentsCount ?? 0) > 0 ? "Tiene documentos: desactívalo en su lugar" : "Eliminar tipo"}
            onClick={() => setDeleteTarget(t)}
            disabled={(t.documentsCount ?? 0) > 0}
            tone="rose"
            icon={<Trash2 className="h-3.5 w-3.5" />}
          />
        </div>
      ),
    },
  ], [busyId, handleToggle, openEdit]);

  return (
    <Card hoverable={false} className={`space-y-4 border-l-4 ${SEMANTIC_COLOR_MAP.info.borderL400}`}>
      <SectionHeader
        icon={<FileText className="h-5 w-5" />}
        title="Documentos del proveedor"
        description="Tipos de documento que debe cargar cada proveedor al registrarse. Los obligatorios bloquean el registro hasta adjuntarse."
        color="indigo"
        actions={
          <Button onClick={openCreate} variant="primary" colorScheme="indigo" size="md" icon={<Plus className="h-4 w-4" />}>
            Nuevo tipo de documento
          </Button>
        }
      />

      <Table
        columns={columns}
        data={types}
        rowKey={(t) => String(t.id)}
        isLoading={isLoading}
        emptyMessage="No hay tipos de documento configurados."
        pageSize={10}
        onRefresh={load}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId === null ? "Nuevo tipo de documento" : "Editar tipo de documento"}
        icon={<FileText className="h-5 w-5" />}
        iconColor="indigo"
        maxWidth="max-w-md"
        closeDisabled={isSaving}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={closeModal} disabled={isSaving}>Cancelar</Button>
            <Button onClick={() => void handleSave()} disabled={isSaving} isLoading={isSaving} variant="primary" colorScheme="indigo">
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <TextField
            id="document-type-label"
            label="Nombre del documento"
            value={form.label}
            onChange={(label) => setForm((prev) => ({ ...prev, label }))}
            maxLength={150}
            placeholder="Ej: Solvencia fiscal"
            required
          />
          <label className="flex items-center gap-2 text-xs font-bold text-text-secondary">
            <input
              id="document-type-required"
              type="checkbox"
              checked={form.isRequired}
              onChange={(e) => setForm((prev) => ({ ...prev, isRequired: e.target.checked }))}
            />
            Obligatorio para el registro
          </label>
          <div>
            <label htmlFor="document-type-order" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
              Orden (opcional)
            </label>
            <NumericInput
              id="document-type-order"
              value={form.sortOrder}
              onChange={(v) => setForm((prev) => ({ ...prev, sortOrder: v === "" ? "" : Math.max(0, Math.round(v)) }))}
              placeholder="Al final"
              step="1"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Eliminar tipo de documento"
        message={`¿Eliminar «${deleteTarget?.label ?? ""}»? Esta acción no se puede deshacer.`}
        variant="danger"
        confirmLabel="Eliminar"
        isLoading={busyId === deleteTarget?.id}
      />
    </Card>
  );
}
