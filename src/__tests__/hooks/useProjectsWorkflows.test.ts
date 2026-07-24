import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Project, Proposal } from "../../types";
import { ProjectStatus } from "../../types";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("@/services/logger", () => ({
  logError: vi.fn(),
}));

import { useProjectsWorkflows } from "../../hooks/useProjectsWorkflows";

// ── Helpers ──────────────────────────────────────────────────────────────────
function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "PRJ-001",
    title: "Test Project",
    type: "INFRAESTRUCTURA",
    status: ProjectStatus.CREADO,
    createdDate: "2026-07-01",
    materials: [],
    estimatedTotal: 1000,
    proposals: [],
    ...overrides,
  } as Project;
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("useProjectsWorkflows", () => {
  const showToast = vi.fn();
  const syncProject = vi.fn();
  const refreshAuditLogs = vi.fn();
  const getProject = vi.fn();

  const defaultOptions = {
    authToken: "valid-token",
    showToast,
    syncProject,
    refreshAuditLogs,
    getProject,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── All handlers are exposed ────────────────────────────────────────────────
  it("exposes all 12 handlers", () => {
    const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));
    expect(result.current.handleAddProject).toBeDefined();
    expect(result.current.handleReviewProject).toBeDefined();
    expect(result.current.handleApproveInvestment).toBeDefined();
    expect(result.current.handleAddProposal).toBeDefined();
    expect(result.current.handleRemoveProposal).toBeDefined();
    expect(result.current.handleImportSupplierProposals).toBeDefined();
    expect(result.current.handleSubmitComparative).toBeDefined();
    expect(result.current.handleSelectContractor).toBeDefined();
    expect(result.current.handleRejectProposals).toBeDefined();
    expect(result.current.handlePayAdvance).toBeDefined();
    expect(result.current.handleVerifyCompletion).toBeDefined();
    expect(result.current.handlePayFinal).toBeDefined();
  });

  // ── Infrastructure / Mantenimiento ──────────────────────────────────────────
  describe("handleAddProject", () => {
    it("POSTs to /projects and syncs the response", async () => {
      const newProject = createMockProject();
      mockApiFetch.mockResolvedValue(newProject);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleAddProject({
        title: "New Project",
        type: "INFRAESTRUCTURA",
        description: "desc",
        location: "loc",
        materials: [],
        estimatedTotal: 500,
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/projects", {
        method: "POST",
        token: "valid-token",
        body: expect.any(String),
      });
      expect(syncProject).toHaveBeenCalledWith(newProject);
    });

    it("shows error toast on failure", async () => {
      mockApiFetch.mockRejectedValue(new Error("API error"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleAddProject({
        title: "New Project",
        type: "INFRAESTRUCTURA",
        description: "desc",
        location: "loc",
        materials: [],
        estimatedTotal: 500,
      });

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("No se pudo registrar"),
        "error",
      );
    });
  });

  describe("handleReviewProject", () => {
    it("POSTs review and uploads documents", async () => {
      const project = createMockProject({ status: ProjectStatus.REVISADO_CIERRE });
      mockApiFetch
        .mockResolvedValueOnce(project)           // /projects/{id}/review
        .mockResolvedValueOnce(undefined)          // /projects/{id}/documents (x2)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(project);           // /projects/{id} refreshed

      const planFile = new File(["plan"], "plan.pdf", { type: "application/pdf" });
      const calcFile = new File(["calc"], "calc.pdf", { type: "application/pdf" });

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleReviewProject("PRJ-001", "review notes", [planFile], [calcFile]);

      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/review", {
        method: "POST",
        token: "valid-token",
        body: expect.stringContaining("review notes"),
      });
      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/documents", expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }));
      expect(syncProject).toHaveBeenCalledWith(project);
    });

    it("handles review without files", async () => {
      const project = createMockProject({ status: ProjectStatus.REVISADO_CIERRE });
      mockApiFetch
        .mockResolvedValueOnce(project)
        .mockResolvedValueOnce(project);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleReviewProject("PRJ-001", "notes only", [], []);

      expect(mockApiFetch).toHaveBeenCalledTimes(2); // review + refresh
      expect(syncProject).toHaveBeenCalledTimes(2);
    });

    it("shows error toast on failure", async () => {
      mockApiFetch.mockRejectedValue(new Error("fail"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleReviewProject("PRJ-001", "notes", [], []);

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("No se pudo guardar"),
        "error",
      );
    });
  });

  // ── Procura ─────────────────────────────────────────────────────────────────
  describe("handleApproveInvestment", () => {
    it("POSTs to /projects/{id}/approve-investment and syncs", async () => {
      const project = createMockProject({ status: ProjectStatus.CONFIRMADO_PROCURA });
      mockApiFetch.mockResolvedValue(project);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleApproveInvestment("PRJ-001", "approved", 5000);

      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/approve-investment", {
        method: "POST",
        token: "valid-token",
        body: expect.stringContaining("5000"),
      });
      expect(syncProject).toHaveBeenCalledWith(project);
    });

    it("shows error toast on failure", async () => {
      mockApiFetch.mockRejectedValue(new Error("fail"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleApproveInvestment("PRJ-001", "notes", 1000);

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("No se pudo aprobar"),
        "error",
      );
    });
  });

  describe("handleSelectContractor", () => {
    it("POSTs to /projects/{id}/select-contractor and syncs", async () => {
      const project = createMockProject({ status: ProjectStatus.CONTRATADO });
      mockApiFetch.mockResolvedValue(project);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleSelectContractor("PRJ-001", "CON-301", "PROP-001");

      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/select-contractor", {
        method: "POST",
        token: "valid-token",
        body: expect.stringContaining("CON-301"),
      });
      expect(syncProject).toHaveBeenCalledWith(project);
    });

    it("re-throws the error (does not swallow)", async () => {
      const error = new Error("Selection failed");
      mockApiFetch.mockRejectedValue(error);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await expect(
        result.current.handleSelectContractor("PRJ-001", "CON-301", "PROP-001"),
      ).rejects.toThrow("Selection failed");
    });
  });

  describe("handleRejectProposals", () => {
    it("POSTs to /projects/{id}/reject-proposals and syncs", async () => {
      const project = createMockProject();
      mockApiFetch.mockResolvedValue(project);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleRejectProposals("PRJ-001", "not suitable");

      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/reject-proposals", {
        method: "POST",
        token: "valid-token",
        body: expect.stringContaining("not suitable"),
      });
      expect(syncProject).toHaveBeenCalledWith(project);
    });

    it("shows error toast on failure", async () => {
      mockApiFetch.mockRejectedValue(new Error("fail"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleRejectProposals("PRJ-001", "reason");

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("No se pudo rechazar"),
        "error",
      );
    });
  });

  // ── Analistas ───────────────────────────────────────────────────────────────
  describe("handleAddProposal", () => {
    it("POSTs to /projects/{id}/proposals and syncs", async () => {
      const project = createMockProject();
      mockApiFetch.mockResolvedValue(project);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      const proposal: Omit<Proposal, "id"> = {
        contractorCode: "CON-301",
        contractorName: "Test Contractor",
        contractorRating: 4.5,
        materialCost: 1000,
        laborCost: 500,
        totalCost: 1500,
        deliveryWeeks: 4,
        negotiatedAdvancePercent: 30,
        description: "Test proposal",
      };

      await result.current.handleAddProposal("PRJ-001", proposal);

      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/proposals", {
        method: "POST",
        token: "valid-token",
        body: expect.stringContaining("CON-301"),
      });
      expect(syncProject).toHaveBeenCalledWith(project);
    });

    it("shows error toast on failure", async () => {
      mockApiFetch.mockRejectedValue(new Error("fail"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleAddProposal("PRJ-001", {} as Omit<Proposal, "id">);

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("No se pudo cargar"),
        "error",
      );
    });
  });

  describe("handleRemoveProposal", () => {
    it("DELETEs to /projects/{id}/proposals/{proposalId} and syncs", async () => {
      const project = createMockProject();
      mockApiFetch.mockResolvedValue(project);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleRemoveProposal("PRJ-001", "PROP-001");

      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/proposals/PROP-001", {
        method: "DELETE",
        token: "valid-token",
      });
      expect(syncProject).toHaveBeenCalledWith(project);
    });

    it("shows error toast on failure", async () => {
      mockApiFetch.mockRejectedValue(new Error("fail"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleRemoveProposal("PRJ-001", "PROP-001");

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("No se pudo eliminar"),
        "error",
      );
    });
  });

  describe("handleSubmitComparative", () => {
    it("POSTs to /projects/{id}/submit-comparative and syncs", async () => {
      const project = createMockProject();
      mockApiFetch.mockResolvedValue(project);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleSubmitComparative("PRJ-001");

      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/submit-comparative", {
        method: "POST",
        token: "valid-token",
      });
      expect(syncProject).toHaveBeenCalledWith(project);
    });

    it("shows error toast on failure", async () => {
      mockApiFetch.mockRejectedValue(new Error("fail"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleSubmitComparative("PRJ-001");

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("No se pudo enviar"),
        "error",
      );
    });
  });

  describe("handleImportSupplierProposals", () => {
    it("POSTs to /projects/{id}/import-supplier-proposals and refreshes audit", async () => {
      const project = createMockProject();
      mockApiFetch.mockResolvedValue({
        message: "Import successful",
        imported: 3,
        skipped: 0,
        project: { data: project },
      });

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      const res = await result.current.handleImportSupplierProposals("PRJ-001");

      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/import-supplier-proposals", {
        method: "POST",
        token: "valid-token",
      });
      expect(syncProject).toHaveBeenCalledWith(project);
      expect(refreshAuditLogs).toHaveBeenCalled();
      expect(res).toEqual({ message: "Import successful", imported: 3, skipped: 0 });
    });

    it("handles response with project directly (not nested in data)", async () => {
      const project = createMockProject();
      mockApiFetch.mockResolvedValue({
        message: "OK",
        imported: 1,
        skipped: 0,
        project,
      });

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      const res = await result.current.handleImportSupplierProposals("PRJ-001");

      expect(syncProject).toHaveBeenCalledWith(project);
      expect(res.imported).toBe(1);
    });

    it("handles response without project field", async () => {
      mockApiFetch.mockResolvedValue({
        message: "No new proposals",
        imported: 0,
        skipped: 0,
      });

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      const res = await result.current.handleImportSupplierProposals("PRJ-001");

      expect(syncProject).not.toHaveBeenCalled();
      expect(res.imported).toBe(0);
    });
  });

  // ── Finanzas ───────────────────────────────────────────────────────────────
  describe("handlePayAdvance", () => {
    it("POSTs to /projects/{id}/payments with ADVANCE type", async () => {
      const project = createMockProject({ status: ProjectStatus.EN_EJECUCION });
      mockApiFetch.mockResolvedValue(project);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handlePayAdvance("PRJ-001", 5000);

      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/payments", {
        method: "POST",
        token: "valid-token",
        body: expect.stringContaining("ADVANCE"),
      });
      expect(syncProject).toHaveBeenCalledWith(project);
    });

    it("shows error toast on failure", async () => {
      mockApiFetch.mockRejectedValue(new Error("fail"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handlePayAdvance("PRJ-001", 1000);

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("No se pudo registrar el anticipo"),
        "error",
      );
    });
  });

  describe("handlePayFinal", () => {
    it("POSTs to /projects/{id}/payments with FINAL type", async () => {
      const project = createMockProject({ status: ProjectStatus.COMPLETADO_PAGADO });
      mockApiFetch.mockResolvedValue(project);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handlePayFinal("PRJ-001", 10000);

      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/payments", {
        method: "POST",
        token: "valid-token",
        body: expect.stringContaining("FINAL"),
      });
      expect(syncProject).toHaveBeenCalledWith(project);
    });

    it("shows error toast on failure", async () => {
      mockApiFetch.mockRejectedValue(new Error("fail"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handlePayFinal("PRJ-001", 1000);

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("No se pudo registrar el pago final"),
        "error",
      );
    });
  });

  // ── Cierre de Obra ─────────────────────────────────────────────────────────
  describe("handleVerifyCompletion", () => {
    it("calls report-finished when project is EN_EJECUCION", async () => {
      const project = createMockProject({ status: ProjectStatus.EN_EJECUCION });
      getProject.mockReturnValue(project);
      mockApiFetch.mockResolvedValue(project);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleVerifyCompletion("PRJ-001");

      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/report-finished", {
        method: "POST",
        token: "valid-token",
      });
    });

    it("calls verify-completion when project is NOT EN_EJECUCION", async () => {
      const project = createMockProject({ status: ProjectStatus.VERIFICANDO_FINALIZACION });
      getProject.mockReturnValue(project);
      mockApiFetch.mockResolvedValue(project);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleVerifyCompletion("PRJ-001");

      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/verify-completion", {
        method: "POST",
        token: "valid-token",
        body: expect.stringContaining("qualityVerified"),
      });
    });

    it("syncs the updated project", async () => {
      const project = createMockProject({ status: ProjectStatus.EN_EJECUCION });
      const updated = createMockProject({ status: ProjectStatus.VERIFICANDO_FINALIZACION });
      getProject.mockReturnValue(project);
      mockApiFetch.mockResolvedValue(updated);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleVerifyCompletion("PRJ-001");

      expect(syncProject).toHaveBeenCalledWith(updated);
    });

    it("shows error toast on failure", async () => {
      const project = createMockProject({ status: ProjectStatus.EN_EJECUCION });
      getProject.mockReturnValue(project);
      mockApiFetch.mockRejectedValue(new Error("fail"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleVerifyCompletion("PRJ-001");

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("No se pudo actualizar"),
        "error",
      );
    });
  });

  // ── Refs pattern ────────────────────────────────────────────────────────────
  describe("refs pattern (stability across token changes)", () => {
    it("reads authToken from ref on each call, not closure", async () => {
      const { rerender, result } = renderHook(
        ({ token }) => useProjectsWorkflows({ ...defaultOptions, authToken: token }),
        { initialProps: { token: "original-token" } },
      );

      mockApiFetch.mockResolvedValue(createMockProject());

      await result.current.handleApproveInvestment("PRJ-001", "notes", 100);
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ token: "original-token" }),
      );

      mockApiFetch.mockClear();

      // Update token
      rerender({ token: "new-token" });

      await result.current.handleApproveInvestment("PRJ-001", "notes", 100);
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ token: "new-token" }),
      );
    });

    it("reads showToast from ref", async () => {
      mockApiFetch.mockRejectedValue(new Error("fail"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleAddProject({
        title: "Test",
        type: "INFRAESTRUCTURA",
        description: "desc",
        location: "loc",
        materials: [],
        estimatedTotal: 100,
      });

      // Verify showToast was called with the mocked function
      expect(showToast).toHaveBeenCalled();
    });
  });
});
