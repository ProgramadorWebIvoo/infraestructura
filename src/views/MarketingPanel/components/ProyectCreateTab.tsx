/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tab "Crear" de Marketing — formulario de alta de una nueva propuesta
 * (pieza publicitaria). Puramente presentacional: valida los campos
 * requeridos client-side (UX inmediata, igual criterio que
 * RequestFormSection en Infraestructura) y entrega el payload ya con el
 * shape de StoreMarketingProjectRequest (backend) + los archivos elegidos
 * al callback `onSubmit` del consumidor — el POST real, el manejo de
 * errores del servidor y la navegación post-creación quedan a su cargo.
 */

import { useState, type ReactNode } from "react";
import { FilePlus2, Flag, Image as ImageIcon, MapPin, MoreHorizontal, Printer, Send } from "lucide-react";
import Card from "@/components/UI/Card";
import SectionHeader from "@/components/UI/SectionHeader";
import TextField from "@/components/UI/TextField";
import NumericInput from "@/components/UI/NumericInput";
import SegmentedControl, { type SegmentedOption } from "@/components/UI/SegmentedControl";
import FileDropZone from "@/components/UI/FileDropZone";
import Button from "@/components/UI/Button";
import type { MarketingProjectFormInput, MarketingProjectPriority, MarketingProjectType } from "../types";

interface ProyectCreateTabProps {
  onSubmit: (data: MarketingProjectFormInput, files: File[]) => void | Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

interface FormErrors {
  title?: string;
  location?: string;
  description?: string;
}

const EMPTY_FORM: MarketingProjectFormInput = {
  title: "",
  type: "VINIL",
  description: "",
  location: "",
  startDate: "",
  endDate: "",
  quantity: "",
  estimatedCost: "",
  priority: "MEDIA",
};

const TYPE_OPTIONS: SegmentedOption<MarketingProjectType>[] = [
  { value: "IMPRESION", label: "Impresión", description: "Folletos, volantes, material impreso", icon: <Printer className="h-4 w-4" /> },
  { value: "VINIL", label: "Vinil", description: "Vinil decorativo o de fachada", icon: <ImageIcon className="h-4 w-4" /> },
  { value: "PENDON", label: "Pendón", description: "Pendones y banners para eventos", icon: <Flag className="h-4 w-4" /> },
  { value: "OTRO", label: "Otro", description: "Cualquier otra pieza publicitaria", icon: <MoreHorizontal className="h-4 w-4" /> },
];

const PRIORITY_OPTIONS: SegmentedOption<MarketingProjectPriority>[] = [
  { value: "BAJA", label: "Baja", accent: "neutral" },
  { value: "MEDIA", label: "Media", accent: "warning" },
  { value: "ALTA", label: "Alta", accent: "danger" },
];

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
      {children}
    </label>
  );
}

function validate(data: MarketingProjectFormInput): FormErrors {
  const errors: FormErrors = {};
  if (!data.title.trim()) errors.title = "El título es obligatorio.";
  if (!data.location.trim()) errors.location = "La sede/ubicación es obligatoria.";
  if (!data.description.trim()) errors.description = "La descripción es obligatoria.";
  return errors;
}

export default function ProyectCreateTab({ onSubmit, isSubmitting = false, onCancel }: ProyectCreateTabProps) {
  const [form, setForm] = useState<MarketingProjectFormInput>(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  const setField = <K extends keyof MarketingProjectFormInput>(key: K, value: MarketingProjectFormInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    await onSubmit(form, files);
    setForm(EMPTY_FORM);
    setFiles([]);
    setErrors({});
  };

  const handleCancel = () => {
    setForm(EMPTY_FORM);
    setFiles([]);
    setErrors({});
    onCancel?.();
  };

  return (
    <Card className="!p-0 overflow-hidden" fillHeight>
      <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 p-6 pb-0">
          <SectionHeader
            icon={<FilePlus2 className="h-5 w-5" />}
            title="Nueva Propuesta de Marketing"
            description="Registra una pieza publicitaria para enviarla a revisión y aprobación."
            color="amber"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-3">
              <TextField
                id="mkt-title"
                label="Título de la Propuesta"
                placeholder="Ej. Vinil decorativo fachada Sede Chacao"
                value={form.title}
                onChange={(v) => setField("title", v)}
                error={errors.title}
                required
              />
            </div>
            <div className="md:col-span-2">
              <TextField
                id="mkt-location"
                label="Sede / Ubicación"
                placeholder="Ej. Sede Caracas"
                value={form.location}
                onChange={(v) => setField("location", v)}
                error={errors.location}
                icon={<MapPin className="h-4 w-4" />}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <FieldLabel htmlFor="mkt-type">Tipo de Pieza</FieldLabel>
              <SegmentedControl
                id="mkt-type"
                variant="card"
                ariaLabel="Tipo de pieza publicitaria"
                accent="brand"
                value={form.type}
                onChange={(v) => setField("type", v)}
                options={TYPE_OPTIONS}
              />
            </div>
            <div>
              <FieldLabel htmlFor="mkt-priority">Prioridad</FieldLabel>
              <SegmentedControl
                id="mkt-priority"
                variant="pill"
                ariaLabel="Prioridad de la propuesta"
                value={form.priority}
                onChange={(v) => setField("priority", v)}
                options={PRIORITY_OPTIONS}
              />
            </div>
          </div>

          <TextField
            id="mkt-description"
            label="Detalles del Proyecto"
            as="textarea"
            placeholder="Describe el alcance, materiales, medidas, acabados y cualquier especificación relevante..."
            value={form.description}
            onChange={(v) => setField("description", v)}
            error={errors.description}
            rows={4}
            maxLength={2000}
            showCounter
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <FieldLabel htmlFor="mkt-start-date">Fecha de Inicio</FieldLabel>
              <input
                id="mkt-start-date"
                type="date"
                value={form.startDate}
                onChange={(e) => setField("startDate", e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-800 outline-hidden focus:ring-2 focus:ring-brand-100 focus:border-brand-400"
              />
            </div>
            <div>
              <FieldLabel htmlFor="mkt-end-date">Fecha de Finalización</FieldLabel>
              <input
                id="mkt-end-date"
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(e) => setField("endDate", e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-800 outline-hidden focus:ring-2 focus:ring-brand-100 focus:border-brand-400"
              />
            </div>
            <div>
              <FieldLabel htmlFor="mkt-quantity">Cantidad</FieldLabel>
              <NumericInput
                id="mkt-quantity"
                value={form.quantity}
                onChange={(v) => setField("quantity", v)}
                integer
                min={1}
                placeholder="Ej. 3"
              />
            </div>
            <div>
              <FieldLabel htmlFor="mkt-cost">Costo Estimado ($)</FieldLabel>
              <NumericInput
                id="mkt-cost"
                value={form.estimatedCost}
                onChange={(v) => setField("estimatedCost", v)}
                placeholder="0.00"
              />
            </div>
          </div>

          <FileDropZone
            id="mkt-attachments"
            label="Adjuntar referencias / mockups"
            accept=".png,.jpg,.jpeg,.webp,.pdf"
            extensionsLabel="PNG, JPG, WEBP o PDF — máximo 25 MB por archivo"
            color="sky"
            icon={<ImageIcon className="h-5 w-5" />}
            files={files}
            onFilesChange={setFiles}
            countLabel="adjunto(s)"
          />
        </div>

        <div className="shrink-0 flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/30 px-6 py-4">
          <Button type="button" variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" colorScheme="amber" isLoading={isSubmitting} icon={<Send className="h-4 w-4" />}>
            Crear Propuesta
          </Button>
        </div>
      </form>
    </Card>
  );
}
