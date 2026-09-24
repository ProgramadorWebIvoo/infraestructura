/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Paneles del detalle del Histórico de Obras — etapas de planificación y
 * compra: presupuesto, solicitud, proveedores y adjudicación.
 */

import { Award, Repeat2 } from "lucide-react";
import { Table, type Column } from "@/components/UI/Table";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import type { HistoryAward, HistoryBudgetLine, HistorySupplier, ProjectHistoryDetail } from "../projectHistoryTypes";
import { fmtMoney } from "./ProjectHistoryFigures";

const mono = (n: number | null) => <span className="font-mono">{fmtMoney(n)}</span>;

const budgetColumns: Column<HistoryBudgetLine>[] = [
  { key: "name", label: "Producto", render: (l) => (
    <div>
      <p className="text-xs font-semibold text-text-primary">{l.name}</p>
      <p className="text-[11px] text-text-tertiary">{l.catalogProduct ? `Catálogo: ${l.catalogProduct.name}` : "Sin producto de catálogo"}</p>
    </div>
  ) },
  { key: "quantity", label: "Cant.", align: "right", render: (l) => <span className="font-mono text-xs">{l.quantity} {l.unit ?? ""}</span> },
  { key: "price", label: "Precio est.", align: "right", render: (l) => mono(l.estimatedUnitPrice) },
  { key: "subtotal", label: "Subtotal", align: "right", render: (l) => mono(l.estimatedSubtotal) },
];

export function BudgetPanel({ detail }: { detail: ProjectHistoryDetail }) {
  const { budget, request, figures } = detail;
  const mismatch = figures.estimated !== null && Math.abs(figures.estimated - budget.linesTotal) > 0.01;

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div><dt className="text-text-tertiary">Solicitud creada</dt><dd className="font-semibold text-text-primary">{request.createdDate ?? "—"} · {request.createdBy ?? "—"}</dd></div>
        <div><dt className="text-text-tertiary">Evaluación IA del expediente</dt><dd className="font-semibold text-text-primary">{request.dossierAiScore !== null ? `${request.dossierAiScore}/100` : "Sin evaluar"}</dd></div>
        <div className="col-span-2"><dt className="text-text-tertiary">Notas de Cierre de Obra</dt><dd className="text-text-primary">{request.reviewNotes ?? "—"}</dd></div>
        <div className="col-span-2"><dt className="text-text-tertiary">Notas de Procura</dt><dd className="text-text-primary">{request.procuraNotes ?? "—"}</dd></div>
      </dl>

      <Table columns={budgetColumns} data={budget.lines} rowKey={(l) => l.id} emptyMessage="La obra no tiene líneas de presupuesto." />

      <p className="text-xs text-text-secondary text-right">
        Suma de líneas: <span className="font-mono font-bold">{fmtMoney(budget.linesTotal)}</span>
        {mismatch && (
          <span className={`ml-2 font-semibold ${SEMANTIC_COLOR_MAP.warning.text700}`}>
            (difiere del estimado registrado: {fmtMoney(figures.estimated)})
          </span>
        )}
      </p>
    </div>
  );
}

const supplierColumns: Column<HistorySupplier>[] = [
  { key: "contractor", label: "Proveedor", render: (s) => (
    <div>
      <p className="text-xs font-semibold text-text-primary">{s.contractorName ?? s.contractorCode}</p>
      <p className="text-[11px] text-text-tertiary font-mono">{s.contractorCode} · {s.fechaOferta ?? "—"}</p>
    </div>
  ) },
  { key: "origen", label: "Origen", render: (s) => <span className="text-xs">{s.origen ?? "—"}</span> },
  { key: "total", label: "Total", align: "right", render: (s) => (
    <div className="text-right">
      {mono(s.totalCost)}
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

export function SuppliersPanel({ suppliers, award }: { suppliers: HistorySupplier[]; award: HistoryAward | null }) {
  const info = SEMANTIC_COLOR_MAP.info;

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
          <p className="text-sm font-semibold text-text-primary">{award.contractorName ?? award.contractorCode} · {fmtMoney(award.totalCost)}</p>
          <p className="text-xs text-text-secondary">Anticipo negociado: {award.negotiatedAdvancePercent ?? "—"}% · Origen: {award.origen ?? "—"}</p>
          {award.rateFreezes.length > 0 && (
            <ul className="text-[11px] text-text-secondary space-y-0.5">
              {award.rateFreezes.map((f) => (
                <li key={f.trigger} className="font-mono">
                  {f.trigger}: tasa {f.frozenRate ?? "—"} · base {fmtMoney(f.frozenAmountBase)} ({f.source})
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
