/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tab "Info" del DEBUG-MODE: snapshot de sesión/entorno — quién está
 * logueado, contra qué API, en qué navegador/viewport. Útil para reportar
 * un bug sin tener que preguntar "¿qué rol tenías?, ¿en qué pantalla?".
 */

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import type { AuthUser } from "@/hooks/useAuth";
import { getApiBaseUrl } from "@/services/api";
import { copyToClipboard } from "./debugUtils";

interface DebugInfoPanelProps {
  authUser: AuthUser;
  activeRole?: string | null;
}

function useViewportSize() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

export default function DebugInfoPanel({ authUser, activeRole }: DebugInfoPanelProps) {
  const viewport = useViewportSize();
  const [copied, setCopied] = useState(false);

  const rows: [string, string][] = [
    ["Usuario", authUser ? `${authUser.name} (#${authUser.id})` : "—"],
    ["Email", authUser?.email ?? "—"],
    ["Rol activo", activeRole ?? "—"],
    ["API base URL", getApiBaseUrl()],
    ["Modo build", import.meta.env.PROD ? "production" : "development"],
    ["Viewport", `${viewport.w}×${viewport.h}px`],
    ["User agent", navigator.userAgent],
    ["Idioma", navigator.language],
    ["Online", navigator.onLine ? "sí" : "no"],
    ["URL actual", window.location.href],
  ];

  const handleCopy = async () => {
    const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
    if (await copyToClipboard(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
      >
        {copied ? <Check className="h-3 w-3 text-success-600" /> : <Copy className="h-3 w-3" />}
        Copiar todo (para reportar un bug)
      </button>
      <dl className="divide-y divide-border-default overflow-hidden rounded-control border border-border-default bg-white">
        {rows.map(([key, value]) => (
          <div key={key} className="flex gap-3 px-3 py-2 text-xs">
            <dt className="w-28 shrink-0 font-bold text-text-tertiary">{key}</dt>
            <dd className="min-w-0 flex-1 break-all font-mono text-[11px] text-text-primary">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
