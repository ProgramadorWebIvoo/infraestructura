/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Preparación de archivos ANTES de subirlos: nombre normalizado, revisión
 * rápida de firma/código embebido (feedback inmediato) y optimización de
 * imágenes sin pérdida visible (reescala + recompresión, el canvas además
 * descarta EXIF/GPS). Pasa por aquí TODO archivo que viaje en un FormData
 * porque `apiFetch` llama a `prepareFormDataFiles` — ningún punto de subida
 * puede saltárselo.
 *
 * No sustituye al backend: FileIngestionPipeline vuelve a verificar, sanear y
 * comprimir todo (PDF, hojas de cálculo, SVG…) y es la fuente de verdad. Aquí
 * solo se ahorra ancho de banda y se rechaza temprano lo obviamente malo.
 */

const IMAGE_MAX_DIMENSION = 2560;
const IMAGE_QUALITY = 0.85;
/** Debajo de este peso no vale la pena recomprimir. */
const IMAGE_MIN_BYTES = 200 * 1024;
/** Mejora mínima para preferir la versión recomprimida. */
const IMAGE_MIN_GAIN = 0.08;
const SCAN_WINDOW_BYTES = 64 * 1024;

const OPTIMIZABLE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const CANONICAL_EXTENSION: Record<string, string> = { jpeg: "jpg", tif: "tiff" };

/** Firmas físicas por extensión (solo las que se pueden verificar con los primeros bytes). */
const MAGIC_BY_EXTENSION: Record<string, (head: Uint8Array) => boolean> = {
  png: head => startsWith(head, [0x89, 0x50, 0x4e, 0x47]),
  jpg: head => startsWith(head, [0xff, 0xd8, 0xff]),
  jpeg: head => startsWith(head, [0xff, 0xd8, 0xff]),
  webp: head => startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head.subarray(8), [0x57, 0x45, 0x42, 0x50]),
  pdf: head => startsWith(head, [0x25, 0x50, 0x44, 0x46, 0x2d]),
  xlsx: head => startsWith(head, [0x50, 0x4b, 0x03, 0x04]),
  ods: head => startsWith(head, [0x50, 0x4b, 0x03, 0x04]),
  xls: head => startsWith(head, [0xd0, 0xcf, 0x11, 0xe0]),
};

const EXECUTABLE_SIGNATURES: number[][] = [[0x4d, 0x5a], [0x7f, 0x45, 0x4c, 0x46], [0x23, 0x21]];
const CODE_MARKERS = /<\?php|<script\b|\/JavaScript\b|\/Launch\b|\/EmbeddedFile\b/i;

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

async function readBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") return new Uint8Array(await blob.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Nombre seguro y consistente: NFC, sin caracteres de control ni overrides
 * bidireccionales (el truco `fdp.exe` con U+202E) y sin rutas. También sirve
 * para nombrar archivos que se GUARDAN (descargas): no toca la extensión.
 */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  // eslint-disable-next-line no-control-regex
  const clean = base.normalize("NFC").replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, "").replace(/\s+/g, " ").trim();
  return clean || "archivo";
}

/** sanitizeFileName + extensión canónica en minúsculas (`FOTO.JPEG` → `FOTO.jpg`). */
export function normalizeFileName(name: string): string {
  const clean = sanitizeFileName(name);
  const ext = extensionOf(clean);
  if (!ext) return clean || "archivo";
  const stem = clean.slice(0, clean.length - ext.length - 1).trim() || "archivo";
  return `${stem}.${CANONICAL_EXTENSION[ext] ?? ext}`;
}

/**
 * Revisión rápida solo con los extremos del archivo: ejecutable disfrazado,
 * contenido que no corresponde a la extensión, o código/acciones activas
 * evidentes. Devuelve el mensaje de rechazo o `null` si no hay nada obvio.
 */
export async function inspectFile(file: File): Promise<string | null> {
  const head = await readBytes(file.slice(0, SCAN_WINDOW_BYTES));

  if (EXECUTABLE_SIGNATURES.some(signature => startsWith(head, signature))) {
    return `«${file.name}» contiene código ejecutable y no está permitido.`;
  }

  const ext = extensionOf(file.name);
  const matchesMagic = MAGIC_BY_EXTENSION[ext];
  if (matchesMagic && !matchesMagic(head)) {
    return `El contenido de «${file.name}» no coincide con su extensión «.${ext}».`;
  }

  const tail = file.size > SCAN_WINDOW_BYTES ? await readBytes(file.slice(-SCAN_WINDOW_BYTES)) : new Uint8Array();
  const sample = new TextDecoder("latin1").decode(head) + new TextDecoder("latin1").decode(tail);
  return CODE_MARKERS.test(sample) ? `«${file.name}» contiene código embebido y no está permitido.` : null;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, IMAGE_QUALITY));
}

/**
 * Reescala (máx. 2560 px) y recomprime JPEG/PNG/WEBP respetando la
 * orientación EXIF. Solo devuelve la versión nueva si pesa menos; ante
 * cualquier limitación del navegador o imagen animada conserva el original.
 */
export async function optimizeImageFile(file: File): Promise<File> {
  if (!OPTIMIZABLE_TYPES.includes(file.type) || typeof createImageBitmap !== "function") return file;

  try {
    if (file.type === "image/webp" && new TextDecoder("latin1").decode(await readBytes(file.slice(0, 4096))).includes("ANIM")) return file;

    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const mustResize = scale < 1;

    // PNG es sin pérdida: recodificarlo en canvas rara vez baja el peso, solo se toca si hay que reescalar.
    if (!mustResize && (file.size < IMAGE_MIN_BYTES || file.type === "image/png")) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await canvasToBlob(canvas, file.type);
    const worthIt = blob !== null && (mustResize ? blob.size < file.size : blob.size <= file.size * (1 - IMAGE_MIN_GAIN));
    return worthIt ? new File([blob], file.name, { type: file.type, lastModified: file.lastModified }) : file;
  } catch {
    return file;
  }
}

/** Nombre normalizado + revisión rápida + optimización. Lanza `Error` con mensaje para el usuario si se rechaza. */
export async function prepareFileForUpload(file: File): Promise<File> {
  const rejection = await inspectFile(file);
  if (rejection) throw new Error(rejection);

  const optimized = await optimizeImageFile(file);
  const name = normalizeFileName(optimized.name);
  return name === optimized.name ? optimized : new File([optimized], name, { type: optimized.type, lastModified: optimized.lastModified });
}

/** Devuelve un FormData equivalente con cada archivo ya preparado (mismo orden y mismos campos). */
export async function prepareFormDataFiles(form: FormData): Promise<FormData> {
  const prepared = new FormData();

  for (const [key, value] of Array.from(form.entries())) {
    if (value instanceof File) {
      const file = await prepareFileForUpload(value);
      prepared.append(key, file, file.name);
    } else {
      prepared.append(key, value);
    }
  }

  return prepared;
}
