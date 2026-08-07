import { describe, it, expect } from "vitest";
import { ProjectStatus } from "@/types";
import type { Project } from "@/types";
import {
  COMMITTED_STATUSES,
  computeDashboardSummary,
  computePipelineHealth,
  daysBetween,
  STALLED_THRESHOLD_DAYS,
  TERMINAL_STATUSES,
} from "@/utils/dashboardSummary";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "PRJ-001",
    title: "Test",
    type: "INFRAESTRUCTURA",
    status: ProjectStatus.CREADO,
    createdDate: "2026-07-01",
    materials: [],
    estimatedTotal: 1000,
    location: "Ciudad A",
    description: "",
    ...overrides,
  } as Project;
}

function makeWinner(overrides: Partial<NonNullable<Project["proposals"]>[number]> = {}) {
  return {
    id: "prop-1",
    contractorCode: "C-1",
    contractorName: "Constructora Uno",
    totalCost: 500,
    deliveryWeeks: 8,
    negotiatedAdvancePercent: 20,
    materialCost: 300,
    laborCost: 200,
    description: "",
    ...overrides,
  } as NonNullable<Project["proposals"]>[number];
}

describe("daysBetween", () => {
  it("devuelve 0 para fechas futuras o inválidas", () => {
    expect(daysBetween("2099-01-01", new Date("2026-07-01"))).toBe(0);
    expect(daysBetween("no-date", new Date("2026-07-01"))).toBe(0);
  });

  it("calcula días transcurridos desde una fecha pasada", () => {
    expect(daysBetween("2026-07-01", new Date("2026-07-15T12:00:00"))).toBe(14);
  });
});

describe("computeDashboardSummary", () => {
  it("lista vacía: totales en cero, funnel completo con 9 estados y sin entradas secundarias", () => {
    const s = computeDashboardSummary([]);
    expect(s.totalProjects).toBe(0);
    expect(s.totalApprovedInvestment).toBe(0);
    expect(s.totalReleasedFunds).toBe(0);
    expect(s.pendingFunds).toBe(0);
    expect(s.releasedPercent).toBe(0);
    expect(s.excessReleased).toBe(0);
    expect(s.funnel.map((f) => f.status)).toEqual([
      "CREADO",
      "REVISADO_CIERRE",
      "CONFIRMADO_PROCURA",
      "COMPARATIVA_ENVIADA",
      "CONTRATADO",
      "EN_EJECUCION",
      "VERIFICANDO_FINALIZACION",
      "LISTO_PAGO_FINAL",
      "COMPLETADO_PAGADO",
    ]);
    expect(s.funnel.every((f) => f.count === 0 && f.approvedAmount === 0)).toBe(true);
    expect(s.typeBreakdown).toEqual([]);
    expect(s.locationBreakdown).toEqual([]);
    expect(s.monthlyTrend).toEqual([]);
    expect(s.topContractors).toEqual([]);
    expect(s.stalledProjects).toEqual([]);
    expect(s.negotiationMetrics).toEqual({ avgAdvancePercent: 0, avgDeliveryWeeks: 0 });
  });

  it("agrega aprobado/liberado y desglose por tipo/ubicación/mes", () => {
    const projects = [
      makeProject({
        id: "P1",
        type: "INFRAESTRUCTURA",
        approvedInvestmentAmount: 1000,
        advancePaidAmount: 300,
        finalPaidAmount: 200,
        location: "Ciudad A",
        createdDate: "2026-05-10",
      }),
      makeProject({
        id: "P2",
        type: "MANTENIMIENTO",
        approvedInvestmentAmount: 2000,
        advancePaidAmount: 500,
        location: "Ciudad B",
        createdDate: "2026-06-15",
      }),
    ];
    const s = computeDashboardSummary(projects);
    expect(s.totalProjects).toBe(2);
    expect(s.totalApprovedInvestment).toBe(3000);
    expect(s.totalReleasedFunds).toBe(1000);
    expect(s.pendingFunds).toBe(2000);
    expect(s.typeBreakdown).toEqual([
      { type: "INFRAESTRUCTURA", count: 1, approvedAmount: 1000 },
      { type: "MANTENIMIENTO", count: 1, approvedAmount: 2000 },
    ]);
    expect(s.locationBreakdown).toEqual([
      { location: "Ciudad B", count: 1, approvedAmount: 2000 },
      { location: "Ciudad A", count: 1, approvedAmount: 1000 },
    ]);
    expect(s.monthlyTrend).toEqual([
      { month: "2026-05", count: 1 },
      { month: "2026-06", count: 1 },
    ]);
  });

  it("suma lo comprometido de la propuesta ganadora y las métricas de negociación", () => {
    const projects = [
      makeProject({
        id: "P1",
        status: ProjectStatus.CONTRATADO,
        approvedInvestmentAmount: 1000,
        proposals: [makeWinner({ totalCost: 500, negotiatedAdvancePercent: 20, deliveryWeeks: 8 })],
        selectedProposalId: "prop-1",
      }),
      makeProject({
        id: "P2",
        status: ProjectStatus.EN_EJECUCION,
        approvedInvestmentAmount: 2000,
        proposals: [makeWinner({ id: "prop-2", totalCost: 700, negotiatedAdvancePercent: 10, deliveryWeeks: 12 })],
        selectedProposalId: "prop-2",
      }),
      makeProject({ id: "P3", status: ProjectStatus.CREADO, approvedInvestmentAmount: 500 }), // sin ganador
    ];
    const s = computeDashboardSummary(projects);
    expect(s.totalCommittedAmount).toBe(1200);
    expect(s.negotiationMetrics).toEqual({ avgAdvancePercent: 15, avgDeliveryWeeks: 10 });

    const contratado = s.funnel.find((f) => f.status === "CONTRATADO")!;
    expect(contratado.count).toBe(1);
    expect(contratado.approvedAmount).toBe(1000);
    expect(contratado.committedAmount).toBe(500);
  });

  it("top contratistas: top 5 ordenados por monto", () => {
    const projects = Array.from({ length: 6 }, (_, i) =>
      makeProject({
        id: `P${i}`,
        status: ProjectStatus.EN_EJECUCION,
        approvedInvestmentAmount: 100,
        proposals: [
          makeWinner({
            id: `prop-${i}`,
            contractorCode: `C-${i}`,
            contractorName: `Contratista ${i}`,
            totalCost: (i + 1) * 100,
          }),
        ],
        selectedProposalId: `prop-${i}`,
      })
    );
    const s = computeDashboardSummary(projects);
    expect(s.topContractors).toHaveLength(5);
    expect(s.topContractors[0].contractorCode).toBe("C-5");
    expect(s.topContractors[0].totalAmount).toBe(600);
    expect(s.topContractors[4].contractorCode).toBe("C-1");
  });

  it("marca estancados tras STALLED_THRESHOLD_DAYS sin actividad y omite completados", () => {
    const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
    const projects = [
      makeProject({
        id: "stalled",
        status: ProjectStatus.EN_EJECUCION,
        createdDate: daysAgo(30).slice(0, 10),
        updatedAt: daysAgo(STALLED_THRESHOLD_DAYS),
      }),
      makeProject({
        id: "recent",
        status: ProjectStatus.EN_EJECUCION,
        createdDate: daysAgo(2).slice(0, 10),
        updatedAt: daysAgo(1),
      }),
      makeProject({ id: "done", status: ProjectStatus.COMPLETADO_PAGADO, createdDate: daysAgo(400).slice(0, 10) }),
    ];
    const s = computeDashboardSummary(projects);
    expect(s.stalledProjects.map((p) => p.id)).toEqual(["stalled"]);
    expect(s.stalledProjects[0].daysSinceUpdate).toBe(STALLED_THRESHOLD_DAYS);
  });

  it("calcula excessReleased cuando lo liberado supera lo aprobado", () => {
    const projects = [
      makeProject({ approvedInvestmentAmount: 100, advancePaidAmount: 60, finalPaidAmount: 60 }),
    ];
    const s = computeDashboardSummary(projects);
    expect(s.totalReleasedFunds).toBe(120);
    expect(s.excessReleased).toBe(20);
    expect(s.pendingFunds).toBe(0);
  });

  it("usa estimatedTotal como respaldo sin approvedInvestmentAmount", () => {
    const s = computeDashboardSummary([makeProject({ estimatedTotal: 500, approvedInvestmentAmount: undefined })]);
    expect(s.totalApprovedInvestment).toBe(500);
  });

  it("expone la semántica de estados comprometidos", () => {
    expect([...COMMITTED_STATUSES]).toEqual(
      expect.arrayContaining(["CONTRATADO", "EN_EJECUCION", "VERIFICANDO_FINALIZACION", "LISTO_PAGO_FINAL"])
    );
  });
});

describe("computePipelineHealth", () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

  it("excluye estados terminales (CREADO y COMPLETADO_PAGADO)", () => {
    const projects = [
      makeProject({ id: "P1", status: ProjectStatus.CREADO, createdDate: daysAgo(30).slice(0, 10) }),
      makeProject({ id: "P2", status: ProjectStatus.COMPLETADO_PAGADO, createdDate: daysAgo(30).slice(0, 10) }),
      makeProject({ id: "P3", status: ProjectStatus.EN_EJECUCION, createdDate: daysAgo(2).slice(0, 10) }),
    ];
    const stages = computePipelineHealth(projects);
    expect(stages).toHaveLength(1);
    expect(stages[0].status).toBe(ProjectStatus.EN_EJECUCION);
    expect(stages[0].count).toBe(1);
  });

  it("cuenta obras estancadas por antigüedad de updatedAt (fallback createdDate)", () => {
    const projects = [
      makeProject({
        id: "stalled",
        status: ProjectStatus.EN_EJECUCION,
        createdDate: daysAgo(30).slice(0, 10),
        updatedAt: daysAgo(STALLED_THRESHOLD_DAYS),
      }),
      makeProject({
        id: "recent",
        status: ProjectStatus.EN_EJECUCION,
        createdDate: daysAgo(2).slice(0, 10),
        updatedAt: daysAgo(1),
      }),
    ];
    const stages = computePipelineHealth(projects);
    const stage = stages.find((s) => s.status === ProjectStatus.EN_EJECUCION)!;
    expect(stage.count).toBe(2);
    expect(stage.stalledCount).toBe(1);
    expect(stage.maxDaysSinceUpdate).toBe(STALLED_THRESHOLD_DAYS);
  });

  it("ordena por obras estancadas desc, luego por volumen", () => {
    const projects = [
      makeProject({ id: "A", status: ProjectStatus.REVISADO_CIERRE, createdDate: daysAgo(20).slice(0, 10) }),
      makeProject({ id: "B", status: ProjectStatus.REVISADO_CIERRE, createdDate: daysAgo(20).slice(0, 10) }),
      makeProject({ id: "C", status: ProjectStatus.CONFIRMADO_PROCURA, createdDate: daysAgo(3).slice(0, 10) }),
      makeProject({ id: "D", status: ProjectStatus.CONFIRMADO_PROCURA, createdDate: daysAgo(3).slice(0, 10) }),
      makeProject({ id: "E", status: ProjectStatus.CONFIRMADO_PROCURA, createdDate: daysAgo(3).slice(0, 10) }),
    ];
    const stages = computePipelineHealth(projects);
    // REVISADO_CIERRE tiene 2 estancadas; CONFIRMADO_PROCURA tiene 3 obras pero 0 estancadas
    expect(stages[0].status).toBe(ProjectStatus.REVISADO_CIERRE);
    expect(stages[0].stalledCount).toBe(2);
  });

  it("expone los estados terminales", () => {
    expect([...TERMINAL_STATUSES]).toEqual(
      expect.arrayContaining([ProjectStatus.CREADO, ProjectStatus.COMPLETADO_PAGADO])
    );
  });
});
