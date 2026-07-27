import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useProjectFinancials } from "@/hooks/useProjectFinancials";
import { ProjectStatus } from "@/types";
import type { Project } from "@/types";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "PRJ-001",
    title: "Test",
    type: "INFRAESTRUCTURA",
    status: ProjectStatus.CREADO,
    createdDate: "2026-07-01",
    materials: [],
    estimatedTotal: 1000,
    location: "",
    ...overrides,
  } as Project;
}

describe("useProjectFinancials", () => {
  it("con lista vacía retorna todo en cero (sin dividir por 0)", () => {
    const { result } = renderHook(() => useProjectFinancials([]));
    expect(result.current).toEqual({
      totalApprovedInvestment: 0,
      totalReleasedFunds: 0,
      pendingFunds: 0,
      releasedPercent: 0,
    });
  });

  it("usa approvedInvestmentAmount si existe, si no cae a estimatedTotal", () => {
    const projects = [
      makeProject({ estimatedTotal: 1000, approvedInvestmentAmount: 1500 }),
      makeProject({ estimatedTotal: 2000, approvedInvestmentAmount: undefined }),
    ];
    const { result } = renderHook(() => useProjectFinancials(projects));
    expect(result.current.totalApprovedInvestment).toBe(3500);
  });

  it("suma advancePaidAmount + finalPaidAmount como fondos liberados", () => {
    const projects = [
      makeProject({ estimatedTotal: 1000, advancePaidAmount: 300, finalPaidAmount: 700 }),
    ];
    const { result } = renderHook(() => useProjectFinancials(projects));
    expect(result.current.totalReleasedFunds).toBe(1000);
    expect(result.current.pendingFunds).toBe(0);
    expect(result.current.releasedPercent).toBe(100);
  });

  it("pendingFunds nunca es negativo aunque lo liberado supere lo aprobado", () => {
    const projects = [
      makeProject({ estimatedTotal: 100, advancePaidAmount: 100, finalPaidAmount: 100 }),
    ];
    const { result } = renderHook(() => useProjectFinancials(projects));
    expect(result.current.pendingFunds).toBe(0);
  });
});
