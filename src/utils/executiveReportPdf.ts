/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Reporte ejecutivo consolidado de Presidencia — vista imprimible con
 * KPIs, funnel, flujo de caja, top contratistas, inversión por ubicación
 * y obras estancadas, en un único PDF (vía window.print(), mismo mecanismo
 * que ExportButton para no introducir una dependencia nueva de PDF).
 */

import type { DashboardSummary, Project } from "@/types";
import { formatCurrency, STATUS_LABELS } from "@/utils";
import { computeMonthlyCashFlow } from "@/utils/dashboardSummary";

export const EXECUTIVE_REPORT_ROOT_ID = "executive-report-print-root";

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

function section(title: string, body: string): string {
  return `<section class="report-section"><h2>${escapeXml(title)}</h2>${body}</section>`;
}

function table(headers: string[], rows: (string | number)[][], rightAlignFrom = 1): string {
  if (rows.length === 0) return `<p class="report-empty">Sin datos disponibles.</p>`;
  const thead = `<tr>${headers.map((h, i) => `<th class="${i >= rightAlignFrom ? "num" : ""}">${escapeXml(h)}</th>`).join("")}</tr>`;
  const tbody = rows
    .map((row) => `<tr>${row.map((cell, i) => `<td class="${i >= rightAlignFrom ? "num" : ""}">${escapeXml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

export interface PrintExecutiveReportParams {
  summary: DashboardSummary;
  projects: Project[];
  auditLogsCount: number;
  isExact: boolean;
}

export function printExecutiveReport({ summary, projects, auditLogsCount, isExact }: PrintExecutiveReportParams): void {
  document.getElementById(EXECUTIVE_REPORT_ROOT_ID)?.remove();

  const generatedAt = new Date().toLocaleString("es-VE", { dateStyle: "long", timeStyle: "short" });
  const cashFlow = computeMonthlyCashFlow(projects);

  const kpis: [string, string][] = [
    ["Obras totales", summary.totalProjects.toLocaleString("en-US")],
    ["Inversión aprobada", money(summary.totalApprovedInvestment)],
    ["Fondos liquidados", money(summary.totalReleasedFunds)],
    ["Monto comprometido", money(summary.totalCommittedAmount)],
    ["Fondos pendientes", money(summary.pendingFunds)],
    ["% liberado sobre aprobado", `${summary.releasedPercent}%`],
    ["Registros de auditoría", auditLogsCount.toLocaleString("en-US")],
  ];

  const kpiCards = kpis
    .map(([label, value]) => `<div class="kpi-card"><span class="kpi-label">${escapeXml(label)}</span><span class="kpi-value">${escapeXml(value)}</span></div>`)
    .join("");

  const funnelTable = table(
    ["Estado", "Obras", "Aprobado", "Comprometido"],
    summary.funnel.map((f) => [STATUS_LABELS[f.status] ?? f.status, f.count, money(f.approvedAmount), money(f.committedAmount)]),
  );

  const cashFlowTable = table(
    ["Mes", "Anticipos", "Finiquitos", "Total"],
    cashFlow.map((m) => [m.month, money(m.advances), money(m.finals), money(m.total)]),
  );

  const contractorsTable = table(
    ["Contratista", "Obras adjudicadas", "Monto total"],
    summary.topContractors.map((c) => [c.contractorName, c.projectCount, money(c.totalAmount)]),
  );

  const locationTable = table(
    ["Ubicación", "Obras", "Inversión aprobada"],
    summary.locationBreakdown.map((l) => [l.location, l.count, money(l.approvedAmount)]),
  );

  const stalledTable = table(
    ["Obra", "Estado", "Días sin actividad"],
    summary.stalledProjects.map((s) => [`${s.id} — ${s.title}`, STATUS_LABELS[s.status] ?? s.status, s.daysSinceUpdate]),
    2,
  );

  const root = document.createElement("div");
  root.id = EXECUTIVE_REPORT_ROOT_ID;
  root.innerHTML = `
    <style>
      #${EXECUTIVE_REPORT_ROOT_ID} { display: none; }
      @media print {
        body > *:not(#${EXECUTIVE_REPORT_ROOT_ID}) { display: none !important; }
        #${EXECUTIVE_REPORT_ROOT_ID} {
          display: block !important;
          font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
          color: #0f172a;
          padding: 20px;
        }
        #${EXECUTIVE_REPORT_ROOT_ID} .report-header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px; }
        #${EXECUTIVE_REPORT_ROOT_ID} h1 { font-size: 18px; margin: 0 0 2px; letter-spacing: -0.01em; }
        #${EXECUTIVE_REPORT_ROOT_ID} .report-subtitle { font-size: 11px; color: #475569; margin: 0; }
        #${EXECUTIVE_REPORT_ROOT_ID} .report-badge { font-size: 10px; color: #b45309; font-weight: bold; }
        #${EXECUTIVE_REPORT_ROOT_ID} .report-section { margin-bottom: 18px; page-break-inside: avoid; }
        #${EXECUTIVE_REPORT_ROOT_ID} .report-section h2 {
          font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em;
          color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 0 0 8px;
        }
        #${EXECUTIVE_REPORT_ROOT_ID} .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        #${EXECUTIVE_REPORT_ROOT_ID} .kpi-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; }
        #${EXECUTIVE_REPORT_ROOT_ID} .kpi-label { display: block; font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
        #${EXECUTIVE_REPORT_ROOT_ID} .kpi-value { display: block; font-size: 14px; font-weight: 800; margin-top: 2px; }
        #${EXECUTIVE_REPORT_ROOT_ID} table { width: 100%; border-collapse: collapse; font-size: 10px; }
        #${EXECUTIVE_REPORT_ROOT_ID} thead th {
          background: #1e293b; color: #fff; text-align: left; padding: 5px 8px;
          font-size: 9px; text-transform: uppercase; letter-spacing: 0.03em; border: 1px solid #1e293b;
        }
        #${EXECUTIVE_REPORT_ROOT_ID} tbody td { border: 1px solid #cbd5e1; padding: 4px 8px; }
        #${EXECUTIVE_REPORT_ROOT_ID} tbody tr:nth-child(even) { background: #f8fafc; }
        #${EXECUTIVE_REPORT_ROOT_ID} .num { text-align: right; font-variant-numeric: tabular-nums; }
        #${EXECUTIVE_REPORT_ROOT_ID} .report-empty { font-size: 10px; color: #94a3b8; font-style: italic; }
      }
    </style>
    <div class="report-header">
      <h1>Reporte Ejecutivo — Presidencia</h1>
      <p class="report-subtitle">Generado el ${escapeXml(generatedAt)}</p>
      ${!isExact ? `<p class="report-badge">Datos parciales (sin backend) — cálculo estimado en cliente.</p>` : ""}
    </div>
    ${section("Indicadores clave", `<div class="kpi-grid">${kpiCards}</div>`)}
    ${section("Funnel de estados", funnelTable)}
    ${section("Flujo de caja mensual (últimos 12 meses con desembolsos)", cashFlowTable)}
    ${section("Top contratistas por monto adjudicado", contractorsTable)}
    ${section("Inversión por ubicación", locationTable)}
    ${section("Obras estancadas", stalledTable)}
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
