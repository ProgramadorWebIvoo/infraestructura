/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Menú "Vista" del panel del DEBUG-MODE: acople (flotante/derecha/izquierda/
 * abajo), ventana emergente (experimental), opacidad y modo compacto. Todo
 * se guarda por navegador (ver useDebugPrefs).
 */

import { useEffect, useRef, useState } from "react";
import { AppWindow, SlidersHorizontal } from "lucide-react";
import IconActionButton from "@/components/UI/IconActionButton";
import { MAX_OPACITY, MIN_OPACITY, type DebugDock, type DebugPrefs } from "@/utils/debugLayout";

const DOCK_OPTIONS: { value: DebugDock; label: string }[] = [
  { value: "floating", label: "Flotante" },
  { value: "right", label: "Derecha" },
  { value: "left", label: "Izquierda" },
  { value: "bottom", label: "Abajo" },
];

interface DebugPanelViewMenuProps {
  prefs: DebugPrefs;
  onChange: (patch: Partial<DebugPrefs>) => void;
  onReset: () => void;
  /** true = el panel está en una ventana emergente. */
  inWindow: boolean;
  onOpenWindow: () => void;
  onCloseWindow: () => void;
}

export default function DebugPanelViewMenu({ prefs, onChange, onReset, inWindow, onOpenWindow, onCloseWindow }: DebugPanelViewMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cierra al hacer click fuera o con Escape. Se usa el `ownerDocument` del
  // menú: en modo ventana emergente vive en OTRO documento.
  useEffect(() => {
    if (!open || !wrapperRef.current) return;
    const doc = wrapperRef.current.ownerDocument;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    doc.addEventListener("mousedown", onDown);
    doc.addEventListener("keydown", onKey);
    return () => {
      doc.removeEventListener("mousedown", onDown);
      doc.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const optionClass = (active: boolean) =>
    `rounded-lg px-2 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
      active ? "bg-white text-slate-700 shadow-xs" : "text-slate-500 hover:text-slate-700"
    }`;

  return (
    <div ref={wrapperRef} className="relative">
      <IconActionButton
        icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
        label="Vista del panel"
        tooltip="Acople, opacidad y modo compacto"
        onClick={() => setOpen(v => !v)}
      />
      {open && (
        <div
          role="dialog"
          aria-label="Opciones de vista del panel"
          className="absolute right-0 top-full z-20 mt-1 max-h-[70vh] w-64 space-y-3 overflow-auto rounded-container border border-border-default bg-surface p-3 shadow-xl"
        >
          <div>
            <p className="mb-1 text-[10px] font-black uppercase text-text-tertiary">Acople</p>
            <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100/60 p-1">
              {DOCK_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  disabled={inWindow}
                  onClick={() => onChange({ dock: o.value })}
                  className={`${optionClass(!inWindow && prefs.dock === o.value)} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={inWindow ? onCloseWindow : onOpenWindow}
              className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              <AppWindow className="h-3 w-3" />
              {inWindow ? "Volver a la ventana principal" : "Abrir en ventana emergente (experimental)"}
            </button>
          </div>

          <label className="block">
            <span className="mb-1 flex items-center justify-between text-[10px] font-black uppercase text-text-tertiary">
              Opacidad <span className="font-mono">{Math.round(prefs.opacity * 100)}%</span>
            </span>
            <input
              type="range"
              min={MIN_OPACITY}
              max={MAX_OPACITY}
              step={0.05}
              value={prefs.opacity}
              disabled={inWindow}
              onChange={e => onChange({ opacity: Number(e.target.value) })}
              aria-label="Opacidad del panel"
              className="w-full disabled:opacity-50"
            />
          </label>

          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={prefs.compact}
              onChange={e => onChange({ compact: e.target.checked })}
              className="mt-0.5"
            />
            <span className="text-[11px] font-bold text-text-primary">
              Modo compacto
              <span className="block text-[10px] font-normal text-text-tertiary">Oculta los filtros secundarios para dejar más espacio a la lista.</span>
            </span>
          </label>

          <button type="button" onClick={onReset} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer">
            Restablecer vista
          </button>
        </div>
      )}
    </div>
  );
}
