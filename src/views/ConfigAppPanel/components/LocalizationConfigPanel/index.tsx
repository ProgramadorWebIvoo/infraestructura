/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Registered locations (F2-R D10–D13): stores, plants and offices, each with a
 * mandatory resident. Managed by ADMIN/SUPERADMIN. Also hosts the resident
 * "Traspaso" (D17). Same structure as ProjectTypeConfigPanel.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRightLeft, MapPin, Plus } from "lucide-react";
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
import { useConfigAuditLogs, type ConfigAuditLogRecord } from "@/hooks/useConfigAuditLogs";
import { localizationConfigSchema, residentChangeReasonError } from "@/schemas/localizationConfig.schema";
import { getLocalizationColumns } from "./columns";
import LocalizationFormModal from "./components/LocalizationFormModal";
import ResidentTransferModal from "./components/ResidentTransferModal";
import { EMPTY_FORM, type ConfigLocalization, type LocalizationForm } from "./types";

interface LocalizationConfigPanelProps {
  authToken: string;
  activeRole?: string;
}

type WriteResponse = ConfigLocalization & { auditLog?: ConfigAuditLogRecord; auditLogs?: ConfigAuditLogRecord[] };

export default function LocalizationConfigPanel({ authToken, activeRole }: LocalizationConfigPanelProps) {
  const { showToast } = useToast();
  const isSuperadmin = activeRole === "SUPERADMIN";
  const { prependLocal: prependAuditLog } = useConfigAuditLogs(authToken, isSuperadmin);

  const [items, setItems] = useState<ConfigLocalization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<ConfigLocalization | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<LocalizationForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [confirmToggleId, setConfirmToggleId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const load = useCallback(async () => {
    if (!authToken) return;
    try {
      setItems(await apiFetch<ConfigLocalization[]>("/localizations", { token: authToken }));
    } catch (error) {
      logError("LocalizationConfigPanel.load", error);
      showToast("No se pudieron cargar las ubicaciones.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((l) => `${l.title} ${l.city} ${l.region ?? ""} ${l.residentName ?? ""}`.toLowerCase().includes(q));
  }, [items, search]);

  const pushAuditLogs = (r: { auditLog?: ConfigAuditLogRecord; auditLogs?: ConfigAuditLogRecord[] }) => {
    if (!isSuperadmin) return;
    [...(r.auditLogs ?? []), ...(r.auditLog ? [r.auditLog] : [])].forEach(prependAuditLog);
  };

  const handleOpenCreate = () => {
    setModalMode("create");
    setEditing(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = useCallback((l: ConfigLocalization) => {
    setModalMode("edit");
    setEditing(l);
    setForm({
      title: l.title,
      address: l.address ?? "",
      city: l.city,
      region: l.region ?? "",
      type: l.type,
      notes: l.notes ?? "",
      isActive: l.isActive,
      residentUserId: l.residentUserId,
      reason: "",
    });
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditing(null);
  };

  const handleSave = async () => {
    const parsed = localizationConfigSchema.safeParse(form);
    if (!parsed.success) {
      showToast(parsed.error.issues[0].message, "error");
      return;
    }
    const reasonError = modalMode === "edit" ? residentChangeReasonError(editing?.residentUserId ?? null, form.residentUserId, form.reason) : null;
    if (reasonError) {
      showToast(reasonError, "error");
      return;
    }

    const payload = {
      title: form.title.trim(),
      city: form.city.trim(),
      region: form.region.trim() || null,
      address: form.address.trim() || null,
      type: form.type,
      notes: form.notes.trim() || null,
      residentUserId: form.residentUserId,
      ...(modalMode === "edit" ? { isActive: form.isActive } : {}),
      ...(modalMode === "edit" && form.residentUserId !== editing?.residentUserId ? { reason: form.reason.trim() } : {}),
    };

    setIsSaving(true);
    try {
      if (modalMode === "create") {
        const created = await apiFetch<WriteResponse>("/localizations", { method: "POST", token: authToken, body: JSON.stringify(payload) });
        pushAuditLogs(created);
        showToast("Ubicación creada correctamente.", "success");
      } else if (editing) {
        const updated = await apiFetch<WriteResponse>(`/localizations/${editing.id}`, { method: "PATCH", token: authToken, body: JSON.stringify(payload) });
        pushAuditLogs(updated);
        showToast("Ubicación actualizada correctamente.", "success");
      }
      setIsModalOpen(false);
      setEditing(null);
      await load(); // projectsCount and resident names come from the server
    } catch (error) {
      showToast(getErrorMessage(error, "Error al guardar la ubicación."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (id: number) => {
    setConfirmToggleId(null);
    setTogglingId(id);
    try {
      const result = await apiFetch<{ id: number; isActive: boolean; auditLog?: ConfigAuditLogRecord }>(`/localizations/${id}/toggle-status`, { method: "POST", token: authToken });
      setItems((prev) => prev.map((l) => (l.id === id ? { ...l, isActive: result.isActive } : l)));
      pushAuditLogs(result);
      showToast(`Ubicación ${result.isActive ? "activada" : "desactivada"} correctamente.`, "success");
    } catch (error) {
      showToast(getErrorMessage(error, "Error al cambiar el estado."), "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmDeleteId(null);
    try {
      const result = await apiFetch<{ auditLog?: ConfigAuditLogRecord }>(`/localizations/${id}`, { method: "DELETE", token: authToken });
      setItems((prev) => prev.filter((l) => l.id !== id));
      pushAuditLogs(result);
      showToast("Ubicación eliminada.", "success");
    } catch (error) {
      showToast(getErrorMessage(error, "No se pudo eliminar la ubicación."), "error");
    }
  };

  const columns = useMemo(
    () => getLocalizationColumns({ togglingId, onEdit: handleOpenEdit, onRequestToggle: setConfirmToggleId, onRequestDelete: setConfirmDeleteId }),
    [togglingId, handleOpenEdit],
  );

  const pendingToggle = items.find((l) => l.id === confirmToggleId);
  const pendingDelete = items.find((l) => l.id === confirmDeleteId);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card hoverable={false} className={`border-l-4 ${SEMANTIC_COLOR_MAP.success.borderL400}`}>
          <SectionHeader
            icon={<MapPin className="h-5 w-5" />}
            title="Ubicaciones"
            description="Tiendas, plantas y oficinas registradas. Cada una tiene un residente obligatorio que hereda toda obra creada en ella."
            color="emerald"
            actions={
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setIsTransferOpen(true)} icon={<ArrowRightLeft className="h-4 w-4" />}>
                  Traspaso de residente
                </Button>
                <Button onClick={handleOpenCreate} variant="primary" colorScheme="emerald" icon={<Plus className="h-4 w-4" />}>
                  Nueva ubicación
                </Button>
              </div>
            }
          />
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card hoverable={false} className={`overflow-hidden border-l-4 p-0 ${SEMANTIC_COLOR_MAP.success.borderL400}`}>
          <TableToolbar
            searchId="localizations-search"
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar por título, ciudad o residente..."
            searchAriaLabel="Buscar ubicación"
            countIcon={<MapPin />}
            filteredCount={filtered.length}
            totalCount={items.length}
            noun="ubicación"
            nounPlural="ubicaciones"
          />
          <Table columns={columns} data={filtered} rowKey={(l) => l.id} isLoading={isLoading} emptyMessage="No se encontraron ubicaciones con ese criterio." pageSize={20} onRefresh={load} />
        </Card>
      </motion.div>

      <LocalizationFormModal
        isOpen={isModalOpen}
        mode={modalMode}
        form={form}
        onFormChange={setForm}
        originalResidentId={editing?.residentUserId ?? null}
        isSaving={isSaving}
        onClose={handleCloseModal}
        onSave={handleSave}
      />

      <ResidentTransferModal
        isOpen={isTransferOpen}
        authToken={authToken}
        onClose={() => setIsTransferOpen(false)}
        onError={(message) => showToast(message, "error")}
        onDone={(moved) => {
          setIsTransferOpen(false);
          showToast(`Traspaso realizado: ${moved.localizations} ubicación(es) y ${moved.projects} obra(s) personalizada(s).`, "success");
          void load();
        }}
      />

      <ConfirmDialog
        isOpen={confirmToggleId !== null}
        onClose={() => setConfirmToggleId(null)}
        onConfirm={() => confirmToggleId !== null && handleToggle(confirmToggleId)}
        title="Cambiar estado de la ubicación"
        message={
          pendingToggle?.isActive
            ? "Al desactivarla dejará de ofrecerse para obras nuevas; las obras existentes conservan su ubicación y su residente."
            : "La ubicación volverá a ofrecerse al crear obras."
        }
        variant="warning"
        confirmLabel={pendingToggle?.isActive ? "Desactivar" : "Activar"}
        isLoading={togglingId === confirmToggleId}
      />

      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId !== null && handleDelete(confirmDeleteId)}
        title="Eliminar ubicación"
        message={`¿Eliminar "${pendingDelete?.title ?? ""}"? Solo es posible porque no tiene obras asociadas.`}
        variant="danger"
        confirmLabel="Eliminar"
      />
    </motion.div>
  );
}
