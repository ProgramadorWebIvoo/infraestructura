/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Botón flotante del DEBUG-MODE: lo único montado mientras el panel está
 * cerrado. Solo se suscribe a la longitud del buffer (un número) — nunca al
 * array completo ni a su contenido (ver docblock de DebugPanel.tsx).
 */

import { Bug } from "lucide-react";
import { useDebugStore } from "@/stores/debugStore";

export default function DebugPanelTrigger({ onOpen }: { onOpen: () => void }) {
  const entryCount = useDebugStore(s => s.entries.length);

  return (
    <button
      type="button"
      onClick={onOpen}
      title="Abrir DEBUG-MODE (Ctrl+Shift+D)"
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl transition-transform hover:scale-105 cursor-pointer"
    >
      <Bug className="h-5 w-5" />
      {entryCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-pill bg-rose-500 px-1 text-[10px] font-black text-white">
          {entryCount > 99 ? "99+" : entryCount}
        </span>
      )}
    </button>
  );
}
