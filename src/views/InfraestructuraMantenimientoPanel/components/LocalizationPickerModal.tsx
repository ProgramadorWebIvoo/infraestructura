/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal to pick a registered location (F2-R D10): searchable list showing
 * title, city, type and the resident who will handle the work.
 */

import { MapPin } from "lucide-react";
import Modal from "@/components/UI/Modal";
import SearchableSelectList from "@/components/UI/SearchableSelectList";
import { LOCALIZATION_TYPE_LABELS } from "@/constants/localizations";
import type { Localization } from "@/types";

interface LocalizationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  localizations: Localization[];
  selectedId: number | null;
  onSelect: (localization: Localization) => void;
}

export default function LocalizationPickerModal({ isOpen, onClose, localizations, selectedId, onSelect }: LocalizationPickerModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ubicaciones registradas" icon={<MapPin className="h-5 w-5" />} iconColor="sky" maxWidth="max-w-xl">
      <SearchableSelectList
        items={localizations}
        rowKey={(l) => String(l.id)}
        getSearchText={(l) => `${l.title} ${l.city} ${l.region ?? ""} ${LOCALIZATION_TYPE_LABELS[l.type]} ${l.residentName ?? ""}`}
        selectedKey={selectedId === null ? null : String(selectedId)}
        onSelect={(l) => {
          onSelect(l);
          onClose();
        }}
        searchPlaceholder="Buscar por título, ciudad, tipo o residente..."
        searchAriaLabel="Buscar ubicación registrada"
        layoutIdNamespace="localization-picker"
        emptyMessage="Aún no hay ubicaciones registradas. Usa una ubicación personalizada."
        emptySearchMessage="Ninguna ubicación coincide con la búsqueda."
        noun="ubicación"
        nounPlural="ubicaciones"
        maxHeight="20rem"
        renderItem={(l) => (
          <div>
            <p className="text-xs font-bold text-slate-800">
              {l.title} <span className="font-medium text-slate-500">· {l.city}</span>
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              {LOCALIZATION_TYPE_LABELS[l.type]} · Residente: {l.residentName ?? "—"}
            </p>
          </div>
        )}
      />
    </Modal>
  );
}
