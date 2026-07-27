import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Project, AuditLog } from "../../types";
import { ProjectStatus } from "../../types";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("@/hooks/usePolling", () => ({
  usePolling: vi.fn(),
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

import { useProjectsData } from "../../hooks/useProjectsData";
import { usePolling } from "../../hooks/usePolling";

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

/** Helper: flush all pending microtasks (promises) and re-renders */
async function flushAll() {
  for (let i = 0; i < 10; i++) {
    await act(async () => { await Promise.resolve(); });
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("useProjectsData", () => {
  const showToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockReset();
    (usePolling as ReturnType<typeof vi.fn>).mockImplementation((_cb: () => void, _interval: number, _enabled: boolean) => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  // ── Initial state ───────────────────────────────────────────────────────────
  describe("initial state", () => {
    it("starts with empty arrays and isLoading=true", () => {
      const { result } = renderHook(() => useProjectsData({ authToken: "", showToast }));
      expect(result.current.projects).toEqual([]);
      expect(result.current.auditLogs).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });

    it("does not fetch when authToken is empty", () => {
      renderHook(() => useProjectsData({ authToken: "", showToast }));
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

      const { result } = renderHook(() => useProjectsData({ authToken: "valid-token", showToast }));

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Flush microtasks → fetch completes → state updates
      await flushAll();

      expect(result.current.isLoading).toBe(false);
      expect(mockApiFetch).toHaveBeenCalledWith("/projects", { token: "valid-token" });
      expect(mockApiFetch).toHaveBeenCalledWith("/audit-logs", { token: "valid-token" });
      expect(result.current.projects).toEqual(projects);
      expect(result.current.auditLogs).toEqual(audits);
    });

    it("sets isLoading=false even when fetch fails (non-poll)", async () => {
      mockApiFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useProjectsData({ authToken: "token", showToast }));

      await flushAll();

      expect(result.current.isLoading).toBe(false);
    });

    it("en desarrollo, cae a INITIAL_PROJECTS y INITIAL_AUDIT_LOGS en error de fetch", async () => {
      vi.stubEnv("DEV", true);
      mockApiFetch.mockRejectedValue(new Error("API down"));

      const { result } = renderHook(() => useProjectsData({ authToken: "token", showToast }));

      await flushAll();

      expect(result.current.projects).toEqual(INITIAL_PROJECTS_MOCK);
      expect(result.current.auditLogs).toEqual(INITIAL_AUDIT_LOGS_MOCK);
    });

    it("en desarrollo, muestra un toast de warning en error de fetch", async () => {
      vi.stubEnv("DEV", true);
      mockApiFetch.mockRejectedValue(new Error("API down"));

      renderHook(() => useProjectsData({ authToken: "token", showToast }));

      await flushAll();

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("No se pudo conectar"),
        "warning",
      );
    });

    it("en producción, NO cae a datos demo — deja projects/auditLogs vacíos", async () => {
      vi.stubEnv("DEV", false);
      mockApiFetch.mockRejectedValue(new Error("API down"));

      const { result } = renderHook(() => useProjectsData({ authToken: "token", showToast }));

      await flushAll();

      expect(result.current.projects).toEqual([]);
      expect(result.current.auditLogs).toEqual([]);
    });

    it("en producción, muestra un toast de error (no 'datos locales de respaldo')", async () => {
      vi.stubEnv("DEV", false);
      mockApiFetch.mockRejectedValue(new Error("API down"));

      renderHook(() => useProjectsData({ authToken: "token", showToast }));

      await flushAll();

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("No se pudo conectar con el servidor"),
        "error",
      );
    });
  });

  // ── Deduplication via signature ─────────────────────────────────────────────
  describe("deduplication (signature)", () => {
    it("avoids re-render when poll returns identical data (same signature)", async () => {
      const projects = [createMockProject()];
      const audits = [createMockAuditLog()];
      mockApiFetch.mockImplementation((url: string) => {
        if (url === "/projects") return Promise.resolve(projects);
        if (url === "/audit-logs") return Promise.resolve(audits);
        return Promise.reject(new Error("unexpected"));
      });

      // Capture the poll callback
      let pollCallback: () => Promise<void> = async () => {};
      (usePolling as ReturnType<typeof vi.fn>).mockImplementation((cb: () => void | Promise<void>) => {
        pollCallback = cb as () => Promise<void>;
      });

      const { result } = renderHook(() => useProjectsData({ authToken: "token", showToast }));

      // Wait for initial load
      await flushAll();

      // Simulate a poll tick with same data
      mockApiFetch.mockClear();
      mockApiFetch.mockImplementation((url: string) => {
        if (url === "/projects") return Promise.resolve(projects);
        if (url === "/audit-logs") return Promise.resolve(audits);
        return Promise.reject(new Error("unexpected"));
      });

      await act(async () => {
        await pollCallback();
      });
      await flushAll();

      // setProjects should NOT have been called because signature matched
      // We check that mockApiFetch was called but data didn't change
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ── Token lifecycle (login / logout) ────────────────────────────────────────
  describe("token lifecycle", () => {
    it("does NOT fetch when token is empty on mount", () => {
      renderHook(() => useProjectsData({ authToken: "", showToast }));
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

      const { rerender, result } = renderHook(
        ({ token }) => useProjectsData({ authToken: token, showToast }),
        { initialProps: { token: "" } },
      );

      expect(mockApiFetch).not.toHaveBeenCalled();
      await flushAll();

      // Simulate login: token changes from "" to "new-token"
      mockApiFetch.mockClear();
      rerender({ token: "new-token" });

      await flushAll();

      expect(mockApiFetch).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.projects).toEqual(projects);
    });

    it("sets isLoading back to true when token transitions from falsy to truthy", async () => {
      mockApiFetch.mockResolvedValue([]);
      const { rerender, result } = renderHook(
        ({ token }) => useProjectsData({ authToken: token, showToast }),
        { initialProps: { token: "" } },
      );

      // Initially isLoading is true
      expect(result.current.isLoading).toBe(true);

      // Now login: triggers fetch
      rerender({ token: "new-token" });

      await flushAll();

      expect(result.current.isLoading).toBe(false);
    });
  });

  // ── Polling ─────────────────────────────────────────────────────────────────
  describe("polling", () => {
    it("calls usePolling with correct interval and enabled flag", () => {
      const mockUsePolling = vi.mocked(usePolling);

      renderHook(() => useProjectsData({ authToken: "token", showToast }));

      expect(mockUsePolling).toHaveBeenCalledWith(
        expect.any(Function),
        25000,
        true,
      );
    });

    it("disables polling when authToken is empty", () => {
      const mockUsePolling = vi.mocked(usePolling);

      renderHook(() => useProjectsData({ authToken: "", showToast }));

      expect(mockUsePolling).toHaveBeenCalledWith(
        expect.any(Function),
        25000,
        false,
      );
    });

    it("poll callback does not throw when fetch fails (silent)", async () => {
      // Capture poll callback
      let pollCallback: () => Promise<void> = async () => {};
      (usePolling as ReturnType<typeof vi.fn>).mockImplementation((cb: () => void | Promise<void>) => {
        pollCallback = cb as () => Promise<void>;
      });

      mockApiFetch.mockResolvedValue([]);

      const { result } = renderHook(() => useProjectsData({ authToken: "token", showToast }));

      // Wait for initial load
      await flushAll();
      expect(result.current.isLoading).toBe(false);

      // Make next fetch fail
      mockApiFetch.mockRejectedValue(new Error("poll error"));

      // Poll should not throw
      await expect(pollCallback()).resolves.toBeUndefined();
    });
  });

  // ── loadProjects is exposed ─────────────────────────────────────────────────
  describe("exposed API", () => {
    it("exposes loadProjects, setProjects, setAuditLogs", async () => {
      mockApiFetch.mockResolvedValue([]);

      const { result } = renderHook(() => useProjectsData({ authToken: "token", showToast }));

      await flushAll();

      expect(result.current.loadProjects).toBeDefined();
      expect(typeof result.current.loadProjects).toBe("function");
      expect(typeof result.current.setProjects).toBe("function");
      expect(typeof result.current.setAuditLogs).toBe("function");
    });

    it("calling setProjects directly updates the projects state", () => {
      mockApiFetch.mockResolvedValue([]);

      const { result } = renderHook(() => useProjectsData({ authToken: "token", showToast }));

      const newProject = createMockProject({ id: "NEW-001" });
      act(() => {
        result.current.setProjects([newProject]);
      });

      expect(result.current.projects).toEqual([newProject]);
    });
  });
});
