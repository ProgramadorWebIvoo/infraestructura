/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Zona de arrastre de archivos reutilizable.
 * Incluye input oculto, drag & drop y lista de archivos adjuntos.
 */

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Upload, X } from "lucide-react";
import { formatFileSize } from "../../utils";
import { springs } from "../../animations";

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/** Mapeo extensión → MIME types válidos para validación client-side. */
const EXT_MIME_MAP: Record<string, string[]> = {
  ".pdf":    ["application/pdf"],
  ".dwg":    ["application/acad", "application/x-autocad", "image/vnd.dwg", "application/dwg"],
  ".dxf":    ["application/dxf", "image/vnd.dxf", "application/x-autocad"],
  ".png":    ["image/png"],
  ".jpg":    ["image/jpeg"],
  ".jpeg":   ["image/jpeg"],
  ".svg":    ["image/svg+xml"],
  ".xlsx":   ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".xls":    ["application/vnd.ms-excel"],
  ".csv":    ["text/csv", "text/plain"],
  ".ods":    ["application/vnd.oasis.opendocument.spreadsheet"],
  ".numbers":["application/x-iwork-numbers-sffnumbers"],
  ".tif":    ["image/tiff"],
  ".tiff":   ["image/tiff"],
};

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
  color?: "sky" | "indigo" | "purple" | "emerald" | "rose";
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
  /** Tamaño máximo en bytes (default: 10 MB). 0 = sin límite. */
  maxSizeBytes?: number;
  /** Callback cuando un archivo es rechazado por validación client-side */
  onFileRejected?: (fileName: string, reason: string) => void;
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
  rose: {
    border: "border-rose-200",
    bg: "bg-rose-50",
    text: "text-rose-500",
    hover: "hover:border-rose-400 hover:bg-rose-50/30",
    dragBorder: "border-rose-400",
    dragBg: "bg-rose-50",
    fileBg: "bg-rose-50",
    fileBorder: "border-rose-100",
    fileText: "text-rose-800",
    countText: "text-rose-600",
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
  maxSizeBytes = DEFAULT_MAX_SIZE,
  onFileRejected,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Dispara un shake sutil en la zona cuando se rechaza un archivo — feedback
  // de fallo in-place, sin depender de que el padre muestre un toast.
  const [hasError, setHasError] = useState(false);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = COLOR_THEMES[color] ?? COLOR_THEMES.sky;

  const reject = useCallback(
    (fileName: string, reason: string) => {
      onFileRejected?.(fileName, reason);
      setHasError(true);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = setTimeout(() => setHasError(false), 500);
    },
    [onFileRejected],
  );

  const addFiles = useCallback(
    (incoming: FileList) => {
      const allowedExts = accept.split(",").map(e => e.trim().toLowerCase());
      const existing = new Set(files.map(f => f.name + f.size));
      const merged = [...files];

      Array.from(incoming).forEach(f => {
        const ext = "." + f.name.split(".").pop()?.toLowerCase();

        // 1. Validar extensión contra accept
        if (!allowedExts.some(a => a === ext)) {
          reject(f.name, `Extensión "${ext}" no permitida. Extensiones aceptadas: ${accept}`);
          return;
        }

        // 2. Validar tamaño máximo
        if (maxSizeBytes > 0 && f.size > maxSizeBytes) {
          const limit = formatFileSize(maxSizeBytes);
          reject(f.name, `El archivo excede el límite de ${limit}.`);
          return;
        }

        // 3. Validar MIME type si el browser lo reporta
        if (f.type) {
          const validMimes = EXT_MIME_MAP[ext];
          if (validMimes && !validMimes.includes(f.type)) {
            reject(f.name, `El tipo MIME "${f.type}" no coincide con la extensión "${ext}".`);
            return;
          }
        }

        // 4. Evitar duplicados
        if (!existing.has(f.name + f.size)) {
          merged.push(f);
        }
      });

      onFilesChange(merged);
    },
    [files, onFilesChange, accept, maxSizeBytes, reject],
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

      {/* Drop zone — su propio contenido cambia cuando ya hay archivos, para
          que quede visible sin depender de que el usuario scrollee hasta la
          lista de abajo. */}
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        animate={hasError ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={hasError ? { duration: 0.4, ease: "easeInOut" } : springs.gentle}
        className={`relative flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          hasError
            ? "border-danger-400 bg-danger-50/40"
            : isDragging
              ? `${t.dragBorder} ${t.dragBg}`
              : files.length > 0
                ? `${t.border} ${t.bg}`
                : `border-slate-200 bg-slate-50 ${t.hover}`
        }`}
      >
        {files.length > 0 ? (
          <motion.div
            key="has-files"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springs.gentle}
            className="flex flex-col items-center gap-1.5"
          >
            <motion.span
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={springs.snappy}
              className={t.text}
            >
              <CheckCircle2 className="h-6 w-6" />
            </motion.span>
            <span className={`text-[11px] font-bold ${t.fileText}`}>
              {files.length} {files.length === 1 ? "archivo listo" : "archivos listos"}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Haz clic para agregar más</span>
          </motion.div>
        ) : (
          <>
            {icon ?? <Upload className="h-6 w-6 text-slate-400" />}
            <span className="text-[11px] font-bold text-slate-500">Arrastra o haz clic para adjuntar</span>
            <span className="text-[10px] text-slate-400 font-medium">{extensionsLabel}</span>
          </>
        )}
        <input
          ref={inputRef}
          id={id}
          type="file"
          multiple
          accept={accept}
          data-testid="file-input"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </motion.div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          <AnimatePresence initial={false}>
            {files.map((file, i) => (
              <motion.li
                key={file.name + file.size}
                layout
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 12, scale: 0.96, transition: { duration: 0.15 } }}
                transition={springs.gentle}
                className={`flex items-center justify-between ${t.fileBg} ${t.fileBorder} border rounded-lg px-3 py-2`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className={`${t.text} shrink-0 h-3.5 w-3.5`} />
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
              </motion.li>
            ))}
          </AnimatePresence>
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
