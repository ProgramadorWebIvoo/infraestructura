/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Un FileDropZone por tipo de documento del proveedor, marcando los
 * obligatorios. Compartido por el registro público y el alta interna.
 */

import { FileText } from "lucide-react";
import FileDropZone from "@/components/UI/FileDropZone";
import { RequiredMark } from "@/components/UI/HintSignals";
import {
  CONTRACTOR_DOCUMENT_ACCEPT,
  CONTRACTOR_DOCUMENT_EXTENSIONS_LABEL,
  CONTRACTOR_DOCUMENT_MAX_BYTES,
  type ContractorDocumentType,
} from "@/services/contractorDocuments";

interface ContractorDocumentDropZonesProps {
  types: ContractorDocumentType[];
  files: Record<number, File | undefined>;
  onChange: (typeId: number, file: File | undefined) => void;
  idPrefix: string;
  /** Columnas en pantallas >= sm (1 = lista vertical). */
  columns?: 1 | 2;
  onFileRejected?: (fileName: string, reason: string) => void;
}

export default function ContractorDocumentDropZones({ types, files, onChange, idPrefix, columns = 1, onFileRejected }: ContractorDocumentDropZonesProps) {
  return (
    <div className={columns === 2 ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "space-y-3"}>
      {types.map((type) => {
        const file = files[type.id];
        return (
          <FileDropZone
            key={type.id}
            id={`${idPrefix}-doc-${type.id}`}
            files={file ? [file] : []}
            onFilesChange={(next) => onChange(type.id, next[next.length - 1])}
            label={type.label}
            accept={CONTRACTOR_DOCUMENT_ACCEPT}
            extensionsLabel={CONTRACTOR_DOCUMENT_EXTENSIONS_LABEL}
            maxSizeBytes={CONTRACTOR_DOCUMENT_MAX_BYTES}
            maxFileCount={1}
            color="sky"
            icon={<FileText className="h-5 w-5" />}
            fileIcon={<FileText className="h-3.5 w-3.5" />}
            required={false}
            requiredIndicator={type.isRequired ? <RequiredMark filled={!!file} /> : <span className="text-[10px] font-medium normal-case text-slate-400">(opcional)</span>}
            compact
            fullWidth
            onFileRejected={onFileRejected}
          />
        );
      })}
    </div>
  );
}
