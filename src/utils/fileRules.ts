/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Reglas ÚNICAS de validación de archivos antes de subirlos (extensión,
 * tamaño, vacío, MIME, duplicado, cantidad y peso total). Las usan
 * `FileDropZone` y todos los selectores de archivo propios vía
 * `useFileValidation`, para que ninguno se salte una comprobación.
 *
 * Es validación de UX (feedback inmediato): el backend vuelve a validar todo
 * (Form Requests + FileIngestionPipeline) y es la fuente de verdad.
 */

import { formatFileSize } from "@/utils";

/** Mapeo extensión → MIME types válidos. Las extensiones fuera del mapa no se validan por MIME. */
export const EXT_MIME_MAP: Record<string, string[]> = {
  ".pdf":    ["application/pdf"],
  ".dwg":    ["application/acad", "application/x-autocad", "image/vnd.dwg", "application/dwg"],
  ".dxf":    ["application/dxf", "image/vnd.dxf", "application/x-autocad"],
  ".png":    ["image/png"],
  ".jpg":    ["image/jpeg"],
  ".jpeg":   ["image/jpeg"],
  ".webp":   ["image/webp"],
  ".svg":    ["image/svg+xml"],
  ".xlsx":   ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".xls":    ["application/vnd.ms-excel"],
  ".csv":    ["text/csv", "text/plain"],
  ".ods":    ["application/vnd.oasis.opendocument.spreadsheet"],
  ".numbers":["application/x-iwork-numbers-sffnumbers"],
  ".tif":    ["image/tiff"],
  ".tiff":   ["image/tiff"],
};

export interface FileRules {
  /** Extensiones aceptadas, formato `.ext` separadas por coma (igual que el atributo `accept`). Vacío = cualquiera. */
  accept: string;
  /** Peso máximo por archivo en bytes. `0`/`undefined` = sin límite. */
  maxSizeBytes?: number;
  /** Cantidad máxima de archivos en total (existentes + nuevos). `0`/`undefined` = sin límite. */
  maxFileCount?: number;
  /** Peso máximo sumado de todos los archivos (existentes + nuevos). `0`/`undefined` = sin límite. */
  maxTotalBytes?: number;
}

export interface FileRejection {
  name: string;
  reason: string;
}

export interface FileValidationResult {
  /** Lista resultante: los existentes + los nuevos aceptados. */
  merged: File[];
  rejected: FileRejection[];
}

/** Extensión con punto en minúsculas (`.pdf`); sin punto en el nombre devuelve `.nombre`, igual que antes. */
export function extensionOf(name: string): string {
  return "." + name.split(".").pop()?.toLowerCase();
}

/** Identidad de un archivo para detectar duplicados: mismo nombre, peso y fecha de modificación. */
export function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function totalBytes(files: File[]): number {
  return files.reduce((sum, file) => sum + file.size, 0);
}

/**
 * Valida `incoming` contra `rules` en orden de gravedad. La cantidad y el
 * peso total se evalúan al final para no rechazar por cupo un archivo que de
 * todas formas se rechazaba por extensión/tamaño/MIME. Un archivo rechazado
 * no consume cupo.
 */
export function validateFiles(incoming: File[], existing: File[], rules: FileRules): FileValidationResult {
  const allowedExts = rules.accept.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  const known = new Set(existing.map(fileKey));
  const merged = [...existing];
  const rejected: FileRejection[] = [];
  let runningTotal = totalBytes(existing);

  const reject = (file: File, reason: string) => rejected.push({ name: file.name, reason });

  for (const file of incoming) {
    const ext = extensionOf(file.name);

    if (allowedExts.length > 0 && !allowedExts.includes(ext)) {
      reject(file, `Extensión "${ext}" no permitida. Extensiones aceptadas: ${rules.accept}`);
      continue;
    }

    if (file.size === 0) {
      reject(file, "El archivo está vacío (0 bytes).");
      continue;
    }

    if (rules.maxSizeBytes && rules.maxSizeBytes > 0 && file.size > rules.maxSizeBytes) {
      reject(file, `El archivo excede el límite de ${formatFileSize(rules.maxSizeBytes)}.`);
      continue;
    }

    if (file.type) {
      const validMimes = EXT_MIME_MAP[ext];
      if (validMimes && !validMimes.includes(file.type)) {
        reject(file, `El tipo MIME "${file.type}" no coincide con la extensión "${ext}".`);
        continue;
      }
    }

    if (known.has(fileKey(file))) {
      reject(file, "Ya está en la lista.");
      continue;
    }

    if (rules.maxFileCount && merged.length >= rules.maxFileCount) {
      reject(file, `Se alcanzó el máximo de ${rules.maxFileCount} archivo(s).`);
      continue;
    }

    if (rules.maxTotalBytes && rules.maxTotalBytes > 0 && runningTotal + file.size > rules.maxTotalBytes) {
      reject(file, `Superaría el máximo de ${formatFileSize(rules.maxTotalBytes)} por envío (ya hay ${formatFileSize(runningTotal)} seleccionados).`);
      continue;
    }

    known.add(fileKey(file));
    merged.push(file);
    runningTotal += file.size;
  }

  return { merged, rejected };
}
