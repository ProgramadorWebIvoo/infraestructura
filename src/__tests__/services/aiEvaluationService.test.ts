import { describe, it, expect, vi, beforeEach } from "vitest";

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { evaluateProposals, evaluateDossier, type AIEvaluationResult } from "@/services/aiEvaluationService";
import type { Project, Proposal } from "@/types";

function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "PRJ-001",
    title: "Obra de prueba",
    description: "Descripción de la obra",
    location: "Caracas",
    type: "INFRAESTRUCTURA",
    approvedInvestmentAmount: 5000,
    ...overrides,
  } as Project;
}

function createMockProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: "PROP-001",
    contractorCode: "CTR-001",
    contractorName: "Constructora X",
    contractorRating: 4.5,
    materialCost: 1000,
    laborCost: 500,
    totalCost: 1500,
    deliveryWeeks: 4,
    negotiatedAdvancePercent: 30,
    description: "Propuesta detallada",
    ...overrides,
  } as Proposal;
}

const mockResult: AIEvaluationResult = {
  winnerContractorCode: "CTR-001",
  winnerContractorName: "Constructora X",
  confidenceScore: 92,
  summary: "Mejor relación costo-beneficio.",
  strengths: ["Precio competitivo"],
  weaknesses: [],
  riskFactors: [],
  recommendation: "Adjudicar a Constructora X.",
  providerUsed: "chatgpt",
};

describe("evaluateProposals", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue(mockResult);
  });

  it("llama a POST /ai/evaluate-proposals con el token de auth", async () => {
    await evaluateProposals(createMockProject(), [createMockProposal()], "auth-token-123");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/ai/evaluate-proposals",
      expect.objectContaining({ method: "POST", token: "auth-token-123" }),
    );
  });

  it("arma el payload con los datos del proyecto y aproximados de inversión", async () => {
    const project = createMockProject({ approvedInvestmentAmount: 7500 });
    await evaluateProposals(project, [createMockProposal()], "token");

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body);
    expect(body.projectId).toBe("PRJ-001");
    expect(body.approvedInvestmentAmount).toBe(7500);
  });

  it("usa 0 como approvedInvestmentAmount si el proyecto no lo tiene", async () => {
    const project = createMockProject({ approvedInvestmentAmount: undefined });
    await evaluateProposals(project, [createMockProposal()], "token");

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body);
    expect(body.approvedInvestmentAmount).toBe(0);
  });

  it("mapea solo los campos relevantes de cada propuesta", async () => {
    const proposal = createMockProposal({ id: "PROP-42" });
    await evaluateProposals(createMockProject(), [proposal], "token");

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body);
    expect(body.proposals).toEqual([{
      id: "PROP-42",
      contractorCode: "CTR-001",
      contractorName: "Constructora X",
      contractorRating: 4.5,
      materialCost: 1000,
      laborCost: 500,
      totalCost: 1500,
      deliveryWeeks: 4,
      negotiatedAdvancePercent: 30,
      description: "Propuesta detallada",
    }]);
  });

  it("no incluye `provider` en el payload si no se especifica", async () => {
    await evaluateProposals(createMockProject(), [createMockProposal()], "token");

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body);
    expect(body.provider).toBeUndefined();
  });

  it("incluye `provider` en el payload cuando se especifica", async () => {
    await evaluateProposals(createMockProject(), [createMockProposal()], "token", "gemini");

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body);
    expect(body.provider).toBe("gemini");
  });

  it("retorna el resultado tal cual lo entrega apiFetch", async () => {
    const result = await evaluateProposals(createMockProject(), [createMockProposal()], "token");
    expect(result).toEqual(mockResult);
  });

  it("propaga el error si apiFetch falla", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Todos los proveedores fallaron."));

    await expect(
      evaluateProposals(createMockProject(), [createMockProposal()], "token"),
    ).rejects.toThrow("Todos los proveedores fallaron.");
  });
});

describe("evaluateDossier", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("llama a POST /projects/{id}/evaluate-dossier con el token de auth", async () => {
    const project = createMockProject();
    mockApiFetch.mockResolvedValueOnce(project);

    await evaluateDossier("PRJ-001", "auth-token-123");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/projects/PRJ-001/evaluate-dossier",
      { method: "POST", token: "auth-token-123" },
    );
  });

  it("retorna el Project actualizado", async () => {
    const project = createMockProject({ dossierAiScore: 82 } as Partial<Project>);
    mockApiFetch.mockResolvedValueOnce(project);

    const result = await evaluateDossier("PRJ-001", "token");
    expect(result).toEqual(project);
  });

  it("propaga el error si apiFetch falla", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("La evaluación no está disponible."));

    await expect(evaluateDossier("PRJ-001", "token")).rejects.toThrow("La evaluación no está disponible.");
  });
});
