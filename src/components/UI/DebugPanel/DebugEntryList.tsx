/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lista de entradas compartida por las tabs Network/Logs/WebSocket/Errors
 * del DEBUG-MODE — misma UI de fila expandible+detalle JSON, cada tab solo
 * cambia el `kind` que filtra y si ofrece "Copiar como cURL" (solo Network).
 */

import { useState } from "react";
import { ChevronDown, Copy, Check } from "lucide-react";
import EmptyState from "@/components/UI/EmptyState";
import { SEMANTIC_COLOR_MAP, type SemanticColor } from "@/components/UI/colorTokens";
import type { DebugEntry, DebugLevel } from "@/stores/debugStore";
import { buildCurlCommand, copyToClipboard } from "./debugUtils";

const LEVEL_ACCENT: Record<DebugLevel, SemanticColor> = {
  info: "info",
  warn: "warning",
  error: "danger",
};

function durationTone(ms?: number): string {
  if (ms === undefined) return "";
  if (ms >= 1000) return "text-danger-600 font-black";
  if (ms >= 300) return "text-warning-600 font-bold";
  return "text-text-tertiary";
}

interface DebugEntryListProps {
  entries: DebugEntry[];
  emptyMessage: string;
  showCurl?: boolean;
}

export default function DebugEntryList({ entries, emptyMessage, showCurl = false }: DebugEntryListProps) {
  if (entries.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <ul className="space-y-1.5">
      {entries.map(entry => (
        <DebugEntryRow key={entry.id} entry={entry} showCurl={showCurl} />
      ))}
    </ul>
  );
}

function DebugEntryRow({ entry, showCurl }: { entry: DebugEntry; showCurl: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<"detail" | "curl" | null>(null);
  const accent = SEMANTIC_COLOR_MAP[LEVEL_ACCENT[entry.level ?? "info"]];
  const time = new Date(entry.timestamp).toLocaleTimeString("es-VE", { hour12: false });

  const handleCopy = async (kind: "detail" | "curl") => {
    const text = kind === "curl" ? buildCurlCommand(entry) : JSON.stringify(entry.detail ?? entry.label, null, 2);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    }
  };

  return (
    <li className="rounded-control border border-border-default bg-white">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left cursor-pointer"
      >
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-text-tertiary transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`} />
        <span className={`shrink-0 rounded-pill px-1.5 py-0.5 text-[9px] font-black uppercase ${accent.bg100} ${accent.text700}`}>
          {entry.level ?? "info"}
        </span>
        <span className="font-mono text-[10px] text-text-tertiary shrink-0">{time}</span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-text-primary">{entry.label}</span>
        {entry.durationMs !== undefined && (
          <span className={`shrink-0 font-mono text-[10px] ${durationTone(entry.durationMs)}`}>{entry.durationMs}ms</span>
        )}
      </button>
      {expanded && (
        <div className="border-t border-border-default bg-slate-50">
          {entry.detail && (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all px-3 py-2 text-[10px] text-slate-600">
              {typeof entry.detail === "string" ? entry.detail : JSON.stringify(entry.detail, null, 2)}
            </pre>
          )}
          <div className="flex items-center gap-3 border-t border-border-default px-3 py-1.5">
            <button
              type="button"
              onClick={() => handleCopy("detail")}
              className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              {copied === "detail" ? <Check className="h-3 w-3 text-success-600" /> : <Copy className="h-3 w-3" />}
              Copiar JSON
            </button>
            {showCurl && (
              <button
                type="button"
                onClick={() => handleCopy("curl")}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                {copied === "curl" ? <Check className="h-3 w-3 text-success-600" /> : <Copy className="h-3 w-3" />}
                Copiar como cURL
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
