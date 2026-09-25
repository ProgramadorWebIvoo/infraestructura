/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Lugar / Ubicación" of the work request (F2-R D10): two tabs — "Registradas"
 * (modal with the catalog; the resident is inherited from the location) and
 * "Personalizada" (free text; Auditoría picks the resident when reviewing).
 */

import { useState } from "react";
import { HardHat, MapPin } from "lucide-react";
import Button from "@/components/UI/Button";
import SegmentedControl from "@/components/UI/SegmentedControl";
import TextField from "@/components/UI/TextField";
import type { LocalizationChoice } from "@/hooks/useRequestForm";
import { localizationLabel } from "@/constants/localizations";
import type { LocationMode } from "@/utils/projectLocation";
import type { Localization } from "@/types";
import LocalizationPickerModal from "./LocalizationPickerModal";

interface LocationPickerProps {
  mode: LocationMode;
  onModeChange: (mode: LocationMode) => void;
  location: string;
  onLocationChange: (value: string) => void;
  selected: LocalizationChoice | null;
  onSelect: (choice: LocalizationChoice | null) => void;
  localizations: Localization[];
  error?: string;
  fieldId: string;
}

export default function LocationPicker({ mode, onModeChange, location, onLocationChange, selected, onSelect, localizations, error, fieldId }: LocationPickerProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        Ubicación / Tienda / CD <span className="text-rose-500">*</span>
      </label>
      <SegmentedControl
        ariaLabel="Tipo de ubicación"
        value={mode}
        onChange={onModeChange}
        options={[
          { value: "registered", label: "Registradas" },
          { value: "custom", label: "Personalizada" },
        ]}
      />

      {mode === "registered" ? (
        <div>
          {selected ? (
            <div id={fieldId} tabIndex={-1} className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3.5">
              <MapPin className="h-4 w-4 shrink-0 text-sky-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-800">{selected.label}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                  <HardHat className="h-3 w-3" /> Residente: {selected.residentName ?? "—"}
                </p>
              </div>
              <Button size="sm" onClick={() => setIsPickerOpen(true)}>Cambiar</Button>
            </div>
          ) : (
            <Button id={fieldId} onClick={() => setIsPickerOpen(true)} icon={<MapPin className="h-4 w-4" />}>
              Elegir ubicación registrada
            </Button>
          )}
          {error && <p role="alert" className="mt-1.5 text-[11px] font-semibold text-rose-600">{error}</p>}
          <LocalizationPickerModal
            isOpen={isPickerOpen}
            onClose={() => setIsPickerOpen(false)}
            localizations={localizations}
            selectedId={selected?.id ?? null}
            onSelect={(l) => onSelect({ id: l.id, label: localizationLabel(l), residentName: l.residentName })}
          />
        </div>
      ) : (
        <TextField
          id={fieldId}
          label="Ubicación personalizada"
          placeholder="Ej. Galpón alquilado en Maracay"
          value={location}
          onChange={onLocationChange}
          error={error}
          icon={<MapPin className="h-4 w-4" />}
        />
      )}
    </div>
  );
}
