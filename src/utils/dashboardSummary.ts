/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agregación del resumen ejecutivo de Presidencia a partir de Project[].
 *
 * Es el espejo cliente de DashboardSummaryController (backend). Se usa como
 * fallback cuando GET /api/dashboard/summary no está disponible (offline en
 * desarrollo) — el servidor es la fuente de verdad exacta, esta función solo
 * debe reflejar las mismas reglas para que el dashboard nunca muestre vacíos.
 */

import type { DashboardSummary, Project } from "../types";

/** Estados posteriores a la adjudicación (contrato firmado, aún no cerrado). */
export const COMMITTED_STATUSES: ReadonlySet<string> = new Set([
  "CONTRATADO",
  "EN_EJECUCION",
  "VERIFICANDO_FINALIZACION",
  "LISTO_PAGO_FINAL",
]);

/** Orden canónico del flujo, usado para ordenar el funnel. */
export const STATUS_ORDER: readonly string[] = [
  "CREADO",
  "REVISADO_CIERRE",
  "CONFIRMADO_PROCURA",
  "COMPARATIVA_ENVIADA",
  "CONTRATADO",
  "EN_EJECUCION",
  "VERIFICANDO_FINALIZACION",
  "LISTO_PAGO_FINAL",
  "COMPLETADO_PAGADO",
];

/** Umbral (días) sin actividad para considerar una obra "estancada". */
export const STALLED_THRESHOLD_DAYS = 14;

export function daysBetween(dateStr: string, from: Date = new Date()): number {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((from.getTime() - d.getTime()) / 86_400_000));
}

export function approvedOf(p: Project): number {
  return p.approvedInvestmentAmount ?? p.estimatedTotal ?? 0;
}

export function releasedOf(p: Project): number {
  return (p.advancePaidAmount ?? 0) + (p.finalPaidAmount ?? 0);
}

export function winnerOf(p: Project): NonNullable<Project["proposals"]>[number] | undefined {
  if (!p.proposals?.length) return undefined;
  return (
    p.proposals.find((prop) => prop.id === p.selectedProposalId) ??
    p.proposals.find((prop) => prop.contractorCode === p.selectedContractorCode)
  );
}

export function computeDashboardSummary(projects: Project[]): DashboardSummary {
  let totalApproved = 0;
  let totalReleased = 0;
  let totalCommitted = 0;
  let excessReleased = 0;

  const funnel = new Map<string, { count: number; approvedAmount: number; committedAmount: number }>();
  const typeBreakdown = new Map<string, { count: number; approvedAmount: number }>();
  const locationBreakdown = new Map<string, { count: number; approvedAmount: number }>();
  const monthlyTrend = new Map<string, number>();
  const topContractors = new Map<string, { contractorName: string; projectCount: number; totalAmount: number }>();
  const stalled: DashboardSummary["stalledProjects"] = [];
  const winningProposals: NonNullable<ReturnType<typeof winnerOf>>[] = [];

  projects.forEach((p) => {
    const approved = approvedOf(p);
    const released = releasedOf(p);
    const winner = winnerOf(p);

    totalApproved += approved;
    totalReleased += released;

    const f = funnel.get(p.status) ?? { count: 0, approvedAmount: 0, committedAmount: 0 };
    f.count += 1;
    f.approvedAmount += approved;
    funnel.set(p.status, f);

    const t = typeBreakdown.get(p.type) ?? { count: 0, approvedAmount: 0 };
    t.count += 1;
    t.approvedAmount += approved;
    typeBreakdown.set(p.type, t);

    const location = p.location || "Sin ubicación";
    const l = locationBreakdown.get(location) ?? { count: 0, approvedAmount: 0 };
    l.count += 1;
    l.approvedAmount += approved;
    locationBreakdown.set(location, l);

    const monthKey = p.createdDate?.slice(0, 7) || "Sin fecha";
    monthlyTrend.set(monthKey, (monthlyTrend.get(monthKey) ?? 0) + 1);

    if (winner) {
      winningProposals.push(winner);
      const c = topContractors.get(winner.contractorCode) ?? {
        contractorName: winner.contractorName,
        projectCount: 0,
        totalAmount: 0,
      };
      c.projectCount += 1;
      c.totalAmount += winner.totalCost;
      topContractors.set(winner.contractorCode, c);

      if (COMMITTED_STATUSES.has(p.status)) {
        totalCommitted += winner.totalCost;
      }
      f.committedAmount += winner.totalCost;
    }

    if (p.status !== "COMPLETADO_PAGADO") {
      const referenceDate = p.updatedAt ? p.updatedAt.slice(0, 10) : p.createdDate;
      const daysSinceUpdate = daysBetween(referenceDate);
      if (daysSinceUpdate >= STALLED_THRESHOLD_DAYS) {
        stalled.push({
          id: p.id,
          title: p.title,
          status: p.status,
          daysSinceUpdate,
          createdDate: p.createdDate,
        });
      }
    }
  });

  const funnelEntries = STATUS_ORDER.map((status) => {
    const data = funnel.get(status) ?? { count: 0, approvedAmount: 0, committedAmount: 0 };
    return { status, ...data };
  });

  const round = (n: number) => Math.round(n * 100) / 100;

  const topContractorsEntries = [...topContractors.entries()]
    .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
    .slice(0, 5)
    .map(([contractorCode, data]) => ({
      contractorCode,
      contractorName: data.contractorName,
      projectCount: data.projectCount,
      totalAmount: round(data.totalAmount),
    }));

  const locationEntries = [...locationBreakdown.entries()]
    .sort((a, b) => b[1].approvedAmount - a[1].approvedAmount)
    .slice(0, 8)
    .map(([location, data]) => ({
      location,
      count: data.count,
      approvedAmount: round(data.approvedAmount),
    }));

  const monthlyEntries = [...monthlyTrend.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));

  const stalledSorted = [...stalled]
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)
    .slice(0, 10);

  const avg = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0);

  return {
    totalProjects: projects.length,
    totalApprovedInvestment: round(totalApproved),
    totalReleasedFunds: round(totalReleased),
    totalCommittedAmount: round(totalCommitted),
    pendingFunds: round(Math.max(0, totalApproved - totalReleased)),
    releasedPercent: totalApproved > 0 ? round((totalReleased / totalApproved) * 100) : 0,
    excessReleased: round(Math.max(0, totalReleased - totalApproved)),
    funnel: funnelEntries,
    typeBreakdown: [...typeBreakdown.entries()].map(([type, data]) => ({
      type,
      count: data.count,
      approvedAmount: round(data.approvedAmount),
    })),
    locationBreakdown: locationEntries,
    monthlyTrend: monthlyEntries,
    topContractors: topContractorsEntries,
    stalledProjects: stalledSorted,
    negotiationMetrics: {
      avgAdvancePercent: round(avg(winningProposals.map((w) => w.negotiatedAdvancePercent))),
      avgDeliveryWeeks: round(avg(winningProposals.map((w) => w.deliveryWeeks))),
    },
  };
}
