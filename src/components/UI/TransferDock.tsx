/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TransferDock — progreso de las subidas en curso, visible en toda la app
 * (también en las páginas públicas). Lee de `transferStore`, que alimenta el
 * wrapper de `apiFetch` para CUALQUIER subida, así que ningún formulario tiene
 * que cablear nada. Muestra la fase (preparando → enviando → procesando), los
 * bytes enviados, el aviso de reintento automático y el botón Cancelar (que
 * se bloquea cuando el servidor ya recibió todo y solo está procesando).
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Download, Loader2, UploadCloud, X } from "lucide-react";
import { formatFileSize } from "@/utils";
import { useTransferStore, type Transfer } from "@/stores/transferStore";
import { SEMANTIC_COLOR_MAP } from "./colorTokens";

/** Una subida que termina antes de esto no se muestra: evita el parpadeo de las rápidas. */
const SHOW_AFTER_MS = 400;
const TICK_MS = 250;
const b = SEMANTIC_COLOR_MAP.brand;

/** Porcentaje 0–100 enviado, o `null` si el navegador no conoce el total. */
export function transferPercent(transfer: Pick<Transfer, "loaded" | "total">): number | null {
  if (!transfer.total) return null;
  return Math.min(100, Math.round((transfer.loaded / transfer.total) * 100));
}

export function transferStatusText(transfer: Transfer): string {
  if (transfer.phase === "preparing") return "Preparando archivos…";
  if (transfer.phase === "processing") return "Recibido. El servidor está verificando los archivos…";

  const percent = transferPercent(transfer);
  const isDownload = transfer.phase === "downloading";
  const base = transfer.retryAttempt > 0
    ? `Reintentando ${isDownload ? "la descarga" : "el envío"} (intento ${transfer.retryAttempt + 1})`
    : isDownload ? "Descargando" : "Enviando";
  if (percent === null) {
    // Sin Content-Length no hay %: se muestran al menos los bytes recibidos.
    return isDownload && transfer.loaded > 0 ? `${base} · ${formatFileSize(transfer.loaded)}` : `${base}…`;
  }
  return `${base} · ${percent}% (${formatFileSize(transfer.loaded)} de ${formatFileSize(transfer.total ?? 0)})`;
}

function TransferCard({ transfer }: { transfer: Transfer }) {
  const reduceMotion = useReducedMotion();
  const percent = transferPercent(transfer);
  const isProcessing = transfer.phase === "processing";
  const isIndeterminate = transfer.phase === "preparing" || isProcessing || percent === null;

  return (
    <motion.li
      layout
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
      className={`pointer-events-auto rounded-2xl border bg-white/95 p-4 backdrop-blur-xl ${b.border200} [box-shadow:0_1px_1px_rgba(0,0,0,0.04),0_8px_16px_-4px_rgba(0,0,0,0.08),0_24px_48px_-12px_rgba(0,0,0,0.14)]`}
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${b.bg100} ${b.text600}`}>
          {transfer.phase === "uploading" ? <UploadCloud className="h-4 w-4" /> : transfer.phase === "downloading" ? <Download className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-slate-800">{transfer.label}</p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500" data-testid="transfer-status">
            {transferStatusText(transfer)}
          </p>
        </div>

        <button
          type="button"
          onClick={transfer.cancel}
          disabled={isProcessing}
          aria-label={`Cancelar: ${transfer.label}`}
          title={isProcessing ? "Ya no se puede cancelar: el servidor está procesando los archivos." : transfer.kind === "download" ? "Cancelar la descarga" : "Cancelar el envío"}
          className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        role="progressbar"
        aria-label={transfer.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isIndeterminate ? undefined : (percent ?? 0)}
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className={`h-full rounded-full bg-current ${b.icon500} ${isIndeterminate && !reduceMotion ? "animate-pulse" : ""}`}
          style={{ width: isIndeterminate ? "100%" : `${percent}%`, transition: reduceMotion ? "none" : "width 200ms ease-out" }}
        />
      </div>
    </motion.li>
  );
}

export default function TransferDock() {
  const transfers = useTransferStore((s) => s.transfers);
  const [now, setNow] = useState(() => Date.now());

  // El reloj solo corre mientras haya subidas: sin ellas no hay temporizador.
  const hasTransfers = transfers.length > 0;
  useEffect(() => {
    if (!hasTransfers) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, [hasTransfers]);

  const visible = transfers.filter((t) => now - t.startedAt >= SHOW_AFTER_MS);
  if (visible.length === 0) return null;

  return (
    <ul
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[9998] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2.5 sm:w-96"
    >
      <AnimatePresence initial={false}>
        {visible.map((transfer) => (
          <TransferCard key={transfer.id} transfer={transfer} />
        ))}
      </AnimatePresence>
    </ul>
  );
}
