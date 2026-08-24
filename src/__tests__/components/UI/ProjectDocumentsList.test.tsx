import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProjectDocumentsList from "@/components/UI/ProjectDocumentsList";
import type { Project, ProjectDocument } from "@/types";

afterEach(() => {
  vi.restoreAllMocks();
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
      <ProjectDocumentsList project={makeProject([])} onDownload={vi.fn()} onPreview={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("agrupa documentos por tipo con conteo correcto", () => {
    render(
      <ProjectDocumentsList
        project={makeProject([makeDoc({ id: 1, documentType: "PLANO" }), makeDoc({ id: 2, documentType: "CALC" })])}
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
      <ProjectDocumentsList project={makeProject([doc])} onDownload={onDownload} onPreview={onPreview} />,
    );

    fireEvent.click(screen.getByLabelText("Ver"));
    expect(onPreview).toHaveBeenCalledWith(doc);

    fireEvent.click(screen.getByLabelText("Descargar"));
    expect(onDownload).toHaveBeenCalledWith(doc);
  });
});
