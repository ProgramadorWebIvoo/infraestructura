import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Project, Proposal } from "@/types";
import { ProjectStatus } from "@/types";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("@/services/logger", () => ({
  logError: vi.fn(),
  getErrorMessage: (error: unknown, fallback = "Error inesperado.") =>
    error instanceof Error ? error.message : fallback,
}));

import { useProjectsWorkflows } from "@/hooks/useProjectsWorkflows";

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
    expect(result.current.handleAuditApproval).toBeDefined();
    expect(result.current.handlePayFinal).toBeDefined();
  });

  // ── Infrastructure / Mantenimiento ──────────────────────────────────────────
  describe("handleAddProject", () => {
    const basePayload = {
      title: "New Project",
      type: "INFRAESTRUCTURA",
      description: "desc",
      location: "loc",
      materials: [],
      estimatedTotal: 500,
    };

    it("sends plain JSON to POST /projects when there are no files", async () => {
      const newProject = createMockProject();
      mockApiFetch.mockResolvedValueOnce(newProject);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      const outcome = await result.current.handleAddProject(basePayload, { photos: [], documents: [], plans: [] });

      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      expect(mockApiFetch).toHaveBeenCalledWith("/projects", {
        method: "POST",
        token: "valid-token",
        body: expect.any(String),
      });
      expect(syncProject).toHaveBeenCalledWith(newProject);
      expect(outcome).toEqual({ ok: true, partial: false, failedGroups: [] });
    });

    it("sends the project and ALL its files in a single multipart request", async () => {
      const newProject = createMockProject();
      mockApiFetch.mockResolvedValueOnce(newProject);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      const outcome = await result.current.handleAddProject(basePayload, {
        photos: [new File(["a"], "foto.jpg")],
        documents: [new File(["b"], "doc.pdf")],
        plans: [new File(["c"], "plano.pdf")],
      });

      // Una sola llamada: el proceso y sus adjuntos viajan juntos (atómico en backend).
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      const [path, options] = mockApiFetch.mock.calls[0] as [string, { body: FormData }];
      expect(path).toBe("/projects");
      expect(JSON.parse(options.body.get("payload") as string)).toEqual(basePayload);
      expect((options.body.getAll("photos[]") as File[]).map((f) => f.name)).toEqual(["foto.jpg"]);
      expect((options.body.getAll("documents[]") as File[]).map((f) => f.name)).toEqual(["doc.pdf"]);
      expect((options.body.getAll("plans[]") as File[]).map((f) => f.name)).toEqual(["plano.pdf"]);
      expect(syncProject).toHaveBeenCalledWith(newProject);
      expect(outcome).toEqual({ ok: true, partial: false, failedGroups: [] });
    });

    it("fails the whole process (no partial success) when the backend rejects a file", async () => {
      mockApiFetch.mockRejectedValue(new Error("El archivo contiene contenido no permitido embebido."));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      const outcome = await result.current.handleAddProject(basePayload, {
        photos: [new File(["x"], "foto.jpg")],
        documents: [],
        plans: [],
      });

      expect(showToast).toHaveBeenCalledWith(expect.stringContaining("No se pudo registrar"), "error");
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      expect(syncProject).not.toHaveBeenCalled();
      expect(outcome).toEqual({ ok: false, partial: false, failedGroups: [] });
    });

    it("strips optimizedCount from the synced project and announces it", async () => {
      const newProject = createMockProject();
      mockApiFetch.mockResolvedValueOnce({ ...newProject, optimizedCount: 2 });

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleAddProject(basePayload, { photos: [new File(["a"], "foto.jpg")], documents: [], plans: [] });

      expect(syncProject).toHaveBeenCalledWith(newProject);
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining("2 archivo(s) optimizado(s)"), "info");
    });
  });

  describe("handleResubmitProject", () => {
    const baseUpdate = {
      title: "Fixed title",
      description: "desc",
      location: "loc",
      materials: [],
      estimatedTotal: 500,
    };

    it("sends plain new files in the same request, never linked to an existing document", async () => {
      const refreshed = createMockProject({ status: ProjectStatus.CREADO });
      mockApiFetch.mockResolvedValueOnce(refreshed);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleResubmitProject(
        "PRJ-001",
        baseUpdate,
        { photos: [], documents: [], plans: [new File(["v2"], "plano-nuevo.pdf")] },
      );

      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      const [path, options] = mockApiFetch.mock.calls[0] as [string, { body: FormData }];
      expect(path).toBe("/projects/PRJ-001/resubmit");
      expect((options.body.getAll("plans[]") as File[]).map((f) => f.name)).toEqual(["plano-nuevo.pdf"]);
      expect(options.body.get("replacements[0][documentId]")).toBeNull();
      expect(syncProject).toHaveBeenCalledWith(refreshed);
    });

    it("sends versionReplacements in the same request with their explicit documentId", async () => {
      const refreshed = createMockProject({ status: ProjectStatus.CREADO });
      mockApiFetch.mockResolvedValueOnce(refreshed);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleResubmitProject(
        "PRJ-001",
        baseUpdate,
        { photos: [], documents: [], plans: [] },
        [],
        [
          { documentId: 1, documentType: "PLANO", file: new File(["v2"], "a-v2.pdf") },
          { documentId: 7, documentType: "FOTO", file: new File(["v2"], "foto-v2.png") },
        ],
      );

      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      const options = mockApiFetch.mock.calls[0][1] as { body: FormData };
      expect(options.body.get("replacements[0][documentId]")).toBe("1");
      expect((options.body.get("replacements[0][file]") as File).name).toBe("a-v2.pdf");
      expect(options.body.get("replacements[1][documentId]")).toBe("7");
      expect((options.body.get("replacements[1][file]") as File).name).toBe("foto-v2.png");
    });

    it("fails the whole resubmit when the backend rejects a file", async () => {
      mockApiFetch.mockRejectedValue(new Error("rechazado"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      const outcome = await result.current.handleResubmitProject(
        "PRJ-001",
        baseUpdate,
        { photos: [new File(["x"], "foto.jpg")], documents: [], plans: [] },
      );

      expect(showToast).toHaveBeenCalledWith(expect.stringContaining("No se pudo reenviar"), "error");
      expect(syncProject).not.toHaveBeenCalled();
      expect(outcome).toEqual({ ok: false, partial: false, failedGroups: [] });
    });
  });

  describe("handleRejectProject / handleSendToReevaluation (adjuntos en la misma petición)", () => {
    it("reject: sends reason and correction files together, and rolls back the optimistic state if the backend fails", async () => {
      const original = createMockProject({ status: ProjectStatus.CREADO });
      mockApiFetch.mockRejectedValue(new Error("rechazado"));

      const { result } = renderHook(() => useProjectsWorkflows({ ...defaultOptions, getProject: () => original }));

      const outcome = await result.current.handleRejectProject("PRJ-001", "motivo", undefined, [new File(["c"], "correccion.pdf")]);

      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      const [path, options] = mockApiFetch.mock.calls[0] as [string, { body: FormData }];
      expect(path).toBe("/projects/PRJ-001/reject-project");
      expect(JSON.parse(options.body.get("payload") as string)).toEqual({ reason: "motivo" });
      expect((options.body.getAll("files[]") as File[]).map((f) => f.name)).toEqual(["correccion.pdf"]);
      expect(syncProject).toHaveBeenLastCalledWith(original);
      expect(outcome).toEqual({ ok: false, partial: false, failedGroups: [] });
    });

    it("reevaluation: sends reason and evidence files in a single request", async () => {
      const updated = createMockProject({ status: ProjectStatus.EN_REEVALUACION_AUDITORIA });
      mockApiFetch.mockResolvedValueOnce(updated);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      const outcome = await result.current.handleSendToReevaluation("PRJ-001", "motivo", "obs", [new File(["e"], "evidencia.pdf")]);

      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      const [path, options] = mockApiFetch.mock.calls[0] as [string, { body: FormData }];
      expect(path).toBe("/projects/PRJ-001/send-to-reevaluation");
      expect(JSON.parse(options.body.get("payload") as string)).toEqual({ reason: "motivo", observations: "obs" });
      expect((options.body.getAll("files[]") as File[]).map((f) => f.name)).toEqual(["evidencia.pdf"]);
      expect(syncProject).toHaveBeenCalledWith(updated);
      expect(outcome).toEqual({ ok: true, partial: false, failedGroups: [] });
    });
  });

  describe("handleReviewProject", () => {
    it("POSTs review with notes — Auditoría ya no sube documentos, solo audita", async () => {
      const project = createMockProject({ status: ProjectStatus.REVISADO_AUDITORIA });
      mockApiFetch.mockResolvedValueOnce(project);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleReviewProject("PRJ-001", "review notes");

      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/review", {
        method: "POST",
        token: "valid-token",
        body: expect.stringContaining("review notes"),
      });
      expect(syncProject).toHaveBeenCalledWith(project);
    });

    it("envía residentUserId solo cuando Auditoría lo elige (obra personalizada)", async () => {
      mockApiFetch.mockResolvedValue(createMockProject({ status: ProjectStatus.REVISADO_AUDITORIA }));
      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleReviewProject("PRJ-001", "ok", 12);
      expect(JSON.parse(mockApiFetch.mock.calls[0][1].body)).toEqual({ notes: "ok", residentUserId: 12 });

      mockApiFetch.mockClear();
      await result.current.handleReviewProject("PRJ-001", "ok");
      expect(JSON.parse(mockApiFetch.mock.calls[0][1].body)).toEqual({ notes: "ok" });
    });

    it("handles review without notes", async () => {
      const project = createMockProject({ status: ProjectStatus.REVISADO_AUDITORIA });
      mockApiFetch.mockResolvedValueOnce(project);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleReviewProject("PRJ-001", "");

      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      expect(syncProject).toHaveBeenCalledTimes(1);
    });

    it("shows error toast on failure", async () => {
      mockApiFetch.mockRejectedValue(new Error("fail"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handleReviewProject("PRJ-001", "notes");

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

  // ── Actualización optimista ────────────────────────────────────────────────
  // Regresión: reportado en pruebas manuales — al aprobar una inversión el
  // proyecto seguía apareciendo en la lista de "pendientes de aprobación"
  // durante varios segundos (el tiempo del round-trip real), aunque el modal
  // ya se había cerrado. syncProject() se llamaba solo con la respuesta del
  // servidor, nunca antes. optimisticUpdate() debe llamar a syncProject de
  // inmediato con el status esperado, ANTES de que el fetch resuelva.
  describe("actualización optimista (evita el 'parpadeo' de varios segundos)", () => {
    it("handleApproveInvestment aplica CONFIRMADO_PROCURA de inmediato, antes de que resuelva el fetch", async () => {
      const current = createMockProject({ id: "PRJ-001", status: ProjectStatus.REVISADO_AUDITORIA });
      getProject.mockReturnValue(current);

      let resolveFetch!: (value: Project) => void;
      mockApiFetch.mockReturnValue(new Promise<Project>((resolve) => { resolveFetch = resolve; }));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      const promise = result.current.handleApproveInvestment("PRJ-001", "aprobado", 5000);

      // Antes de que el fetch resuelva: syncProject ya fue llamado con el
      // status optimista — esto es lo que hace que el proyecto desaparezca
      // de "pendientes" de inmediato en vez de esperar la red.
      expect(syncProject).toHaveBeenCalledWith(
        expect.objectContaining({ id: "PRJ-001", status: ProjectStatus.CONFIRMADO_PROCURA, approvedInvestmentAmount: 5000 }),
      );

      const serverProject = createMockProject({ id: "PRJ-001", status: ProjectStatus.CONFIRMADO_PROCURA });
      resolveFetch(serverProject);
      await promise;

      // La respuesta real reemplaza al optimista como segunda llamada.
      expect(syncProject).toHaveBeenLastCalledWith(serverProject);
    });

    it("handleApproveInvestment revierte al proyecto anterior si el fetch falla", async () => {
      const current = createMockProject({ id: "PRJ-001", status: ProjectStatus.REVISADO_AUDITORIA });
      getProject.mockReturnValue(current);
      mockApiFetch.mockRejectedValue(new Error("fail"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));
      await result.current.handleApproveInvestment("PRJ-001", "notes", 1000);

      // 1ra llamada: optimista (CONFIRMADO_PROCURA). 2da: reversión al status original.
      expect(syncProject).toHaveBeenCalledTimes(2);
      expect(syncProject).toHaveBeenLastCalledWith(current);
    });

    it("handleReviewProject aplica REVISADO_AUDITORIA de inmediato", async () => {
      const current = createMockProject({ id: "PRJ-001", status: ProjectStatus.CREADO });
      getProject.mockReturnValue(current);
      mockApiFetch.mockResolvedValue(createMockProject({ id: "PRJ-001", status: ProjectStatus.REVISADO_AUDITORIA }));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));
      await result.current.handleReviewProject("PRJ-001", "notas");

      expect(syncProject).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ status: ProjectStatus.REVISADO_AUDITORIA }),
      );
    });

    it("no aplica optimista si getProject no encuentra el proyecto (evita sync con datos vacíos)", async () => {
      getProject.mockReturnValue(undefined);
      mockApiFetch.mockResolvedValue(createMockProject({ status: ProjectStatus.CONFIRMADO_PROCURA }));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));
      await result.current.handleApproveInvestment("PRJ-001", "notes", 1000);

      // Solo la llamada con la respuesta real del servidor.
      expect(syncProject).toHaveBeenCalledTimes(1);
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
        origen: "MANUAL",
        fechaOferta: "2026-07-01",
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
  const fakeProofFile = () => new File(["dummy"], "voucher.pdf", { type: "application/pdf" });
  const settlement = { paymentMode: "QUOTE_CURRENCY" as const, paidAmount: 5000 };

  describe("handlePayAdvance", () => {
    it("uploads the payment proof and then POSTs to /projects/{id}/payments with ADVANCE type", async () => {
      const project = createMockProject({ status: ProjectStatus.EN_EJECUCION });
      mockApiFetch.mockResolvedValue(project);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handlePayAdvance("PRJ-001", 5000, fakeProofFile(), settlement);

      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/documents", expect.objectContaining({
        method: "POST",
        token: "valid-token",
        body: expect.any(FormData),
      }));
      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/payments", {
        method: "POST",
        token: "valid-token",
        body: expect.stringContaining("ADVANCE"),
      });
      expect(syncProject).toHaveBeenCalledWith(project);
    });

    it("envia en el pago cómo se pagó realmente (modo, monto y tasa aplicada)", async () => {
      mockApiFetch.mockResolvedValue(createMockProject({ status: ProjectStatus.EN_EJECUCION }));
      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handlePayAdvance("PRJ-001", 450, fakeProofFile(), {
        paymentMode: "BS",
        paidAmount: 345600,
        appliedRate: 960,
        appliedRateSource: "MANUAL",
        bank: "Banesco",
      });

      const paymentCall = mockApiFetch.mock.calls.find(([url]) => url === "/projects/PRJ-001/payments");
      expect(JSON.parse(paymentCall![1].body)).toEqual({
        paymentType: "ADVANCE",
        amount: 450,
        paymentMode: "BS",
        paidAmount: 345600,
        appliedRate: 960,
        appliedRateSource: "MANUAL",
        bank: "Banesco",
      });
    });

    it("does not register the payment when the proof upload fails", async () => {
      mockApiFetch.mockRejectedValueOnce(new Error("upload failed"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handlePayAdvance("PRJ-001", 1000, fakeProofFile(), settlement);

      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      // Muestra el mensaje real del backend (getErrorMessage), no uno genérico.
      expect(showToast).toHaveBeenCalledWith("upload failed", "error");
    });

    it("shows error toast when the payment fails after the proof was uploaded", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("fail"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handlePayAdvance("PRJ-001", 1000, fakeProofFile(), settlement);

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("No se pudo registrar el anticipo"),
        "error",
      );
    });
  });

  describe("handlePayFinal", () => {
    it("uploads the payment proof and then POSTs to /projects/{id}/payments with FINAL type", async () => {
      const project = createMockProject({ status: ProjectStatus.COMPLETADO_PAGADO });
      mockApiFetch.mockResolvedValue(project);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handlePayFinal("PRJ-001", 10000, fakeProofFile(), settlement);

      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/documents", expect.objectContaining({
        method: "POST",
        token: "valid-token",
        body: expect.any(FormData),
      }));
      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/payments", {
        method: "POST",
        token: "valid-token",
        body: expect.stringContaining("FINAL"),
      });
      expect(syncProject).toHaveBeenCalledWith(project);
    });

    it("does not register the payment when the proof upload fails", async () => {
      mockApiFetch.mockRejectedValueOnce(new Error("upload failed"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handlePayFinal("PRJ-001", 1000, fakeProofFile(), settlement);

      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      expect(showToast).toHaveBeenCalledWith("upload failed", "error");
    });

    it("shows error toast when the payment fails after the proof was uploaded", async () => {
      mockApiFetch.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("fail"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await result.current.handlePayFinal("PRJ-001", 1000, fakeProofFile(), settlement);

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("No se pudo registrar el pago final"),
        "error",
      );
    });
  });

  // ── Cierre (residente / Auditoría / Procura) ──────────────────────────
  describe("closure workflows", () => {
    const residentItems = [{ id: 1, residentQuantity: 8, note: "Faltan 4" }];

    it("handleAuditApproval envía solo las notas a closure-report/audit-approval y sincroniza", async () => {
      const updated = createMockProject({ status: ProjectStatus.PENDIENTE_SOLICITUD_FINIQUITO });
      mockApiFetch.mockResolvedValue(updated);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));
      await result.current.handleAuditApproval("PRJ-001", "ok");

      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/closure-report/audit-approval", {
        method: "POST",
        token: "valid-token",
        body: JSON.stringify({ notes: "ok" }),
      });
      expect(syncProject).toHaveBeenCalledWith(updated);
    });

    it.each([
      ["handleResidentApproval", "resident-approval", { notes: "ok", items: residentItems }, residentItems],
    ] as const)("%s envía las mediciones a closure-report/%s y sincroniza", async (handler, action, body, items) => {
      const updated = createMockProject({ status: ProjectStatus.VERIFICANDO_FINALIZACION });
      mockApiFetch.mockResolvedValue(updated);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));
      await (result.current[handler] as (id: string, notes: string, items: unknown[]) => Promise<void>)("PRJ-001", "ok", items);

      expect(mockApiFetch).toHaveBeenCalledWith(`/projects/PRJ-001/closure-report/${action}`, {
        method: "POST",
        token: "valid-token",
        body: JSON.stringify(body),
      });
      expect(syncProject).toHaveBeenCalledWith(updated);
    });

    it("handleRequestFiniquito postea a closure-report/finiquito-request y sincroniza", async () => {
      const updated = createMockProject({ status: ProjectStatus.LISTO_PAGO_FINAL });
      mockApiFetch.mockResolvedValue(updated);

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));
      await result.current.handleRequestFiniquito("PRJ-001", "ok");

      const action = "finiquito-request";
      const body = { notes: "ok" };

      expect(mockApiFetch).toHaveBeenCalledWith(`/projects/PRJ-001/closure-report/${action}`, {
        method: "POST",
        token: "valid-token",
        body: JSON.stringify(body),
      });
      expect(syncProject).toHaveBeenCalledWith(updated);
    });

    it.each([
      ["handleRejectClosure", "rejection", { reason: "Faltan fotos", target: "CONTRATISTA" }],
      ["handleReturnFiniquito", "finiquito-return", { reason: "Faltan fotos" }],
    ] as const)("%s envía el motivo", async (handler, action, body) => {
      mockApiFetch.mockResolvedValue(createMockProject());

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));
      await result.current[handler]("PRJ-001", "Faltan fotos");

      expect(mockApiFetch).toHaveBeenCalledWith(`/projects/PRJ-001/closure-report/${action}`, {
        method: "POST",
        token: "valid-token",
        body: JSON.stringify(body),
      });
    });

    it("propaga el error para que la UI conserve el modal", async () => {
      mockApiFetch.mockRejectedValue(new Error("422"));

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));

      await expect(result.current.handleAuditApproval("PRJ-001")).rejects.toThrow("422");
      expect(syncProject).not.toHaveBeenCalled();
    });

    it("handleAssignResident hace PATCH con residentUserId y motivo", async () => {
      mockApiFetch.mockResolvedValue(createMockProject());

      const { result } = renderHook(() => useProjectsWorkflows(defaultOptions));
      await result.current.handleAssignResident("PRJ-001", 7, "Rotación de personal");

      expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/resident", {
        method: "PATCH",
        token: "valid-token",
        body: JSON.stringify({ residentUserId: 7, reason: "Rotación de personal" }),
      });
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

      await result.current.handleAddProject(
        {
          title: "Test",
          type: "INFRAESTRUCTURA",
          description: "desc",
          location: "loc",
          materials: [],
          estimatedTotal: 100,
        },
        { photos: [], documents: [], plans: [] },
      );

      // Verify showToast was called with the mocked function
      expect(showToast).toHaveBeenCalled();
    });
  });
});
