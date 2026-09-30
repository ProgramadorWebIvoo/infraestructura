/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Paneles del detalle del Histórico de Obras — etapas de ejecución:
 * pagos, planos (con versiones), cierre y línea de tiempo de auditoría.
 */

import { CheckCircle2, Download, FileText, XCircle } from "lucide-react";
import { Table, type Column } from "@/components/UI/Table";
import StatusBadge from "@/components/UI/StatusBadge";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { useCurrencyConversion, type UseCurrencyConversionReturn } from "@/hooks/useCurrencyConversion";
import BsAmount from "@/components/UI/BsAmount";
import ConvertedAmount from "@/components/UI/ConvertedAmount";
import PaymentSettlementSummary from "@/components/PaymentOrder/PaymentSettlementSummary";
import type { HistoryAward, HistoryPayment, HistoryTimelineEvent, ProjectHistoryDetail } from "../projectHistoryTypes";
import { fmtMoney } from "./ProjectHistoryFigures";
import { HistoryDocumentsList, useHistoryDocumentDownload } from "./HistoryDocumentsList";

const PAYMENT_LABELS: Record<string, string> = { ADVANCE: "Anticipo", FINAL: "Finiquito" };

function makePaymentColumns(onDownload: (doc: { id: number; name: string }) => void, award: HistoryAward | null): Column<HistoryPayment>[] {
  return [
    { key: "type", label: "Tipo", render: (p) => <span className="text-xs font-semibold">{PAYMENT_LABELS[p.type] ?? p.type}</span> },
    { key: "paidDate", label: "Fecha", render: (p) => <span className="text-xs font-mono">{p.paidDate ?? "—"}</span> },
    { key: "amount", label: "Monto", align: "right", render: (p) => (
      <ConvertedAmount className="text-right text-xs" amountBase={p.amount} quoteCurrency={award?.quoteCurrency} fxRateToBase={award?.fxRateToBase} />
    ) },
    { key: "settlement", label: "Cómo se pagó", render: (p) => p.settlement
      ? <PaymentSettlementSummary settlement={p.settlement} variant="compact" />
      : <span className="text-[11px] italic text-text-tertiary">Sin detalle de moneda</span> },
    { key: "bank", label: "Banco / referencia", render: (p) => <span className="text-xs">{[p.bank, p.reference].filter(Boolean).join(" · ") || "—"}</span> },
    { key: "proof", label: "Comprobante", render: (p) => p.proof
      ? (
        <button
          type="button"
          onClick={() => onDownload(p.proof!)}
          aria-label={`Descargar comprobante ${p.proof.name}`}
          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${SEMANTIC_COLOR_MAP.success.text700} hover:underline cursor-pointer`}
        >
          <FileText className="h-3 w-3" aria-hidden="true" />{p.proof.name}
          <Download className="h-3 w-3" aria-hidden="true" />
        </button>
      )
      : <span className={`text-[11px] font-bold ${SEMANTIC_COLOR_MAP.danger.text700}`}>Sin comprobante</span> },
  ];
}

export function PaymentsPanel({ payments, award, projectId, authToken }: { payments: ProjectHistoryDetail["payments"]; award: HistoryAward | null; projectId: string; authToken: string }) {
  const onDownload = useHistoryDocumentDownload(projectId, authToken);
  const paymentColumns = makePaymentColumns(onDownload, award);

  return (
    <div className="space-y-3">
      <Table columns={paymentColumns} data={payments.items} rowKey={(p) => p.id} emptyMessage="Aún no hay pagos registrados." />
      <p className="text-xs text-text-secondary text-right">
        Total pagado:{" "}
        <span className="font-mono font-bold">
          <ConvertedAmount variant="inline" amountBase={payments.total} quoteCurrency={award?.quoteCurrency} fxRateToBase={award?.fxRateToBase} />
        </span>
        {payments.percentOfAwarded !== null && ` · ${payments.percentOfAwarded}% de lo adjudicado`}
      </p>
    </div>
  );
}

export function DrawingsClosurePanel({ drawings, closure, projectId, authToken }: Pick<ProjectHistoryDetail, "drawings" | "closure"> & { projectId: string; authToken: string }) {
  const ok = SEMANTIC_COLOR_MAP.success;
  const pending = SEMANTIC_COLOR_MAP.neutral;

  return (
    <div className="space-y-4">
      <HistoryDocumentsList documents={drawings} emptyMessage="La obra no tiene planos ni cálculos cargados." projectId={projectId} authToken={authToken} />

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
