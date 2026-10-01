/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Banner del modo REVISIÓN: avisa que lo que se ve es una sesión importada
 * (solo lectura), no la captura en vivo, y permite volver a ella.
 */

import { ArrowLeft, FileSearch } from "lucide-react";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { useDebugReviewStore } from "@/stores/debugReviewStore";

export default function DebugReviewBanner() {
  const session = useDebugReviewStore(s => s.session);
  const close = useDebugReviewStore(s => s.close);
  const info = SEMANTIC_COLOR_MAP.info;

  if (!session) return null;

  const exportedAt = session.exportedAt ? new Date(session.exportedAt).toLocaleString("es-VE") : "fecha desconocida";
  const appInfo = [session.app.version && `v${session.app.version}`, session.app.mode].filter(Boolean).join(" · ");

  return (
    <div role="status" className={`mx-3 mt-2 flex items-start gap-2 rounded-control border px-3 py-2 ${info.bg50} ${info.border200}`}>
      <FileSearch className={`mt-0.5 h-4 w-4 shrink-0 ${info.icon500}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-[11px] font-black ${info.text700}`}>Revisando una sesión importada (solo lectura)</p>
        <p className="truncate text-[10px] font-semibold text-text-secondary">
          {session.fileName ?? "sesión"} · {session.entries.length} eventos · exportada {exportedAt}
          {appInfo && ` · ${appInfo}`}
        </p>
      </div>
      <button
        type="button"
        onClick={close}
        className={`flex shrink-0 items-center gap-1 text-[10px] font-black cursor-pointer ${info.text700}`}
      >
        <ArrowLeft className="h-3 w-3" /> Volver a la captura en vivo
      </button>
    </div>
  );
}
