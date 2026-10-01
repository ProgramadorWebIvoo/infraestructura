/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Acción "Copiar diagnóstico" del DEBUG-MODE: arma el System Snapshot con el
 * estado actual (stores, memoria, entorno), lo copia al portapapeles y avisa
 * con un toast. Compartida por la cabecera del panel y el tab Info.
 */

import { useCallback } from "react";
import { useToast } from "@/components/UI/Toast";
import { copyToClipboard } from "@/components/UI/DebugPanel/debugUtils";
import { useDebugStore } from "@/stores/debugStore";
import { usePerfStore } from "@/stores/debugCapture";
import { buildDiagnosticSnapshot } from "@/utils/debugDiagnostics";
import { readMemory } from "@/utils/debugPerformance";

const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "desconocida";

export function useCopyDiagnostic(activeRole: string | null | undefined): () => Promise<void> {
  const { showToast } = useToast();

  return useCallback(async () => {
    const { entries, networkProfile } = useDebugStore.getState();
    const { fps, ...vitals } = usePerfStore.getState().perfMetrics;

    const snapshot = buildDiagnosticSnapshot({
      appVersion: APP_VERSION,
      buildMode: import.meta.env.PROD ? "production" : "development",
      role: activeRole,
      url: window.location.href,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      online: navigator.onLine,
      memory: readMemory(),
      fps,
      vitals,
      networkProfile,
      entries,
    });

    const ok = await copyToClipboard(JSON.stringify(snapshot, null, 2));
    showToast(ok ? "Diagnóstico copiado al portapapeles." : "No se pudo copiar el diagnóstico.", ok ? "success" : "error");
  }, [activeRole, showToast]);
}
