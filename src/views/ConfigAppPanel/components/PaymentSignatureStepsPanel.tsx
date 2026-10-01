/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cadenas de firma configurables por tipo de pago (F4 Bloque C, D2):
 * listar, crear, editar y eliminar pasos de ANTICIPO/FINIQUITO. Cada paso
 * firma por rol; sin pasos configurados, ese tipo de pago no exige firmas.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSignature, Plus, Trash2 } from "lucide-react";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import Modal from "@/components/UI/Modal";
import ConfirmDialog from "@/components/UI/ConfirmDialog";
import SectionHeader from "@/components/UI/SectionHeader";
import InfoBanner from "@/components/UI/InfoBanner";
import TextField from "@/components/UI/TextField";
import NumericInput from "@/components/UI/NumericInput";
import SegmentedControl from "@/components/UI/SegmentedControl";
import Select from "@/components/UI/Select";
import IconActionButton from "@/components/UI/IconActionButton";
import { Table, type Column } from "@/components/UI/Table";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { useToast } from "@/components/UI/Toast";
import { apiFetch } from "@/services/api";
import { getErrorMessage, logError } from "@/services/logger";
import { roleLabel } from "@/constants/roles";
import type { PaymentSignatureStep } from "@/types";

interface PaymentSignatureStepsPanelProps {
  authToken: string;
}

interface StepForm {
  paymentType: "ADVANCE" | "FINAL";
  stepOrder: number | "";
  role: string;
  label: string;
  isRequired: boolean;
}

const EMPTY_FORM: StepForm = { paymentType: "ADVANCE", stepOrder: "", role: "", label: "", isRequired: true };
const BASE_PATH = "/payment-signature-steps/config";
const TYPE_LABEL: Record<StepForm["paymentType"], string> = { ADVANCE: "Anticipo", FINAL: "Finiquito" };

/**
 * Dónde firma "solo" cada paso (F4 Bloque C, integración real): las
 * acciones del circuito intentan firmar en silencio el próximo paso
 * pendiente si le corresponde al rol que las ejecuta. Si el rol configurado
 * no coincide con ninguna (o no le toca su turno), el paso queda pendiente
 * y se firma a mano desde la orden.
 *
 * `blocks: true` = si el paso es obligatorio y falta, ESA acción se
 * rechaza (nadie la salta, ni ADMIN/SUPERADMIN). `blocks: false` = la
 * acción firma si puede pero nunca espera por ese paso — bloquearla
 * generaría un candado cruzado (ej. Finanzas solo puede firmar al pagar,
 * y eso ocurre después de estos trámites).
 */
const AUTO_SIGN_HINT: Record<StepForm["paymentType"], Record<string, { where: string; blocks: boolean }>> = {
  ADVANCE: {
    PROCURA: { where: "Selección de proveedor", blocks: false },
    PRESIDENCIA: { where: "Aprobación de la adjudicación", blocks: true },
    FINANZAS: { where: "Liberación del anticipo (pago)", blocks: true },
  },
  FINAL: {
    PROCURA: { where: "Solicitud de pago del finiquito", blocks: false },
    FINANZAS: { where: "Liberación del finiquito (pago)", blocks: true },
  },
};

function autoSignHint(paymentType: StepForm["paymentType"], role: string | null, isRequired: boolean): string {
  if (!role) return "Firma manual desde la orden — nunca bloquea";
  const hit = AUTO_SIGN_HINT[paymentType][role];
  if (!hit) return "Firma manual desde la orden — ningún trámite coincide con este rol, nunca bloquea";
  if (!hit.blocks) return `${hit.where} — nunca bloquea esa acción (se firma si aplica, sin esperar)`;
  return isRequired ? `${hit.where} — bloquea la acción si falta` : `${hit.where} — no bloquea (paso opcional)`;
}

export default function PaymentSignatureStepsPanel({ authToken }: PaymentSignatureStepsPanelProps) {
  const { showToast } = useToast();
  const [steps, setSteps] = useState<PaymentSignatureStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<StepForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PaymentSignatureStep | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const list = await apiFetch<PaymentSignatureStep[]>(BASE_PATH, { token: authToken });
      setSteps(list ?? []);
    } catch (error) {
      logError("PaymentSignatureStepsPanel.load", error);
      showToast("No se pudieron cargar las cadenas de firma.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Roles válidos del sistema (fuente de verdad: backend, App\Support\Roles).
  useEffect(() => {
    apiFetch<string[]>("/roles", { token: authToken })
      .then((list) => setRoles(list ?? []))
      .catch((error) => logError("PaymentSignatureStepsPanel.loadRoles", error));
  }, [authToken]);

  const roleOptions = useMemo(
    () => [{ value: "", label: "Selecciona un rol" }, ...roles.map((role) => ({ value: role, label: roleLabel(role) }))],
    [roles],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = useCallback((step: PaymentSignatureStep) => {
    setEditingId(step.id);
    setForm({ paymentType: step.paymentType, stepOrder: step.stepOrder, role: step.role ?? "", label: step.label, isRequired: step.isRequired });
    setIsModalOpen(true);
  }, []);

  const closeModal = () => {
    if (!isSaving) setIsModalOpen(false);
  };

  const handleSave = async () => {
    const label = form.label.trim();
    const role = form.role;
    if (!label || !role || form.stepOrder === "") {
      showToast("Completa el orden, el rol que firma y una etiqueta.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const body = JSON.stringify({ paymentType: form.paymentType, stepOrder: form.stepOrder, role, label, isRequired: form.isRequired });
      if (editingId === null) {
        await apiFetch(BASE_PATH, { method: "POST", token: authToken, body });
        showToast("Paso de firma creado correctamente.", "success");
      } else {
        await apiFetch(`${BASE_PATH}/${editingId}`, { method: "PATCH", token: authToken, body });
        showToast("Paso de firma actualizado correctamente.", "success");
      }
      setIsModalOpen(false);
      await load();
    } catch (error) {
      showToast(getErrorMessage(error, "No se pudo guardar el paso de firma."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiFetch(`${BASE_PATH}/${deleteTarget.id}`, { method: "DELETE", token: authToken });
      showToast("Paso de firma eliminado correctamente.", "success");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      showToast(getErrorMessage(error, "No se pudo eliminar el paso de firma."), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo<Column<PaymentSignatureStep>[]>(() => [
    { key: "paymentType", label: "Tipo de pago", render: (s) => <span className="font-bold text-text-primary">{TYPE_LABEL[s.paymentType]}</span> },
    { key: "stepOrder", label: "Orden", align: "center", render: (s) => <span className="font-mono text-xs">{s.stepOrder}</span> },
    { key: "label", label: "Paso", render: (s) => <span className="text-text-primary">{s.label}</span> },
    {
      key: "role",
      label: "Quién firma",
      render: (s) => (
        <span className={`rounded-pill border px-2.5 py-0.5 text-[10px] font-bold ${SEMANTIC_COLOR_MAP.info.border100} ${SEMANTIC_COLOR_MAP.info.bg50} ${SEMANTIC_COLOR_MAP.info.text700}`}>
          {s.userName ?? (s.role ? roleLabel(s.role) : "—")}
        </span>
      ),
    },
    {
      key: "isRequired",
      label: "Obligatorio",
      align: "center",
      render: (s) => {
        const c = s.isRequired ? SEMANTIC_COLOR_MAP.warning : SEMANTIC_COLOR_MAP.neutral;
        return (
          <span className={`rounded-pill border px-2.5 py-0.5 text-[10px] font-bold ${c.border100} ${c.bg50} ${c.text700}`}>
            {s.isRequired ? "Obligatorio" : "Opcional"}
          </span>
        );
      },
    },
    {
      key: "trigger",
      label: "Cuándo se firma",
      render: (s) => <span className="text-xs text-text-secondary">{autoSignHint(s.paymentType, s.role, s.isRequired)}</span>,
    },
    {
      key: "actions",
      label: "Acciones",
      align: "center",
      render: (s) => (
        <div className="flex items-center justify-center gap-1.5">
          <IconActionButton label={`Editar ${s.label}`} tooltip="Editar paso" onClick={() => openEdit(s)} tone="indigo" icon={<FileSignature className="h-3.5 w-3.5" />} />
          <IconActionButton label={`Eliminar ${s.label}`} tooltip="Eliminar paso" onClick={() => setDeleteTarget(s)} tone="rose" icon={<Trash2 className="h-3.5 w-3.5" />} />
        </div>
      ),
    },
  ], [openEdit]);

  return (
    <Card hoverable={false} className={`space-y-4 border-l-4 ${SEMANTIC_COLOR_MAP.info.borderL400}`}>
      <SectionHeader
        icon={<FileSignature className="h-5 w-5" />}
        title="Cadenas de firma de la orden de pago"
        description="Roles que deben firmar cada orden de pago, en orden. Un tipo de pago sin pasos configurados no exige firmas."
        color="indigo"
        actions={
          <Button onClick={openCreate} variant="primary" colorScheme="indigo" size="md" icon={<Plus className="h-4 w-4" />}>
            Nuevo paso
          </Button>
        }
      />

      <InfoBanner title="¿Cómo funcionan las firmas?" color="indigo">
        <ul className="list-disc space-y-1 pl-4">
          <li><strong>Qué se firma:</strong> la orden de pago de cada obra. La de anticipo nace al seleccionar el proveedor; la de finiquito, al solicitar el pago del finiquito.</li>
          <li><strong>En qué orden:</strong> estricto según el número de paso. Nadie puede firmar antes de que firme el paso anterior.</li>
          <li><strong>Cuándo:</strong> cada paso se firma solo al ejecutar el trámite del rol en su pantalla habitual (columna «Cuándo se firma»). Si el rol no coincide con ningún trámite, el usuario abre la orden y pulsa «Firmar».</li>
          <li><strong>Dónde:</strong> en la orden de pago, accesible desde Procura (Envío a Finanzas) y Finanzas (Anticipos y Finiquitos), con la línea de firmas y quién firmó cada paso.</li>
          <li><strong>Qué bloquea de verdad:</strong> si un paso es <em>obligatorio</em> y le falta la firma, <strong>solo</strong> se rechazan la aprobación de Presidencia y el pago de Finanzas (nadie los salta, ni ADMIN/SUPERADMIN). Seleccionar proveedor y solicitar el finiquito firman su paso si aplica, pero nunca esperan por él, para no trabar el circuito.</li>
          <li><strong>Opcional vs. obligatorio:</strong> un paso opcional se puede firmar igual, pero nunca bloquea nada — útil para dejar constancia sin frenar el proceso. Colócalo al final de la cadena: uno opcional sin firmar puede tapar el turno de los pasos siguientes.</li>
          <li>Un tipo de pago sin pasos configurados no exige firmas.</li>
        </ul>
      </InfoBanner>

      <Table columns={columns} data={steps} rowKey={(s) => String(s.id)} isLoading={isLoading} emptyMessage="No hay cadenas de firma configuradas." pageSize={10} onRefresh={load} />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId === null ? "Nuevo paso de firma" : "Editar paso de firma"}
        icon={<FileSignature className="h-5 w-5" />}
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
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Tipo de pago</label>
            <SegmentedControl
              options={[{ value: "ADVANCE", label: "Anticipo" }, { value: "FINAL", label: "Finiquito" }]}
              value={form.paymentType}
              onChange={(paymentType) => setForm((prev) => ({ ...prev, paymentType }))}
            />
          </div>
          <div>
            <label htmlFor="signature-step-order" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Orden del paso</label>
            <NumericInput
              id="signature-step-order"
              value={form.stepOrder}
              onChange={(v) => setForm((prev) => ({ ...prev, stepOrder: v === "" ? "" : Math.max(1, Math.round(v)) }))}
              placeholder="1"
              step="1"
            />
          </div>
          <div>
            <label htmlFor="signature-step-role" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Rol que firma</label>
            <Select
              id="signature-step-role"
              ariaLabel="Rol que firma"
              value={form.role}
              onChange={(role) => setForm((prev) => ({ ...prev, role }))}
              options={roleOptions}
              required
            />
            {form.role && (
              <p className="mt-1.5 text-[11px] text-text-tertiary">
                Se firma en: <span className="font-semibold text-text-secondary">{autoSignHint(form.paymentType, form.role, form.isRequired)}</span>
              </p>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-text-secondary">
            <input
              id="signature-step-required"
              type="checkbox"
              checked={form.isRequired}
              onChange={(e) => setForm((prev) => ({ ...prev, isRequired: e.target.checked }))}
            />
            Obligatorio (bloquea la acción correspondiente si falta esta firma)
          </label>
          <TextField
            id="signature-step-label"
            label="Etiqueta del paso"
            value={form.label}
            onChange={(label) => setForm((prev) => ({ ...prev, label }))}
            maxLength={150}
            placeholder="Ej: Aprobación de Presidencia"
            required
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Eliminar paso de firma"
        message={`¿Eliminar «${deleteTarget?.label ?? ""}»? Las firmas ya registradas se conservan como historial.`}
        variant="danger"
        confirmLabel="Eliminar"
        isLoading={isDeleting}
      />
    </Card>
  );
}
