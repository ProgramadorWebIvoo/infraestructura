/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Paso 1 del wizard de alta de petición: datos de la obra. Sin Card/
 * SectionHeader/form propios — es contenido puro de paso, montado dentro
 * de RequestWizardCard, que aporta el envoltorio y la barra de navegación.
 */

import { useEffect } from "react";
import { Building2, MapPin, Wrench } from "lucide-react";
import TextField from "../../../components/UI/TextField";
import SegmentedControl from "../../../components/UI/SegmentedControl";

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
  /** Modo edición (reenvío tras rechazo): el tipo no es editable — el backend de resubmit no lo acepta. */
  typeReadOnly?: boolean;
}

const TYPE_LABEL: Record<"INFRAESTRUCTURA" | "MANTENIMIENTO", string> = {
  INFRAESTRUCTURA: "Obras / Infraestructura",
  MANTENIMIENTO: "Mantenimiento",
};

const FIELD_IDS: Record<keyof RequestFormErrors, string> = {
  title: "req-title",
  location: "req-location",
  description: "req-description",
};

const FIELD_KEYS = Object.keys(FIELD_IDS) as (keyof RequestFormErrors)[];

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
  typeReadOnly = false,
}: RequestFormSectionProps) {
  // Foco en el primer campo inválido para guiar la corrección
  useEffect(() => {
    const first = FIELD_KEYS.find((k) => errors[k]);
    if (first) document.getElementById(FIELD_IDS[first])?.focus();
  }, [errors]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3">
          <TextField
            id={FIELD_IDS.title}
            label="Título de la Obra"
            placeholder="Ej. Remodelación Oficinas Administrativas Piso 2"
            value={title}
            onChange={onTitleChange}
            error={errors.title}
            required
          />
        </div>
        <div className="md:col-span-2">
          <TextField
            id={FIELD_IDS.location}
            label="Ubicación / Tienda / CD"
            placeholder="Ej. Tienda IVOO Chacao / CD Central"
            value={location}
            onChange={onLocationChange}
            error={errors.location}
            icon={<MapPin className="h-4 w-4" />}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Tipo de Requerimiento
        </label>
        {typeReadOnly ? (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
            {type === "INFRAESTRUCTURA" ? <Building2 className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
            {TYPE_LABEL[type]}
            <span className="ml-auto text-[10px] font-medium text-slate-400 normal-case">No editable al reenviar</span>
          </div>
        ) : (
          <SegmentedControl
            variant="card"
            ariaLabel="Tipo de requerimiento"
            value={type}
            onChange={onTypeChange}
            options={[
              {
                value: "INFRAESTRUCTURA",
                label: "Obras / Infraestructura",
                description: "Nueva obra o construcción",
                icon: <Building2 className="h-4 w-4" />,
                accent: "info",
              },
              {
                value: "MANTENIMIENTO",
                label: "Mantenimiento",
                description: "Reparación o acondicionamiento",
                icon: <Wrench className="h-4 w-4" />,
                accent: "neutral",
              },
            ]}
          />
        )}
      </div>

      <TextField
        id={FIELD_IDS.description}
        label="Descripción del Trabajo"
        as="textarea"
        placeholder="Detallar detalladamente el alcance físico, áreas a intervenir, especificaciones de la instalación..."
        value={description}
        onChange={onDescriptionChange}
        rows={4}
        maxLength={2000}
        showCounter
        error={errors.description}
        required
      />
    </div>
  );
}
