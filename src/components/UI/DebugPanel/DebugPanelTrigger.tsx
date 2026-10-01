/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Botón flotante del DEBUG-MODE: lo único montado mientras el panel está
 * cerrado. Muestra contadores diferenciados por color — rojo para ERROR/FATAL
 * y amarillo para WARN — y, si no hay ninguno de los dos, el total de eventos.
 * Cada selector devuelve un NÚMERO (nunca el array ni su contenido): el
 * componente solo se re-renderiza cuando cambia alguno de los tres conteos
 * (ver docblock de DebugPanel.tsx).
 */

import { Bug } from "lucide-react";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { countEntriesByLevel, useDebugStore } from "@/stores/debugStore";

const ERROR_LEVELS = ["error", "fatal"] as const;
const WARN_LEVELS = ["warn"] as const;

export function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

function Badge({ count, className, label }: { count: number; className: string; label: string }) {
  return (
    <span
      aria-label={`${count} ${label}`}
      className={`flex h-5 min-w-5 items-center justify-center rounded-pill border px-1 text-[10px] font-black ${className}`}
    >
      {formatBadgeCount(count)}
    </span>
  );
}

export default function DebugPanelTrigger({ onOpen }: { onOpen: () => void }) {
  const errorCount = useDebugStore(s => countEntriesByLevel(s.entries, ERROR_LEVELS));
  const warnCount = useDebugStore(s => countEntriesByLevel(s.entries, WARN_LEVELS));
  const totalCount = useDebugStore(s => s.entries.length);
  const danger = SEMANTIC_COLOR_MAP.danger;
  const warning = SEMANTIC_COLOR_MAP.warning;

  return (
    <button
      type="button"
      onClick={onOpen}
      title="Abrir DEBUG-MODE (Ctrl+Shift+D)"
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl transition-transform hover:scale-105 cursor-pointer"
    >
      <Bug className="h-5 w-5" />
      <span className="absolute -top-1.5 -right-1.5 flex gap-0.5">
        {warnCount > 0 && <Badge count={warnCount} label="advertencias" className={`${warning.bg100} ${warning.text700} ${warning.border200}`} />}
        {errorCount > 0 && <Badge count={errorCount} label="errores" className={`${danger.bg100} ${danger.text700} ${danger.border200}`} />}
        {errorCount === 0 && warnCount === 0 && totalCount > 0 && (
          <Badge count={totalCount} label="eventos" className="border-slate-200 bg-slate-100 text-slate-700" />
        )}
      </span>
    </button>
  );
}
