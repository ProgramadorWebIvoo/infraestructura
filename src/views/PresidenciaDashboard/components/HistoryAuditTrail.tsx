/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Traza narrativa de lo que hizo Auditoría en una obra — no una tabla
 * compacta, sino cada paso en orden (fecha, persona, rol, acción y el
 * detalle/observaciones completos sin truncar). La fuente es siempre
 * AuditLog, ya cargado en `detail.timeline`: este componente solo lo
 * renderiza distinto, nunca vuelve a pedirlo ni lo recalcula.
 */

import StatusBadge from "@/components/UI/StatusBadge";
import EmptyState from "@/components/UI/EmptyState";
import { ShieldCheck } from "lucide-react";
import type { HistoryTimelineEvent } from "../projectHistoryTypes";

function fmt(at: string | null): string {
  if (!at) return "—";
  const [date, time] = at.split("T");
  return `${date} · ${time?.slice(0, 5) ?? ""}`;
}

export default function HistoryAuditTrail({ events }: { events: HistoryTimelineEvent[] }) {
  if (events.length === 0) {
    return <EmptyState message="Auditoría no ha registrado acciones en esta obra todavía." icon={<ShieldCheck className="h-8 w-8" />} />;
  }

  return (
    <ol className="relative border-l-2 border-slate-200 ml-1.5 space-y-5">
      {events.map((e) => (
        <li key={e.id} className="relative pl-6">
          <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-sky-500 ring-4 ring-white" aria-hidden="true" />
          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[11px] font-mono font-bold text-text-tertiary">{fmt(e.at)}</span>
              <StatusBadge code={e.role} isRole />
              <span className="text-xs font-semibold text-text-primary">{e.user ?? "Sistema"}</span>
            </div>
            <p className="text-sm font-bold text-text-primary">{e.action}</p>
            {e.details && <p className="text-xs text-text-secondary mt-1">{e.details}</p>}
            {e.observations && <p className="text-xs text-text-tertiary italic mt-1">Observaciones: {e.observations}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
