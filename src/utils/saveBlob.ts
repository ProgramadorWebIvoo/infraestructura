/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Única forma de guardar un Blob en el equipo del usuario (descargas de
 * documentos, exportaciones CSV/XLSX, JSON de debug). Antes cada sitio armaba
 * su propio `<a download>` y revocaba la URL en la misma línea del `click()`,
 * lo que en algunos navegadores cancela la descarga antes de que empiece.
 */

import { sanitizeFileName } from "@/utils/fileUpload";

/** Tiempo que la URL temporal sigue viva tras el click: sobra para que el navegador inicie el guardado. */
export const REVOKE_DELAY_MS = 30_000;

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = sanitizeFileName(filename);
  // Firefox antiguo exige el ancla dentro del documento para respetar `download`.
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
