/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Zona de arrastre de archivos reutilizable.
 * Incluye input oculto, drag & drop y lista de archivos adjuntos.
 */

import { useState, useRef, useCallback } from "react";
import { X, Upload } from "lucide-react";
import { formatFileSize } from "../../utils";

interface FileDropZoneProps {
  /** Archivos actualmente seleccionados */
  files: File[];
  /** Setter para actualizar la lista de archivos */
  onFilesChange: (files: File[]) => void;
  /** Etiqueta visible */
  label: string;
  /** Extensiones aceptadas (formato .ext) */
  accept: string;
  /** Texto de ayuda con las extensiones */
  extensionsLabel: string;
  /** Color theme: sky | indigo | purple | etc. */
  color?: "sky" | "indigo" | "purple" | "emerald";
  /** Icono decorativo (ReactNode) */
  icon?: React.ReactNode;
  /** Icono para cada archivo en la lista */
  fileIcon?: React.ReactNode;
  /** ID para el input */
  id?: string;
  /** Requerido (asterisco rojo) */
  required?: boolean;
  /** Texto de contador (ej. "planos adjuntos") */
  countLabel?: string;
}

const COLOR_THEMES: Record<string, { border: string; bg: string; text: string; hover: string; dragBorder: string; dragBg: string; fileBg: string; fileBorder: string; fileText: string; countText: string }> = {
  sky: {
    border: "border-sky-200",
    bg: "bg-sky-50",
    text: "text-sky-500",
    hover: "hover:border-sky-400 hover:bg-sky-50/30",
    dragBorder: "border-sky-400",
    dragBg: "bg-sky-50",
    fileBg: "bg-sky-50",
    fileBorder: "border-sky-100",
    fileText: "text-sky-800",
    countText: "text-sky-600",
  },
  indigo: {
    border: "border-indigo-200",
    bg: "bg-indigo-50",
    text: "text-indigo-500",
    hover: "hover:border-indigo-400 hover:bg-indigo-50/30",
    dragBorder: "border-indigo-400",
    dragBg: "bg-indigo-50",
    fileBg: "bg-indigo-50",
    fileBorder: "border-indigo-100",
    fileText: "text-indigo-800",
    countText: "text-indigo-600",
  },
  purple: {
    border: "border-purple-200",
    bg: "bg-purple-50",
    text: "text-purple-500",
    hover: "hover:border-purple-400 hover:bg-purple-50/30",
    dragBorder: "border-purple-400",
    dragBg: "bg-purple-50",
    fileBg: "bg-purple-50",
    fileBorder: "border-purple-100",
    fileText: "text-purple-800",
    countText: "text-purple-600",
  },
  emerald: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-500",
    hover: "hover:border-emerald-400 hover:bg-emerald-50/30",
    dragBorder: "border-emerald-400",
    dragBg: "bg-emerald-50",
    fileBg: "bg-emerald-50",
    fileBorder: "border-emerald-100",
    fileText: "text-emerald-800",
    countText: "text-emerald-600",
  },
};

export default function FileDropZone({
  files,
  onFilesChange,
  label,
  accept,
  extensionsLabel,
  color = "sky",
  icon,
  fileIcon,
  id,
  required = false,
  countLabel,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const t = COLOR_THEMES[color] ?? COLOR_THEMES.sky;

  const addFiles = useCallback(
    (incoming: FileList) => {
      const existing = new Set(files.map(f => f.name + f.size));
      const merged = [...files];
      Array.from(incoming).forEach(f => {
        if (!existing.has(f.name + f.size)) merged.push(f);
      });
      onFilesChange(merged);
    },
    [files, onFilesChange],
  );

  const removeFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange],
  );

  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        {fileIcon}
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          isDragging ? `${t.dragBorder} ${t.dragBg}` : `border-slate-200 bg-slate-50 ${t.hover}`
        }`}
      >
        {icon ?? <Upload className="h-6 w-6 text-slate-400" />}
        <span className="text-[11px] font-bold text-slate-500">Arrastra o haz clic para adjuntar</span>
        <span className="text-[10px] text-slate-400 font-medium">{extensionsLabel}</span>
        <input
          ref={inputRef}
          id={id}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((file, i) => (
            <li key={i} className={`flex items-center justify-between ${t.fileBg} ${t.fileBorder} border rounded-lg px-3 py-2`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className={`${t.text} shrink-0`}>{fileIcon}</span>
                <span className={`text-[11px] font-bold ${t.fileText} truncate`}>{file.name}</span>
                <span className={`text-[10px] ${t.text} font-medium shrink-0`}>{formatFileSize(file.size)}</span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className={`ml-2 ${t.text} hover:text-rose-500 transition-colors shrink-0 cursor-pointer`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Counter */}
      {countLabel && files.length > 0 && (
        <p className={`mt-1.5 text-[10px] font-bold ${t.countText} text-right`}>
          {files.length} {files.length === 1 ? countLabel : `${countLabel}s`}
        </p>
      )}
    </div>
  );
}
