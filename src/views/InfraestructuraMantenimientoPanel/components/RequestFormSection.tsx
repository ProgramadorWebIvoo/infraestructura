/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 1 de Infraestructura/Mantenimiento: creación de la petición de obra
 * — extraída de InfraestructuraMantenimientoPanel.
 */

import { useEffect } from "react";
import { AlertCircle, Building2, FilePlus2, MapPin, Send, Wrench } from "lucide-react";
import Button from "../../../components/UI/Button";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";

export interface RequestFormErrors {
  title?: string;
  location?: string;
  description?: string;
}

interface RequestFormSectionProps {
  title: string;
  onTitleChange: (v: string) => void;
  location: string;
  onLocationChange: (v: string) => void;
  type: "INFRAESTRUCTURA" | "MANTENIMIENTO";
  onTypeChange: (v: "INFRAESTRUCTURA" | "MANTENIMIENTO") => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  errors?: RequestFormErrors;
  isSubmitting?: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

const FIELD_IDS: Record<keyof RequestFormErrors, string> = {
  title: "req-title",
  location: "req-location",
  description: "req-description",
};

const FIELD_KEYS = Object.keys(FIELD_IDS) as (keyof RequestFormErrors)[];

const inputClass = (hasError: boolean) =>
  `w-full text-xs px-3.5 py-3 rounded-xl border bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-1 transition-colors ${
    hasError
      ? "border-rose-300 bg-rose-50/40 focus:ring-rose-400"
      : "border-slate-200 focus:ring-sky-500"
  }`;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-rose-600">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

export default function RequestFormSection({
  title,
  onTitleChange,
  location,
  onLocationChange,
  type,
  onTypeChange,
  description,
  onDescriptionChange,
  errors = {},
  isSubmitting = false,
  onSubmit,
}: RequestFormSectionProps) {
  // Foco en el primer campo inválido para guiar la corrección
  useEffect(() => {
    const first = FIELD_KEYS.find((k) => errors[k]);
    if (first) document.getElementById(FIELD_IDS[first])?.focus();
  }, [errors]);

  return (
    <Card className="border-l-4 border-l-sky-400 h-full flex flex-col">
      <SectionHeader
        icon={<FilePlus2 className="h-5 w-5" />}
        title="Crear Nueva Petición de Obra / Trabajo"
        description="Formule su requerimiento y defina los materiales necesarios para iniciar el flujo de aprobación."
        color="sky"
      />

      <form onSubmit={onSubmit} className="flex flex-1 flex-col space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="req-title" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Título de la Obra
            </label>
            <input
              id="req-title"
              type="text"
              placeholder="Ej. Remodelación Oficinas Administrativas Piso 2"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              aria-invalid={!!errors.title}
              className={inputClass(!!errors.title)}
            />
            <FieldError message={errors.title} />
          </div>
          <div>
            <label htmlFor="req-location" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Ubicación / Tienda / CD
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                id="req-location"
                type="text"
                placeholder="Ej. Tienda IVOO Chacao / CD Central"
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                aria-invalid={!!errors.location}
                className={`${inputClass(!!errors.location)} pl-10`}
              />
            </div>
            <FieldError message={errors.location} />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Tipo de Requerimiento
          </label>
          <div role="radiogroup" aria-label="Tipo de requerimiento" className="grid grid-cols-2 gap-2">
            <button
              id="type-infra"
              type="button"
              role="radio"
              aria-checked={type === "INFRAESTRUCTURA"}
              onClick={() => onTypeChange("INFRAESTRUCTURA")}
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-left text-xs font-bold transition-all duration-200 cursor-pointer ${
                type === "INFRAESTRUCTURA"
                  ? "border-sky-500 bg-gradient-to-br from-sky-50 to-sky-100/50 text-sky-700 font-black shadow-sm shadow-sky-200/50 ring-1 ring-sky-200"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-semibold"
              }`}
            >
              <Building2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <span className="block">Obras / Infraestructura</span>
                <span className="block text-[9px] font-medium opacity-80 mt-0.5">Nueva obra o construcción</span>
              </span>
            </button>
            <button
              id="type-mant"
              type="button"
              role="radio"
              aria-checked={type === "MANTENIMIENTO"}
              onClick={() => onTypeChange("MANTENIMIENTO")}
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-left text-xs font-bold transition-all duration-200 cursor-pointer ${
                type === "MANTENIMIENTO"
                  ? "border-slate-800 bg-gradient-to-br from-slate-800 to-slate-900 text-white font-black shadow-md shadow-slate-900/20 ring-1 ring-slate-300"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-semibold"
              }`}
            >
              <Wrench className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <span className="block">Mantenimiento</span>
                <span className="block text-[9px] font-medium opacity-80 mt-0.5">Reparación o acondicionamiento</span>
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-col flex-1">
            <label htmlFor="req-description" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Descripción del Trabajo
            </label>
            <textarea
              id="req-description"
              placeholder="Detallar detalladamente el alcance físico, áreas a intervenir, especificaciones de la instalación..."
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
              maxLength={2000}
              aria-invalid={!!errors.description}
              className={`w-full flex-1 min-h-[72px] text-xs px-3.5 py-2.5 rounded-xl border bg-white font-medium text-slate-700 focus:outline-hidden focus:ring-1 resize-none transition-colors ${
                errors.description
                  ? "border-rose-300 bg-rose-50/40 focus:ring-rose-400"
                  : "border-slate-200 focus:ring-sky-500"
              }`}
            />
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="text-[9px] text-slate-400 font-mono">{description.length}/2000</span>
              <FieldError message={errors.description} />
            </div>
          </div>

        <div className="flex justify-end pt-2 mt-auto">
          <Button
            id="btn-submit-project"
            type="submit"
            variant="primary"
            colorScheme="sky"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            icon={<Send className="h-4 w-4" />}
          >
            {isSubmitting ? "Enviando..." : "Enviar Petición a Cierre de Obra"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
