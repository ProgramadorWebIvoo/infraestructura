/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Exportar / importar sesiones del DEBUG-MODE (ver utils/debugSession.ts).
 * El tamaño del archivo se valida ANTES de leerlo: un archivo de cientos de
 * MB no debe llegar nunca a `file.text()`.
 */

import { useCallback } from "react";
import { useToast } from "@/components/UI/Toast";
import { downloadJson } from "@/components/UI/DebugPanel/debugUtils";
import { useDebugReviewStore } from "@/stores/debugReviewStore";
import type { DebugEntry } from "@/stores/debugStore";
import { buildSessionExport, MAX_IMPORT_BYTES, parseSessionImport } from "@/utils/debugSession";

const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "desconocida";

export function useDebugSessionIO(entries: readonly DebugEntry[]) {
  const { showToast } = useToast();
  const openReview = useDebugReviewStore(s => s.open);

  const exportSession = useCallback(() => {
    const session = buildSessionExport(entries, {
      version: APP_VERSION,
      mode: import.meta.env.PROD ? "production" : "development",
    });
    downloadJson(`ivoo-debug-session-${Date.now()}.json`, session);
  }, [entries]);

  const importSession = useCallback(
    async (file: File) => {
      if (file.size > MAX_IMPORT_BYTES) {
        showToast(`El archivo supera ${MAX_IMPORT_BYTES / 1024 / 1024} MB.`, "error");
        return;
      }
      const parsed = parseSessionImport(await file.text());
      if (!parsed.ok) {
        showToast(parsed.error, "error");
        return;
      }
      openReview({ ...parsed.session, fileName: file.name.slice(0, 80) });
      const skippedNote = parsed.skipped > 0 ? ` (${parsed.skipped} omitidos por formato inválido)` : "";
      showToast(`Sesión importada: ${parsed.session.entries.length} eventos${skippedNote}.`, parsed.skipped > 0 ? "warning" : "success");
    },
    [openReview, showToast],
  );

  return { exportSession, importSession };
}
