/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Edición de características (condición, garantía, marca, modelo,
 * especificaciones, observaciones) de un material ya agregado — se completan
 * después de agregarlo (vía checklist o modo personalizado), no antes, para
 * no forzar una fricción secuencial al tildar varios materiales a la vez.
 *
 * Condición es el único campo requerido (marca/modelo/specs/observaciones
 * son opcionales y así se indica en su label). Garantía es estructurada
 * (número + unidad) en vez de texto libre, y es válido no tener garantía
 * (ambos campos vacíos) — no se fuerza a completarla.
 */

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import Button from "../../../components/UI/Button";
import TextField from "../../../components/UI/TextField";
import SegmentedControl from "../../../components/UI/SegmentedControl";
import NumericInput from "../../../components/UI/NumericInput";
import FieldError from "../../../components/UI/FieldError";
import { RequiredMark, HelpHint } from "../../../components/UI/HintSignals";
import type { MaterialItem } from "../../../types";

interface MaterialCharacteristicsEditModalProps {
  isOpen: boolean;
  material: Omit<MaterialItem, "id">;
  onClose: () => void;
  onSave: (characteristics: Partial<MaterialItem>) => void;
}

type Condition = "NUEVO" | "USADO" | "AMBAS";
type WarrantyUnit = "DIAS" | "MESES" | "ANOS";

const WARRANTY_UNIT_LABEL: Record<WarrantyUnit, string> = {
  DIAS: "Días",
  MESES: "Meses",
  ANOS: "Años",
};

export default function MaterialCharacteristicsEditModal({
  isOpen,
  material,
  onClose,
  onSave,
}: MaterialCharacteristicsEditModalProps) {
  const [condition, setCondition] = useState<Condition | undefined>(material.condition);
  const [conditionTouched, setConditionTouched] = useState(false);
  const [warrantyValue, setWarrantyValue] = useState<number | "">(material.warrantyValue ?? "");
  const [warrantyUnit, setWarrantyUnit] = useState<WarrantyUnit>(material.warrantyUnit ?? "MESES");
  const [brand, setBrand] = useState(material.brand ?? "");
  const [model, setModel] = useState(material.model ?? "");
  const [specifications, setSpecifications] = useState(material.specifications ?? "");
  const [observations, setObservations] = useState(material.observations ?? "");

  const conditionError = conditionTouched && !condition ? "Selecciona la condición del material." : undefined;

  const handleSave = () => {
    if (!condition) {
      setConditionTouched(true);
      return;
    }
    const hasWarranty = warrantyValue !== "" && warrantyValue > 0;
    onSave({
      condition,
      warrantyValue: hasWarranty ? warrantyValue : undefined,
      warrantyUnit: hasWarranty ? warrantyUnit : undefined,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      specifications: specifications.trim() || undefined,
      observations: observations.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Detalles del Material"
      infoLine={material.name}
      icon={<Pencil className="h-5 w-5" />}
      iconColor="emerald"
      maxWidth="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" colorScheme="emerald" onClick={handleSave} icon={<Check className="h-3.5 w-3.5" />}>
            Guardar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Condición <RequiredMark filled={!!condition} />
          </span>
          <SegmentedControl
            variant="card"
            ariaLabel="Condición"
            accent={conditionError ? "danger" : "success"}
            value={condition ?? ""}
            onChange={(v) => {
              setCondition(v as Condition);
              setConditionTouched(false);
            }}
            options={[
              { value: "NUEVO", label: "Nuevo" },
              { value: "USADO", label: "Usado" },
              { value: "AMBAS", label: "Ambas", description: "Nuevo y usado" },
            ]}
          />
          <FieldError message={conditionError} />
        </div>

        <div>
          <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Garantía
            <HelpHint content="Opcional — dejar vacío si el material no tiene garantía." />
          </span>
          <div className="grid grid-cols-2 gap-3">
            <NumericInput
              id="mat-warranty-value"
              value={warrantyValue}
              onChange={setWarrantyValue}
              integer
              placeholder="Ej. 6"
              accent="success"
            />
            <SegmentedControl
              variant="pill"
              accent="success"
              ariaLabel="Unidad de garantía"
              value={warrantyUnit}
              onChange={setWarrantyUnit}
              options={(["DIAS", "MESES", "ANOS"] as WarrantyUnit[]).map((u) => ({
                value: u,
                label: WARRANTY_UNIT_LABEL[u],
              }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            id="mat-brand"
            label="Marca (Opcional)"
            value={brand}
            onChange={setBrand}
            accent="success"
          />
          <TextField
            id="mat-model"
            label="Modelo (Opcional)"
            value={model}
            onChange={setModel}
            accent="success"
          />
        </div>

        <TextField
          id="mat-specs"
          label="Especificaciones (Opcional)"
          as="textarea"
          rows={2}
          maxLength={500}
          showCounter
          value={specifications}
          onChange={setSpecifications}
          accent="success"
        />

        <TextField
          id="mat-observations"
          label="Observaciones (Opcional)"
          as="textarea"
          rows={2}
          maxLength={500}
          showCounter
          value={observations}
          onChange={setObservations}
          accent="success"
        />
      </div>
    </Modal>
  );
}
