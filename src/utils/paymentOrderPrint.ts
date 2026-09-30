/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Orden de pago imprimible (F4 Bloque B, D16): sin librería de PDF en
 * backend ni frontend — misma técnica que executiveReportPdf.ts
 * (window.print() sobre una vista inyectada y oculta salvo en @media print).
 */

import type { PaymentOrder, PaymentOrderStatus } from "@/types";
import { formatCurrency } from "@/utils";
import { PAYMENT_MODE_LABELS, RATE_SOURCE_LABELS, formatPaidAmount, formatRate, BS_CURRENCY } from "@/utils/paymentSettlement";

export const PAYMENT_ORDER_PRINT_ROOT_ID = "payment-order-print-root";

const STATUS_LABELS: Record<PaymentOrderStatus, string> = {
  EN_FIRMA: "En firma",
  FIRMADA: "Firmada",
  PAGADA: "Pagada",
  ANULADA: "Anulada",
};

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(n: number): string {
  return formatCurrency(n);
}

/**
 * Total de la propuesta sobre el que se calculó la orden: el original en la
 * moneda de cotización cuando la propuesta se convirtió; si no, el total en
 * moneda base (órdenes anteriores a la obligación en moneda de cotización).
 */
function baseOfCalculation(proposal: NonNullable<PaymentOrder["snapshot"]>["proposal"]): string {
  if (proposal.total_cost_original != null) return formatPaidAmount(Number(proposal.total_cost_original), proposal.currency);
  return money(Number(proposal.total_cost));
}

/** Sección "Pago realizado" de la orden impresa — solo si la orden ya se pagó y tiene liquidación registrada. */
function paymentSectionHtml(order: PaymentOrder): string {
  const p = order.payment;
  if (!p || p.paymentMode === null || p.paidAmount === null || p.paidCurrency === null || p.obligationCurrency === null) return "";

  const rateUnit = p.paidCurrency === BS_CURRENCY ? "Bs." : p.paidCurrency;
  const lines = [
    ["Pagado", `${formatPaidAmount(p.paidAmount, p.paidCurrency)} (${PAYMENT_MODE_LABELS[p.paymentMode]})`],
    p.paidCurrency !== p.obligationCurrency && p.appliedRate !== null
      ? ["Tasa aplicada", `1 ${p.obligationCurrency} = ${formatRate(p.appliedRate)} ${rateUnit}${p.appliedRateSource ? ` (${RATE_SOURCE_LABELS[p.appliedRateSource]})` : ""}${p.suggestedRate !== null && p.suggestedRate !== p.appliedRate ? ` · sugerida ${formatRate(p.suggestedRate)}` : ""}`]
      : null,
    p.coveredAmount !== null ? ["Equivalente cubierto", formatPaidAmount(p.coveredAmount, p.obligationCurrency)] : null,
    p.differenceAmount !== null && p.differenceAmount !== 0 ? ["Diferencia", `${formatPaidAmount(p.differenceAmount, p.obligationCurrency)}${p.differenceReason ? ` — ${p.differenceReason}` : ""}`] : null,
    p.contractRateFreeze?.frozenRate != null ? ["Tasa congelada de la cotización", `1 ${p.contractRateFreeze.frozenCurrency ?? p.contractRateFreeze.baseCurrency} = ${formatRate(p.contractRateFreeze.frozenRate)} Bs.`] : null,
    p.paymentRateFreeze?.frozenRate != null ? ["Tasa congelada del pago", `1 ${p.paymentRateFreeze.frozenCurrency ?? p.paymentRateFreeze.baseCurrency} = ${formatRate(p.paymentRateFreeze.frozenRate)} Bs.`] : null,
    p.paidDate || p.bank || p.reference ? ["Fecha / banco / referencia", [p.paidDate, p.bank, p.reference].filter(Boolean).join(" · ")] : null,
  ].filter((line): line is string[] => line !== null);

  return `
    <div class="order-section">
      <h2>Pago realizado</h2>
      <div class="order-grid">
        ${lines.map(([label, value]) => `
        <div class="order-field">
          <span class="order-field-label">${escapeXml(label)}</span>
          <span class="order-field-value">${escapeXml(value)}</span>
        </div>`).join("")}
      </div>
    </div>`;
}

export function printPaymentOrder(order: PaymentOrder): void {
  document.getElementById(PAYMENT_ORDER_PRINT_ROOT_ID)?.remove();

  const generatedAt = new Date().toLocaleString("es-VE", { dateStyle: "long", timeStyle: "short" });
  const createdAt = new Date(order.createdAt).toLocaleString("es-VE", { dateStyle: "long", timeStyle: "short" });
  const typeLabel = order.paymentType === "ADVANCE" ? "Anticipo" : "Finiquito";
  const contractor = order.snapshot?.contractor;
  const project = order.snapshot?.proposal;

  const root = document.createElement("div");
  root.id = PAYMENT_ORDER_PRINT_ROOT_ID;
  root.innerHTML = `
    <style>
      #${PAYMENT_ORDER_PRINT_ROOT_ID} { display: none; }
      @media print {
        body > *:not(#${PAYMENT_ORDER_PRINT_ROOT_ID}) { display: none !important; }
        #${PAYMENT_ORDER_PRINT_ROOT_ID} {
          display: block !important;
          font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
          color: #0f172a;
          padding: 24px;
        }
        #${PAYMENT_ORDER_PRINT_ROOT_ID} .order-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
        #${PAYMENT_ORDER_PRINT_ROOT_ID} h1 { font-size: 18px; margin: 0 0 2px; letter-spacing: -0.01em; }
        #${PAYMENT_ORDER_PRINT_ROOT_ID} .order-subtitle { font-size: 11px; color: #475569; margin: 0; }
        #${PAYMENT_ORDER_PRINT_ROOT_ID} .order-status { font-size: 11px; font-weight: bold; border: 1px solid #0f172a; border-radius: 4px; padding: 4px 10px; text-transform: uppercase; }
        #${PAYMENT_ORDER_PRINT_ROOT_ID} .order-section { margin-bottom: 18px; page-break-inside: avoid; }
        #${PAYMENT_ORDER_PRINT_ROOT_ID} .order-section h2 {
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;
          color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 0 0 8px;
        }
        #${PAYMENT_ORDER_PRINT_ROOT_ID} .order-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        #${PAYMENT_ORDER_PRINT_ROOT_ID} .order-field { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; }
        #${PAYMENT_ORDER_PRINT_ROOT_ID} .order-field-label { display: block; font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
        #${PAYMENT_ORDER_PRINT_ROOT_ID} .order-field-value { display: block; font-size: 13px; font-weight: 700; margin-top: 2px; }
        #${PAYMENT_ORDER_PRINT_ROOT_ID} .order-amount { font-size: 22px; font-weight: 900; }
        #${PAYMENT_ORDER_PRINT_ROOT_ID} .order-hash { font-family: monospace; font-size: 9px; color: #64748b; word-break: break-all; }
        #${PAYMENT_ORDER_PRINT_ROOT_ID} .order-footer { margin-top: 30px; font-size: 9px; color: #94a3b8; }
      }
    </style>
    <div class="order-header">
      <div>
        <h1>Orden de Pago #${escapeXml(order.number)} — ${escapeXml(typeLabel)}</h1>
        <p class="order-subtitle">Generada el ${escapeXml(createdAt)} · Impresa el ${escapeXml(generatedAt)}</p>
      </div>
      <span class="order-status">${escapeXml(STATUS_LABELS[order.status])}</span>
    </div>

    <div class="order-section">
      <h2>Proveedor</h2>
      <div class="order-grid">
        <div class="order-field">
          <span class="order-field-label">Razón social</span>
          <span class="order-field-value">${escapeXml(contractor?.name ?? order.contractorCode)}</span>
        </div>
        <div class="order-field">
          <span class="order-field-label">RIF / Código</span>
          <span class="order-field-value">${escapeXml(contractor?.rif ?? "—")} (${escapeXml(order.contractorCode)})</span>
        </div>
      </div>
    </div>

    <div class="order-section">
      <h2>Obra</h2>
      <div class="order-field">
        <span class="order-field-label">Obra</span>
        <span class="order-field-value">${escapeXml(order.snapshot?.project?.title ?? order.projectId)} (${escapeXml(order.projectId)})</span>
      </div>
    </div>

    <div class="order-section">
      <h2>Monto</h2>
      <div class="order-grid">
        <div class="order-field">
          <span class="order-field-label">Monto a pagar</span>
          <span class="order-field-value order-amount">${escapeXml(formatPaidAmount(order.amount, order.currency))}</span>
        </div>
        <div class="order-field">
          <span class="order-field-label">Base de cálculo</span>
          <span class="order-field-value">${project ? `${escapeXml(baseOfCalculation(project))} × ${escapeXml(project.negotiated_advance_percent)}%` : "Finiquito verificado por Auditoría"}</span>
        </div>${order.amountBase !== order.amount ? `
        <div class="order-field">
          <span class="order-field-label">Equivalente en moneda base</span>
          <span class="order-field-value">${escapeXml(money(order.amountBase))}${order.exchangeRate ? ` (tasa ${escapeXml(formatRate(order.exchangeRate))})` : ""}</span>
        </div>` : ""}
      </div>
    </div>

    ${paymentSectionHtml(order)}

    <div class="order-section">
      <h2>Trazabilidad</h2>
      <div class="order-grid">
        <div class="order-field">
          <span class="order-field-label">Elaborado por</span>
          <span class="order-field-value">${escapeXml(order.elaboratedByName ?? "—")}</span>
        </div>
        <div class="order-field">
          <span class="order-field-label">Hash de integridad</span>
          <span class="order-hash">${escapeXml(order.contentHash)}</span>
        </div>
      </div>
    </div>

    <p class="order-footer">Documento generado por IVOO Gestión Infraestructura. El contenido de esta orden queda fijado al crearse; cualquier corrección exige anularla y generar una nueva.</p>
  `;
  document.body.appendChild(root);

  window.print();

  const cleanup = () => {
    window.onafterprint = null;
    root.remove();
  };
  window.onafterprint = cleanup;
  window.setTimeout(cleanup, 60_000);
}
