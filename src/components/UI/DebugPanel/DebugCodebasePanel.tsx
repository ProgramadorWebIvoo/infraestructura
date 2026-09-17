/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tab "Codebase" del DEBUG-MODE: "¿dónde estoy parado en el código?"
 * mientras se reproduce un bug — componente de vista montado, archivo,
 * hooks de dominio y God Nodes (graphify-out/COMPASS.md) que toca la
 * ruta activa. Solo lectura de un mapa estático (codebaseRouteMap.ts), sin
 * ejecutar código ni leer el grafo completo — ver docblock de ese archivo.
 */

import { useLocation } from "react-router-dom";
import { Copy, Check, FileCode2 } from "lucide-react";
import { useState } from "react";
import { getCodebaseRouteInfo } from "./codebaseRouteMap";
import { copyToClipboard } from "./debugUtils";

export default function DebugCodebasePanel() {
  const location = useLocation();
  const info = getCodebaseRouteInfo(location.pathname);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = info
      ? `Ruta: ${location.pathname}\nComponente: ${info.component}\nArchivo: src/${info.file}\nHooks: ${info.hooks.join(", ")}\nGod Nodes: ${info.godNodes?.join(", ") ?? "—"}`
      : `Ruta: ${location.pathname} (sin módulo mapeado)`;
    if (await copyToClipboard(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (!info) {
    return (
      <div className="rounded-control border border-dashed border-border-default p-4 text-center text-xs font-bold text-text-tertiary">
        Sin módulo mapeado para <code className="font-mono">{location.pathname}</code>.
        <br />
        Puede ser una ruta pública, un modal, o falta agregarla a codebaseRouteMap.ts.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
      >
        {copied ? <Check className="h-3 w-3 text-success-600" /> : <Copy className="h-3 w-3" />}
        Copiar contexto de módulo (para reportar un bug)
      </button>

      <div className="rounded-control border border-border-default bg-white p-3">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-black text-text-primary">{info.component}</span>
        </div>
        <p className="mt-1 truncate font-mono text-[11px] text-text-tertiary">src/{info.file}</p>
      </div>

      <DebugCodebaseSection title="Ruta actual" items={[location.pathname]} />
      <DebugCodebaseSection title="Hooks de dominio" items={info.hooks} />
      {info.godNodes && info.godNodes.length > 0 && (
        <DebugCodebaseSection
          title="God Nodes involucrados"
          items={info.godNodes}
          hint="Muchas conexiones en el grafo (COMPASS.md) — evaluar impacto antes de tocarlos."
        />
      )}
    </div>
  );
}

function DebugCodebaseSection({ title, items, hint }: { title: string; items: string[]; hint?: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-text-tertiary">{title}</p>
      <div className="flex flex-wrap gap-1">
        {items.map(item => (
          <span
            key={item}
            className="rounded-pill bg-slate-100 px-2 py-1 font-mono text-[11px] font-bold text-slate-700"
          >
            {item}
          </span>
        ))}
      </div>
      {hint && <p className="mt-1 text-[10px] text-text-tertiary">{hint}</p>}
    </div>
  );
}
