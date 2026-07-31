import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { ProjectStatus } from "@/types";
import type { DashboardSummary, Project } from "@/types";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";

const mockUsePolling = vi.fn();
vi.mock("@/hooks/usePolling", () => ({
  usePolling: (...args: unknown[]) => mockUsePolling(...args),
}));

const mockUseAuth = vi.fn(() => ({ authToken: "token" }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

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

const serverSummary: DashboardSummary = {
  totalProjects: 7,
  totalApprovedInvestment: 1000,
  totalReleasedFunds: 400,
  totalCommittedAmount: 300,
  pendingFunds: 600,
  releasedPercent: 40,
  excessReleased: 0,
  funnel: [],
  typeBreakdown: [],
  locationBreakdown: [],
  monthlyTrend: [],
  topContractors: [],
  stalledProjects: [],
  negotiationMetrics: { avgAdvancePercent: 15, avgDeliveryWeeks: 8 },
  updatedAt: "2026-07-31T12:00:00.000000Z",
};

describe("useDashboardSummary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUsePolling.mockClear();
    mockApiFetch.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("con fetch exitoso usa el summary del servidor (isExact) y registra lastSync", async () => {
    mockApiFetch.mockResolvedValue(serverSummary);

    const { result } = renderHook(() => useDashboardSummary([makeProject()]));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/dashboard/summary", { token: "token" });
    expect(result.current.summary).toEqual(serverSummary);
    expect(result.current.isExact).toBe(true);
    expect(result.current.lastSync).not.toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("con fetch fallido cae al cálculo cliente y no marca isExact", async () => {
    mockApiFetch.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useDashboardSummary([makeProject({ estimatedTotal: 2500 })]));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isExact).toBe(false);
    expect(result.current.summary.totalProjects).toBe(1);
    expect(result.current.summary.totalApprovedInvestment).toBe(2500);
    expect(result.current.lastSync).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("sin authToken no consulta el endpoint y usa fallback cliente", async () => {
    mockUseAuth.mockReturnValueOnce({ authToken: "" });

    const { result } = renderHook(() => useDashboardSummary([makeProject()]));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(result.current.summary.totalProjects).toBe(1);
    expect(result.current.isExact).toBe(false);
  });

  it("activa polling de 25s cuando hay authToken", async () => {
    mockApiFetch.mockResolvedValue(serverSummary);

    renderHook(() => useDashboardSummary([makeProject()]));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockUsePolling).toHaveBeenCalledWith(expect.any(Function), 25_000, true);
  });
});
