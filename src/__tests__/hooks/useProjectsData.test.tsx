import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { Project, AuditLog } from "@/types";
import { ProjectStatus } from "@/types";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("@/services/logger", () => ({
  logError: vi.fn(),
}));

const { INITIAL_PROJECTS_MOCK, INITIAL_AUDIT_LOGS_MOCK } = vi.hoisted(() => ({
  INITIAL_PROJECTS_MOCK: [{ id: "FALLBACK-001", title: "fallback" }] as Project[],
  INITIAL_AUDIT_LOGS_MOCK: [{ id: "LOG-FALLBACK", projectId: "FALLBACK-001" }] as AuditLog[],
}));
vi.mock("@/data", () => ({
  INITIAL_PROJECTS: INITIAL_PROJECTS_MOCK,
  INITIAL_AUDIT_LOGS: INITIAL_AUDIT_LOGS_MOCK,
}));

import { useProjectsData } from "@/hooks/useProjectsData";

function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "PRJ-001",
    title: "Test Project",
    type: "INFRAESTRUCTURA",
    status: ProjectStatus.CREADO,
    createdDate: "2026-07-01",
    materials: [],
    estimatedTotal: 100,
    proposals: [],
    ...overrides,
  } as Project;
}

function createMockAuditLog(id = "LOG-001"): AuditLog {
  return { id, projectId: "PRJ-001", role: "INFRAESTRUCTURA", action: "Creación", timestamp: "2026-07-01", details: "" } as AuditLog;
}

function renderWithClient(authToken: string, showToast = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useProjectsData({ authToken, showToast }), { wrapper }), showToast, client };
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("useProjectsData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  // ── Initial state ───────────────────────────────────────────────────────────
  describe("initial state", () => {
    it("starts with empty arrays and isLoading=true", () => {
      const { result } = renderWithClient("");
      expect(result.current.projects).toEqual([]);
      expect(result.current.auditLogs).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });

    it("does not fetch when authToken is empty", () => {
      renderWithClient("");
      expect(mockApiFetch).not.toHaveBeenCalled();
    });
  });

  // ── Data fetching (with token) ──────────────────────────────────────────────
  describe("data fetching", () => {
    it("fetches projects and audit logs in parallel on mount when token is provided", async () => {
      const projects = [createMockProject({ id: "PRJ-001" })];
      const audits = [createMockAuditLog("LOG-001")];
      mockApiFetch.mockImplementation((url: string) => {
        if (url === "/projects") return Promise.resolve(projects);
        if (url === "/audit-logs") return Promise.resolve(audits);
        return Promise.reject(new Error("unexpected"));
      });

      const { result } = renderWithClient("valid-token");

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockApiFetch).toHaveBeenCalledWith("/projects", { token: "valid-token" });
      expect(mockApiFetch).toHaveBeenCalledWith("/audit-logs", { token: "valid-token" });
      expect(result.current.projects).toEqual(projects);
      expect(result.current.auditLogs).toEqual(audits);
    });

    it("sets isLoading=false even when fetch fails (non-poll)", async () => {
      mockApiFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderWithClient("token");

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it("en desarrollo, cae a INITIAL_PROJECTS y INITIAL_AUDIT_LOGS en error de fetch", async () => {
      vi.stubEnv("DEV", true);
      mockApiFetch.mockRejectedValue(new Error("API down"));

      const { result } = renderWithClient("token");

      await waitFor(() => expect(result.current.projects).toEqual(INITIAL_PROJECTS_MOCK));
      expect(result.current.auditLogs).toEqual(INITIAL_AUDIT_LOGS_MOCK);
    });

    it("en desarrollo, muestra un toast de warning en error de fetch", async () => {
      vi.stubEnv("DEV", true);
      mockApiFetch.mockRejectedValue(new Error("API down"));

      const { showToast } = renderWithClient("token");

      await waitFor(() =>
        expect(showToast).toHaveBeenCalledWith(
          expect.stringContaining("No se pudo conectar"),
          "warning",
        ),
      );
    });

    it("en producción, NO cae a datos demo — deja projects/auditLogs vacíos", async () => {
      vi.stubEnv("DEV", false);
      mockApiFetch.mockRejectedValue(new Error("API down"));

      const { result } = renderWithClient("token");

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.projects).toEqual([]);
      expect(result.current.auditLogs).toEqual([]);
    });

    it("en producción, muestra un toast de error (no 'datos locales de respaldo')", async () => {
      vi.stubEnv("DEV", false);
      mockApiFetch.mockRejectedValue(new Error("API down"));

      const { showToast } = renderWithClient("token");

      await waitFor(() =>
        expect(showToast).toHaveBeenCalledWith(
          expect.stringContaining("No se pudo conectar con el servidor"),
          "error",
        ),
      );
    });
  });

  // ── Token lifecycle (login / logout) ────────────────────────────────────────
  describe("token lifecycle", () => {
    it("does NOT fetch when token is empty on mount", () => {
      renderWithClient("");
      expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("fetches when token transitions from falsy to truthy (login)", async () => {
      const projects = [createMockProject()];
      const audits = [createMockAuditLog()];
      mockApiFetch.mockImplementation((url: string) => {
        if (url === "/projects") return Promise.resolve(projects);
        if (url === "/audit-logs") return Promise.resolve(audits);
        return Promise.reject(new Error("unexpected"));
      });

      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      );
      const { rerender, result } = renderHook(
        ({ token }) => useProjectsData({ authToken: token, showToast: vi.fn() }),
        { initialProps: { token: "" }, wrapper },
      );

      expect(mockApiFetch).not.toHaveBeenCalled();

      // Simulate login: token changes from "" to "new-token"
      rerender({ token: "new-token" });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockApiFetch).toHaveBeenCalled();
      expect(result.current.projects).toEqual(projects);
    });
  });

  // ── loadProjects is exposed ─────────────────────────────────────────────────
  describe("exposed API", () => {
    it("exposes loadProjects, setProjects, setAuditLogs", async () => {
      mockApiFetch.mockResolvedValue([]);

      const { result } = renderWithClient("token");

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.loadProjects).toBeDefined();
      expect(typeof result.current.loadProjects).toBe("function");
      expect(typeof result.current.setProjects).toBe("function");
      expect(typeof result.current.setAuditLogs).toBe("function");
    });

    it("calling setProjects directly updates the projects state", async () => {
      mockApiFetch.mockResolvedValue([]);

      const { result } = renderWithClient("token");
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const newProject = createMockProject({ id: "NEW-001" });
      result.current.setProjects([newProject]);

      await waitFor(() => expect(result.current.projects).toEqual([newProject]));
    });
  });
});
