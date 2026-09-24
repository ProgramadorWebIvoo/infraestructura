/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Paneles del detalle del Histórico de Obras — etapas de ejecución:
 * pagos, planos (con versiones), cierre y línea de tiempo de auditoría.
 */

import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { Table, type Column } from "@/components/UI/Table";
import StatusBadge from "@/components/UI/StatusBadge";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import type { HistoryDrawing, HistoryPayment, HistoryTimelineEvent, ProjectHistoryDetail } from "../projectHistoryTypes";
import { fmtMoney } from "./ProjectHistoryFigures";

const PAYMENT_LABELS: Record<string, string> = { ADVANCE: "Anticipo", FINAL: "Finiquito" };
const DRAWING_LABELS: Record<string, string> = { PLANO: "Plano", CALC: "Cálculo", CORRECCION: "Corrección" };

const paymentColumns: Column<HistoryPayment>[] = [
  { key: "type", label: "Tipo", render: (p) => <span className="text-xs font-semibold">{PAYMENT_LABELS[p.type] ?? p.type}</span> },
  { key: "paidDate", label: "Fecha", render: (p) => <span className="text-xs font-mono">{p.paidDate ?? "—"}</span> },
  { key: "amount", label: "Monto", align: "right", render: (p) => <span className="font-mono text-xs">{fmtMoney(p.amount)} {p.currency !== "USD" ? p.currency : ""}</span> },
  { key: "bank", label: "Banco / referencia", render: (p) => <span className="text-xs">{[p.bank, p.reference].filter(Boolean).join(" · ") || "—"}</span> },
  { key: "proof", label: "Comprobante", render: (p) => p.proof
    ? <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${SEMANTIC_COLOR_MAP.success.text700}`}><FileText className="h-3 w-3" aria-hidden="true" />{p.proof.name}</span>
    : <span className={`text-[11px] font-bold ${SEMANTIC_COLOR_MAP.danger.text700}`}>Sin comprobante</span> },
];

export function PaymentsPanel({ payments }: { payments: ProjectHistoryDetail["payments"] }) {
  return (
    <div className="space-y-3">
      <Table columns={paymentColumns} data={payments.items} rowKey={(p) => p.id} emptyMessage="Aún no hay pagos registrados." />
      <p className="text-xs text-text-secondary text-right">
        Total pagado: <span className="font-mono font-bold">{fmtMoney(payments.total)}</span>
        {payments.percentOfAwarded !== null && ` · ${payments.percentOfAwarded}% de lo adjudicado`}
      </p>
    </div>
  );
}

function DrawingCard({ drawing }: { drawing: HistoryDrawing }) {
  return (
    <li className="rounded-xl border border-slate-200/80 bg-white p-3">
      <p className="text-xs font-semibold text-text-primary">
        {DRAWING_LABELS[drawing.type] ?? drawing.type} · {drawing.name}
        <span className="ml-2 text-[11px] text-text-tertiary font-mono">vigente: V{drawing.currentVersion ?? "—"}</span>
      </p>
      <ol className="mt-1 space-y-0.5">
        {drawing.versions.map((v) => (
          <li key={v.id} className={`text-[11px] font-mono ${v.isDeleted ? "line-through text-text-tertiary" : "text-text-secondary"}`}>
            V{v.version} · {v.name} · {v.uploadedBy ?? "—"} · {v.uploadedAt?.slice(0, 10) ?? "—"}{v.isDeleted ? " (eliminada)" : ""}
          </li>
        ))}
      </ol>
    </li>
  );
}

export function DrawingsClosurePanel({ drawings, closure }: Pick<ProjectHistoryDetail, "drawings" | "closure">) {
  const ok = SEMANTIC_COLOR_MAP.success;
  const pending = SEMANTIC_COLOR_MAP.neutral;

  return (
    <div className="space-y-4">
      {drawings.length === 0 ? (
        <p className="text-xs text-text-tertiary">La obra no tiene planos ni cálculos cargados.</p>
      ) : (
        <ul className="space-y-2">{drawings.map((d) => <DrawingCard key={d.groupId} drawing={d} />)}</ul>
      )}

      <div className={`rounded-2xl border p-4 space-y-1 text-xs ${closure.isClosed ? `${ok.bg50} ${ok.border200}` : `${pending.bg50} ${pending.border200}`}`}>
        <p className="font-bold uppercase text-text-secondary">Cierre</p>
        <p className="flex items-center gap-1.5 text-text-primary">
          {closure.qualityVerified ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
          Calidad {closure.qualityVerified ? "verificada" : "sin verificar"}
          {closure.completionVerifiedDate && ` · finalización verificada el ${closure.completionVerifiedDate}`}
        </p>
        <p className="text-text-secondary">{closure.isClosed ? "Obra completada y pagada." : "Obra aún no cerrada."} Reevaluaciones: {closure.reevaluations}</p>
      </div>
    </div>
  );
}

const timelineColumns: Column<HistoryTimelineEvent>[] = [
  { key: "at", label: "Fecha", render: (e) => <span className="text-[11px] font-mono">{e.at?.slice(0, 16).replace("T", " ") ?? "—"}</span> },
  { key: "role", label: "Rol", render: (e) => <StatusBadge code={e.role} isRole /> },
  { key: "user", label: "Usuario", render: (e) => <span className="text-xs">{e.user ?? "Sistema"}</span> },
  { key: "action", label: "Acción", render: (e) => (
    <div>
      <p className="text-xs font-semibold text-text-primary">{e.action}</p>
      {(e.details || e.observations) && <p className="text-[11px] text-text-secondary">{[e.details, e.observations].filter(Boolean).join(" — ")}</p>}
    </div>
  ) },
];

export function TimelinePanel({ timeline }: { timeline: HistoryTimelineEvent[] }) {
  return <Table columns={timelineColumns} data={timeline} rowKey={(e) => e.id} emptyMessage="Sin eventos de auditoría registrados." />;
}
