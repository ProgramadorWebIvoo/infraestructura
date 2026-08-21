import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProjectDocumentsList from "@/components/UI/ProjectDocumentsList";
import type { Project, ProjectDocument } from "@/types";

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

afterEach(() => {
  vi.restoreAllMocks();
  mockApiFetch.mockReset();
});

function makeDoc(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 1,
    documentType: "PLANO",
    originalName: "plano.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1000,
    uploadedAt: "2026-08-21T00:00:00Z",
    documentGroupId: 1,
    versionNumber: 1,
    ...overrides,
  };
}

function makeProject(documents: ProjectDocument[]): Project {
  return {
    id: "PRJ-001",
    title: "Test",
    type: "INFRAESTRUCTURA",
    description: "desc",
    location: "loc",
    createdDate: "2026-08-01",
    status: "REVISADO_CIERRE",
    materials: [],
    estimatedTotal: 100,
    documents,
  } as Project;
}

describe("ProjectDocumentsList", () => {
  it("no renderiza nada si el proyecto no tiene documentos", () => {
    const { container } = render(
      <ProjectDocumentsList project={makeProject([])} authToken="t" onDownload={vi.fn()} onPreview={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("agrupa documentos por tipo con conteo correcto", () => {
    render(
      <ProjectDocumentsList
        project={makeProject([makeDoc({ id: 1, documentType: "PLANO" }), makeDoc({ id: 2, documentType: "CALC" })])}
        authToken="t"
        onDownload={vi.fn()}
        onPreview={vi.fn()}
      />,
    );

    expect(screen.getByText("Planos de Ingeniería (1)")).toBeInTheDocument();
    expect(screen.getByText("Hojas de Cálculo (1)")).toBeInTheDocument();
    expect(screen.getByText("Fotos del Sitio (0)")).toBeInTheDocument();
  });

  it("muestra badge de versión solo si versionNumber > 1", () => {
    render(
      <ProjectDocumentsList
        project={makeProject([
          makeDoc({ id: 1, originalName: "v1.pdf", versionNumber: 1 }),
          makeDoc({ id: 2, originalName: "v2.pdf", versionNumber: 2 }),
        ])}
        authToken="t"
        onDownload={vi.fn()}
        onPreview={vi.fn()}
      />,
    );

    expect(screen.queryByText("V1")).not.toBeInTheDocument();
    expect(screen.getByText("V2")).toBeInTheDocument();
  });

  it("llama onPreview/onDownload al hacer click en los botones correspondientes", () => {
    const onPreview = vi.fn();
    const onDownload = vi.fn();
    const doc = makeDoc();
    render(
      <ProjectDocumentsList project={makeProject([doc])} authToken="t" onDownload={onDownload} onPreview={onPreview} />,
    );

    fireEvent.click(screen.getByTitle("Ver"));
    expect(onPreview).toHaveBeenCalledWith(doc);

    fireEvent.click(screen.getByTitle("Descargar"));
    expect(onDownload).toHaveBeenCalledWith(doc);
  });

  it("solo muestra 'Nueva versión' cuando se pasa onUploadNewVersion", () => {
    const doc = makeDoc();
    const { rerender } = render(
      <ProjectDocumentsList project={makeProject([doc])} authToken="t" onDownload={vi.fn()} onPreview={vi.fn()} />,
    );
    expect(screen.queryByText("Nueva versión")).not.toBeInTheDocument();

    const onUploadNewVersion = vi.fn();
    rerender(
      <ProjectDocumentsList
        project={makeProject([doc])}
        authToken="t"
        onDownload={vi.fn()}
        onPreview={vi.fn()}
        onUploadNewVersion={onUploadNewVersion}
      />,
    );
    fireEvent.click(screen.getByText("Nueva versión"));
    expect(onUploadNewVersion).toHaveBeenCalledWith(doc);
  });

  it("expandir historial hace fetch lazy y muestra las versiones", async () => {
    mockApiFetch.mockResolvedValueOnce({
      data: [makeDoc({ id: 1, versionNumber: 1, originalName: "v1.pdf" }), makeDoc({ id: 2, versionNumber: 2, originalName: "v2.pdf" })],
    });

    render(
      <ProjectDocumentsList
        project={makeProject([makeDoc({ id: 2, versionNumber: 2, originalName: "v2.pdf" })])}
        authToken="t"
        onDownload={vi.fn()}
        onPreview={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTitle("Historial"));

    await waitFor(() => {
      expect(screen.getByText(/V1.*v1\.pdf/)).toBeInTheDocument();
    });
    expect(mockApiFetch).toHaveBeenCalledWith("/projects/PRJ-001/documents/2/history");
  });
});
