import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ProjectStatus } from "@/types";
import type { DashboardSummary, Project } from "@/types";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";

vi.mock("@/hooks/usePollingSettings", () => ({
  usePollingSettings: () => ({ dashboardIntervalMs: 25_000 }),
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

function renderWithClient(projects: Project[], authToken = "token") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useDashboardSummary(projects, authToken), { wrapper });
}

describe("useDashboardSummary", () => {
  beforeEach(() => {
    mockApiFetch.mockClear();
  });

  it("con fetch exitoso usa el summary del servidor (isExact) y registra lastSync", async () => {
    mockApiFetch.mockResolvedValue(serverSummary);

    const { result } = renderWithClient([makeProject()]);

    await waitFor(() => expect(result.current.isExact).toBe(true));

    expect(mockApiFetch).toHaveBeenCalledWith("/dashboard/summary", { token: "token" });
    expect(result.current.summary).toEqual(serverSummary);
    expect(result.current.lastSync).not.toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("con fetch fallido cae al cálculo cliente y no marca isExact", async () => {
    mockApiFetch.mockRejectedValue(new Error("offline"));

    const { result } = renderWithClient([makeProject({ estimatedTotal: 2500 })]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isExact).toBe(false);
    expect(result.current.summary.totalProjects).toBe(1);
    expect(result.current.summary.totalApprovedInvestment).toBe(2500);
    expect(result.current.lastSync).toBeNull();
  });

  it("sin authToken no consulta el endpoint y usa fallback cliente", async () => {
    const { result } = renderWithClient([makeProject()], "");

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(result.current.summary.totalProjects).toBe(1);
    expect(result.current.isExact).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});
