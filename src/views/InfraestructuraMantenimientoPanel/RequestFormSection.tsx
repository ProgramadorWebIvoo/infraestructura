/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 1 de Infraestructura/Mantenimiento: creación de la petición de obra
 * — extraída de InfraestructuraMantenimientoPanel.
 */

import { AlertCircle, FilePlus2, MapPin, Send } from "lucide-react";
import Button from "../../components/UI/Button";
import Card from "../../components/UI/Card";
import SectionHeader from "../../components/UI/SectionHeader";
import AlertBanner from "../../components/UI/AlertBanner";

interface RequestFormSectionProps {
  title: string;
  onTitleChange: (v: string) => void;
  location: string;
  onLocationChange: (v: string) => void;
  type: "INFRAESTRUCTURA" | "MANTENIMIENTO";
  onTypeChange: (v: "INFRAESTRUCTURA" | "MANTENIMIENTO") => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  errorMsg: string;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
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
  errorMsg,
  isSubmitting,
  onSubmit,
}: RequestFormSectionProps) {
  return (
    <Card className="border-l-4 border-l-sky-400">
      <SectionHeader
        icon={<FilePlus2 className="h-5 w-5" />}
        title="Crear Nueva Petición de Obra / Trabajo"
        description="Formule su requerimiento y defina los materiales necesarios para iniciar el flujo de aprobación."
      />

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Título de la Obra</label>
            <input
              id="req-title"
              type="text"
              placeholder="Ej. Remodelación Oficinas Administrativas Piso 2"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="w-full text-xs px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 bg-white font-semibold text-slate-800"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Ubicación / Tienda / CD</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                id="req-location"
                type="text"
                placeholder="Ej. Tienda IVOO Chacao / CD Central"
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                className="pl-10 w-full text-xs px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 bg-white font-semibold text-slate-800"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Requerimiento</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="type-infra"
                type="button"
                onClick={() => onTypeChange("INFRAESTRUCTURA")}
                className={`p-3 rounded-xl border text-xs font-bold text-center transition-all duration-200 cursor-pointer ${
                  type === "INFRAESTRUCTURA"
                    ? "border-sky-500 bg-gradient-to-br from-sky-50 to-sky-100/50 text-sky-700 font-black shadow-sm shadow-sky-200/50"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-semibold"
                }`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span>Obras /</span>
                  <span>Infraestructura</span>
                </div>
              </button>
              <button
                id="type-mant"
                type="button"
                onClick={() => onTypeChange("MANTENIMIENTO")}
                className={`p-3 rounded-xl border text-xs font-bold text-center transition-all duration-200 cursor-pointer ${
                  type === "MANTENIMIENTO"
                    ? "border-slate-800 bg-gradient-to-br from-slate-800 to-slate-900 text-white font-black shadow-md shadow-slate-900/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-semibold"
                }`}
              >
                Mantenimiento
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Descripción del Trabajo</label>
            <textarea
              id="req-description"
              placeholder="Detallar detalladamente el alcance físico, áreas a intervenir, especificaciones de la instalación..."
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={2}
              maxLength={2000}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 bg-white font-medium text-slate-700"
            />
            <span className="text-[9px] text-slate-400 font-mono mt-1 block text-right">{description.length}/2000</span>
          </div>
        </div>

        {errorMsg && <AlertBanner type="error" message={errorMsg} icon={<AlertCircle className="h-4 w-4 shrink-0" />} />}

        <div className="flex justify-end pt-2">
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
