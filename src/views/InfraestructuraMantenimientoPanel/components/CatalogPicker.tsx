/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Trigger + modal para elegir materiales del catálogo IVOO en lote —
 * extraído de MaterialAdderSection.tsx (división por SRP).
 */

import { useState } from "react";
import { ListChecks } from "lucide-react";
import Button from "../../../components/UI/Button";
import MaterialChecklistModal from "./MaterialChecklistModal";

interface CatalogPickerProps {
  materialsCatalog: { name: string; unit: string; estimatedUnitPrice: number }[];
  onConfirm: (items: { catalogIndex: number; quantity: number }[]) => void;
}

export default function CatalogPicker({ materialsCatalog, onConfirm }: CatalogPickerProps) {
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);

  return (
    <div className="flex items-center justify-between gap-4 bg-gradient-to-br from-emerald-50/30 to-white p-5 rounded-xl border border-emerald-100/60">
      <p className="text-xs text-slate-500 font-medium">
        Tildá los materiales del catálogo que necesitás y su cantidad, todos de una vez.
      </p>
      <Button
        id="btn-open-checklist"
        type="button"
        variant="secondary"
        onClick={() => setIsChecklistOpen(true)}
        disabled={materialsCatalog.length === 0}
        icon={<ListChecks className="h-4 w-4" />}
        className="shrink-0"
      >
        Elegir materiales del catálogo...
      </Button>
      <MaterialChecklistModal
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
        onConfirm={onConfirm}
        materialsCatalog={materialsCatalog}
      />
    </div>
  );
}
