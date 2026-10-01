/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { apiFetch, getApiBaseUrl } from "@/services/api";
import { getErrorMessage } from "@/services/logger";
import { useToast } from "@/components/UI/Toast";
import type { ItemRow } from "@/views/PropuestaMaterialesPublica/types";

/** Subida + preview de imagen del material — opcional, con estado de carga propio. */
export default function ImageUploader({ token, item, onUploaded }: { token: string; item: ItemRow; onUploaded: (path: string | null) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFile = async (file: File) => {
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await apiFetch<{ path: string; optimized: boolean }>(`/public/invitations/${token}/proposal-image`, { method: "POST", body: form });
      onUploaded(res.path);
    } catch (error) {
      // Mensaje del backend (pared de seguridad, tipo/tamaño no permitido) —
      // ya viene en español y listo para mostrar tal cual, sin detalle interno.
      showToast(getErrorMessage(error, "No se pudo subir la imagen."), "error");
    } finally {
      setIsUploading(false);
    }
  };

  const previewUrl = item.imagePath
    ? `${getApiBaseUrl()}/public/invitations/${token}/proposal-image/${item.imagePath.split("/").pop()}`
    : null;

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-control border border-dashed border-border-subtle bg-surface-sunken/50">
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        ) : previewUrl ? (
          <img src={previewUrl} alt={item.materialName || "Material"} className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-5 w-5 text-text-muted/50" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-control border border-border-default px-3 py-2 text-[11px] font-bold text-text-primary transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Camera className="h-3.5 w-3.5" />
          {item.imagePath ? "Cambiar imagen" : "Agregar imagen"}
        </button>
        {item.imagePath && (
          <button
            type="button"
            onClick={() => onUploaded(null)}
            className="inline-flex cursor-pointer items-center gap-1 text-[10px] font-bold text-semantic-critical hover:text-semantic-critical/80"
          >
            <X className="h-3 w-3" /> Quitar
          </button>
        )}
        <span className="text-[9px] text-text-muted">Opcional — JPG, PNG o WEBP, máx. 5MB</span>
      </div>
    </div>
  );
}
