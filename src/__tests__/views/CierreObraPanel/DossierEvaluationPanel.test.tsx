import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DossierEvaluationPanel from "@/views/CierreObraPanel/components/DossierEvaluationPanel";
import { ToastProvider } from "@/components/UI/Toast";
import type { Project } from "@/types";

const mockEvaluateDossier = vi.fn();
vi.mock("@/services/aiEvaluationService", () => ({
  evaluateDossier: (...args: unknown[]) => mockEvaluateDossier(...args),
}));

afterEach(() => {
  vi.restoreAllMocks();
  mockEvaluateDossier.mockReset();
});

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "PRJ-001",
    title: "Obra de prueba",
    type: "INFRAESTRUCTURA",
    description: "desc",
    location: "loc",
    createdDate: "2026-08-01",
    status: "CREADO",
    materials: [],
    estimatedTotal: 1000,
    ...overrides,
  } as Project;
}

function renderPanel(project: Project, onEvaluated = vi.fn()) {
  render(
    <ToastProvider>
      <DossierEvaluationPanel project={project} authToken="test-token" onEvaluated={onEvaluated} />
    </ToastProvider>,
  );
  return { onEvaluated };
}

describe("DossierEvaluationPanel", () => {
  it("dispara la evaluación automáticamente al montar si no hay resultado previo", async () => {
    const evaluated = makeProject({ dossierAiScore: 80, dossierAiEvaluatedAt: "2026-08-24T00:00:00Z" });
    mockEvaluateDossier.mockResolvedValueOnce(evaluated);

    const { onEvaluated } = renderPanel(makeProject());

    await waitFor(() => expect(mockEvaluateDossier).toHaveBeenCalledWith("PRJ-001", "test-token"));
    await waitFor(() => expect(onEvaluated).toHaveBeenCalledWith(evaluated));
  });

  it("no re-dispara si el proyecto ya tiene evaluación", () => {
    const project = makeProject({
      dossierAiScore: 90,
      dossierAiEvaluatedAt: "2026-08-24T00:00:00Z",
      dossierAiSummary: "Todo en orden.",
      dossierAiProvider: "openai",
    });

    renderPanel(project);

    expect(mockEvaluateDossier).not.toHaveBeenCalled();
    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByText("Todo en orden.")).toBeInTheDocument();
  });

  it("muestra score, alertas y recomendación cuando hay resultado", () => {
    const project = makeProject({
      dossierAiScore: 65,
      dossierAiEvaluatedAt: "2026-08-24T00:00:00Z",
      dossierAiAlerts: ["Faltan planos de detalle."],
      dossierAiSuggestedAmount: 42000,
      dossierAiRecommendation: "Proceder con reservas.",
      dossierAiProvider: "anthropic",
    });

    renderPanel(project);

    expect(screen.getByText("65")).toBeInTheDocument();
    expect(screen.getByText("Faltan planos de detalle.")).toBeInTheDocument();
    expect(screen.getByText("Proceder con reservas.")).toBeInTheDocument();
    expect(screen.getByText(/Evaluado por anthropic/)).toBeInTheDocument();
  });

  it("no muestra el monto sugerido — es dato de Procura, no de Cierre de Obra", () => {
    const project = makeProject({
      dossierAiScore: 65,
      dossierAiEvaluatedAt: "2026-08-24T00:00:00Z",
      dossierAiSuggestedAmount: 42000,
      dossierAiProvider: "anthropic",
    });

    renderPanel(project);

    expect(screen.queryByText(/Monto Sugerido/)).not.toBeInTheDocument();
    expect(screen.queryByText(/42000|42,000/)).not.toBeInTheDocument();
  });

  it("botón Reevaluar dispara una nueva evaluación", async () => {
    const project = makeProject({ dossierAiScore: 70, dossierAiEvaluatedAt: "2026-08-24T00:00:00Z" });
    const reevaluated = makeProject({ dossierAiScore: 85, dossierAiEvaluatedAt: "2026-08-24T01:00:00Z" });
    mockEvaluateDossier.mockResolvedValueOnce(reevaluated);

    const { onEvaluated } = renderPanel(project);

    fireEvent.click(screen.getByText("Reevaluar"));

    await waitFor(() => expect(onEvaluated).toHaveBeenCalledWith(reevaluated));
  });

  it("muestra estado sin evaluación y botón de reintento cuando falla", async () => {
    mockEvaluateDossier.mockRejectedValueOnce(new Error("La evaluación no está disponible."));

    renderPanel(makeProject());

    expect(await screen.findByText("Evaluación IA no disponible para este expediente.")).toBeInTheDocument();
    expect(screen.getByText("Reintentar evaluación")).toBeInTheDocument();
  });
});
