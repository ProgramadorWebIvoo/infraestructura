/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Paneles del detalle del Histórico de Obras — etapas de planificación y
 * compra: presupuesto, solicitud, proveedores y adjudicación.
 */

import { BS_CURRENCY, formatPaidAmount } from "@/utils/paymentSettlement";
import { Award, Repeat2 } from "lucide-react";
import { Table, type Column } from "@/components/UI/Table";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { useCurrencyConversion, type UseCurrencyConversionReturn } from "@/hooks/useCurrencyConversion";
import BsAmount from "@/components/UI/BsAmount";
import ConvertedAmount from "@/components/UI/ConvertedAmount";
import FrozenRateBadge from "@/components/UI/FrozenRateBadge";
import type { RateFreeze } from "@/types";
import type { HistoryAward, HistoryBudgetLine, HistorySupplier, ProjectHistoryDetail } from "../projectHistoryTypes";
import { fmtMoney } from "./ProjectHistoryFigures";
import { HistoryDocumentsList } from "./HistoryDocumentsList";

const FREEZE_TRIGGER_LABEL: Record<string, string> = {
  CONTRATADO: "Solicitud de anticipo",
  PAGO_ANTICIPO: "Pago de anticipo",
  PAGO_FINIQUITO: "Pago de finiquito",
};

function mono(n: number | null, rates: UseCurrencyConversionReturn) {
  return (
    <span className="font-mono">
      {fmtMoney(n)}
      {n !== null && <BsAmount amount={n} convert={rates.convert} hasRates={rates.hasRates} isLoading={rates.isLoading} variant="inline" />}
    </span>
  );
}

function makeBudgetColumns(rates: UseCurrencyConversionReturn): Column<HistoryBudgetLine>[] {
  return [
    { key: "name", label: "Producto", render: (l) => (
      <div>
        <p className="text-xs font-semibold text-text-primary">{l.name}</p>
        <p className="text-[11px] text-text-tertiary">{l.catalogProduct ? `Catálogo: ${l.catalogProduct.name}` : "Sin producto de catálogo"}</p>
      </div>
    ) },
    { key: "quantity", label: "Cant.", align: "right", render: (l) => <span className="font-mono text-xs">{l.quantity} {l.unit ?? ""}</span> },
    { key: "price", label: "Precio est.", align: "right", render: (l) => mono(l.estimatedUnitPrice, rates) },
    { key: "subtotal", label: "Subtotal", align: "right", render: (l) => mono(l.estimatedSubtotal, rates) },
  ];
}

export function BudgetPanel({ detail, projectId, authToken }: { detail: ProjectHistoryDetail; projectId: string; authToken: string }) {
  const { budget, request, figures } = detail;
  const mismatch = figures.estimated !== null && Math.abs(figures.estimated - budget.linesTotal) > 0.01;
  const rates = useCurrencyConversion();
  const budgetColumns = makeBudgetColumns(rates);

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div><dt className="text-text-tertiary">Solicitud creada</dt><dd className="font-semibold text-text-primary">{request.createdDate ?? "—"} · {request.createdBy ?? "—"}</dd></div>
        <div><dt className="text-text-tertiary">Evaluación IA del expediente</dt><dd className="font-semibold text-text-primary">{request.dossierAiScore !== null ? `${request.dossierAiScore}/100` : "Sin evaluar"}</dd></div>
        <div className="col-span-2"><dt className="text-text-tertiary">Notas de Auditoría</dt><dd className="text-text-primary">{request.reviewNotes ?? "—"}</dd></div>
        <div className="col-span-2"><dt className="text-text-tertiary">Notas de Procura</dt><dd className="text-text-primary">{request.procuraNotes ?? "—"}</dd></div>
      </dl>

      <Table columns={budgetColumns} data={budget.lines} rowKey={(l) => l.id} emptyMessage="La obra no tiene líneas de presupuesto." />

      <p className="text-xs text-text-secondary text-right">
        Suma de líneas: <span className="font-mono font-bold">{fmtMoney(budget.linesTotal)}</span>
        <BsAmount amount={budget.linesTotal} convert={rates.convert} hasRates={rates.hasRates} isLoading={rates.isLoading} variant="inline" />
        {mismatch && (
          <span className={`ml-2 font-semibold ${SEMANTIC_COLOR_MAP.warning.text700}`}>
            (difiere del estimado registrado: {fmtMoney(figures.estimated)})
          </span>
        )}
      </p>

      <div>
        <p className="mb-2 text-xs font-bold uppercase text-text-secondary">Fotos y evidencia de reevaluación</p>
        <HistoryDocumentsList documents={request.documents ?? []} emptyMessage="Sin fotos de sitio ni evidencia de reevaluación adjuntas." projectId={projectId} authToken={authToken} />
      </div>
    </div>
  );
}

function makeSupplierColumns(rates: UseCurrencyConversionReturn): Column<HistorySupplier>[] {
  return [
    { key: "contractor", label: "Proveedor", render: (s) => (
      <div>
        <p className="text-xs font-semibold text-text-primary">{s.contractorName ?? s.contractorCode}</p>
        <p className="text-[11px] text-text-tertiary font-mono">{s.contractorCode} · {s.fechaOferta ?? "—"}</p>
      </div>
    ) },
    { key: "origen", label: "Origen", render: (s) => <span className="text-xs">{s.origen ?? "—"}</span> },
    { key: "total", label: "Total", align: "right", render: (s) => (
      <div className="text-right">
        <ConvertedAmount className="text-right" amountBase={s.totalCost} quoteCurrency={s.quoteCurrency} fxRateToBase={s.fxRateToBase} />
        {s.precioAnterior !== null && <p className="text-[10px] text-text-tertiary font-mono">antes {fmtMoney(s.precioAnterior)}</p>}
      </div>
    ) },
    { key: "state", label: "Estado", align: "center", render: (s) => {
      if (s.isAwarded) return <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${SEMANTIC_COLOR_MAP.success.text700}`}><Award className="h-3 w-3" aria-hidden="true" />Adjudicada</span>;
      if (s.replacedById) return <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary"><Repeat2 className="h-3 w-3" aria-hidden="true" />Renegociada</span>;
      if (s.isRemoved) return <span className="text-[11px] text-text-tertiary">Retirada</span>;
      return <span className="text-[11px] text-text-secondary">Vigente</span>;
    } },
  ];
}

export function SuppliersPanel({ suppliers, award }: { suppliers: HistorySupplier[]; award: HistoryAward | null }) {
  const info = SEMANTIC_COLOR_MAP.info;
  const rates = useCurrencyConversion();
  const supplierColumns = makeSupplierColumns(rates);

  return (
    <div className="space-y-4">
      <Table columns={supplierColumns} data={suppliers} rowKey={(s) => s.id} emptyMessage="La obra aún no recibió propuestas de proveedores." />

      {suppliers.filter((s) => s.motivo).map((s) => (
        <p key={s.id} className="text-xs text-text-secondary">
          <span className="font-semibold">{s.contractorName ?? s.contractorCode} · renegociación:</span> {s.motivo}
        </p>
      ))}

      {award ? (
        <div className={`rounded-2xl border p-4 space-y-2 ${info.bg50} ${info.border200}`}>
          <p className={`text-xs font-bold uppercase ${info.text700}`}>Adjudicación</p>
          <p className="text-sm font-semibold text-text-primary">
            {award.contractorName ?? award.contractorCode} ·{" "}
            <ConvertedAmount variant="inline" amountBase={award.totalCost} quoteCurrency={award.quoteCurrency} fxRateToBase={award.fxRateToBase} />
          </p>
          {award.quoteCurrency !== "USD" && award.fxRateToBase != null && (
            <p className="text-xs text-text-secondary">
              Tasa de cotización: <span className="font-mono font-bold">1 {award.quoteCurrency} = {award.fxRateToBase} USD-BCV</span>
            </p>
          )}
          <p className="text-xs text-text-secondary">Anticipo negociado: {award.negotiatedAdvancePercent ?? "—"}% · Origen: {award.origen ?? "—"}</p>
          {award.rateFreezes.length > 0 && (
            <ul className="space-y-1 text-[11px] text-text-secondary" aria-label="Tasas congeladas">
              {award.rateFreezes.map((f) => (
                <li key={f.trigger} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-bold uppercase tracking-wide text-text-tertiary">{FREEZE_TRIGGER_LABEL[f.trigger] ?? f.trigger}</span>
                  <FrozenRateBadge freeze={{ ...f, frozenAt: f.frozenAt ?? "" } as RateFreeze} />
                  {f.frozenAmount != null && f.frozenAmountBs != null && (
                    <span className="font-mono">{formatPaidAmount(f.frozenAmount, f.frozenCurrency)} → {formatPaidAmount(f.frozenAmountBs, BS_CURRENCY)}</span>
                  )}
                  {f.source === "MANUAL" && <span className="italic">(corrección manual)</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-xs text-text-tertiary">La obra aún no fue adjudicada.</p>
      )}
    </div>
  );
}
