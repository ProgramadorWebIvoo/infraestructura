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
        project={makeProject([
          makeDoc({ id: 1, documentType: "PLANO", documentGroupId: 1 }),
          makeDoc({ id: 2, documentType: "CALC", documentGroupId: 2 }),
        ])}
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

  it("muestra fila atenuada con badge 'Eliminado' y sin acciones de ver/descargar cuando deletedAt está presente", () => {
    render(
      <ProjectDocumentsList
        project={makeProject([makeDoc({ id: 1, originalName: "plano-borrado.pdf", deletedAt: "2026-08-26T12:50:00Z" })])}
        onDownload={vi.fn()}
        onPreview={vi.fn()}
      />,
    );

    expect(screen.getByText("Eliminado")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ver")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Descargar")).not.toBeInTheDocument();
  });

  it("marca la versión de mayor versionNumber viva como 'Actual' cuando hay varias del mismo grupo", () => {
    render(
      <ProjectDocumentsList
        project={makeProject([
          makeDoc({ id: 1, originalName: "v1.pdf", documentGroupId: 1, versionNumber: 1 }),
          makeDoc({ id: 2, originalName: "v2.pdf", documentGroupId: 1, versionNumber: 2 }),
        ])}
        onDownload={vi.fn()}
        onPreview={vi.fn()}
      />,
    );

    expect(screen.getByText("Actual")).toBeInTheDocument();
    // Solo una fila debe llevar el badge — la V2 (mayor versionNumber vivo).
    expect(screen.getAllByText("Actual")).toHaveLength(1);
  });

  it("no marca 'Actual' en documentos eliminados", () => {
    render(
      <ProjectDocumentsList
        project={makeProject([
          makeDoc({ id: 1, originalName: "borrado.pdf", documentGroupId: 1, versionNumber: 1, deletedAt: "2026-08-26T12:50:00Z" }),
        ])}
        onDownload={vi.fn()}
        onPreview={vi.fn()}
      />,
    );

    expect(screen.queryByText("Actual")).not.toBeInTheDocument();
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

  describe("mode='manage' — Nueva versión", () => {
    it("no muestra el botón 'Subir nueva versión' en mode='view' (default)", () => {
      render(
        <ProjectDocumentsList project={makeProject([makeDoc()])} onDownload={vi.fn()} onPreview={vi.fn()} />,
      );
      expect(screen.queryByLabelText("Subir nueva versión")).not.toBeInTheDocument();
    });

    it("muestra el botón 'Subir nueva versión' en mode='manage' para un documento vivo", () => {
      render(
        <ProjectDocumentsList
          project={makeProject([makeDoc()])}
          onDownload={vi.fn()}
          onPreview={vi.fn()}
          mode="manage"
          onRequestNewVersion={vi.fn()}
        />,
      );
      expect(screen.getByLabelText("Subir nueva versión")).toBeInTheDocument();
    });

    it("no muestra 'Subir nueva versión' para un documento eliminado, incluso en mode='manage'", () => {
      render(
        <ProjectDocumentsList
          project={makeProject([makeDoc({ deletedAt: "2026-08-26T12:50:00Z" })])}
          onDownload={vi.fn()}
          onPreview={vi.fn()}
          mode="manage"
          onRequestNewVersion={vi.fn()}
        />,
      );
      expect(screen.queryByLabelText("Subir nueva versión")).not.toBeInTheDocument();
    });

    it("elegir un archivo dispara onRequestNewVersion con el documento y el archivo", () => {
      const onRequestNewVersion = vi.fn();
      const doc = makeDoc({ id: 5 });
      render(
        <ProjectDocumentsList
          project={makeProject([doc])}
          onDownload={vi.fn()}
          onPreview={vi.fn()}
          mode="manage"
          onRequestNewVersion={onRequestNewVersion}
        />,
      );

      const file = new File(["contenido"], "nueva-version.pdf", { type: "application/pdf" });
      fireEvent.click(screen.getByLabelText("Subir nueva versión"));
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      expect(onRequestNewVersion).toHaveBeenCalledWith(doc, file);
    });

    it("muestra el chip 'Nueva versión lista' cuando pendingReplacementFor devuelve un archivo, con opción de quitar", () => {
      const onClearReplacement = vi.fn();
      const pendingFile = new File(["x"], "reemplazo.pdf");
      render(
        <ProjectDocumentsList
          project={makeProject([makeDoc({ id: 9 })])}
          onDownload={vi.fn()}
          onPreview={vi.fn()}
          mode="manage"
          onRequestNewVersion={vi.fn()}
          pendingReplacementFor={(id) => (id === 9 ? pendingFile : undefined)}
          onClearReplacement={onClearReplacement}
        />,
      );

      expect(screen.getByText(/Nueva versión lista: reemplazo\.pdf/)).toBeInTheDocument();

      fireEvent.click(screen.getByText("Quitar"));
      expect(onClearReplacement).toHaveBeenCalledWith(9);
    });
  });

  describe("Agrupación por documento + acordeón de versiones anteriores", () => {
    it("agrupa V1 y V2 del mismo grupo en UNA sola fila (la vigente), no dos filas sueltas", () => {
      render(
        <ProjectDocumentsList
          project={makeProject([
            makeDoc({ id: 1, originalName: "v1.pdf", documentGroupId: 1, versionNumber: 1 }),
            makeDoc({ id: 2, originalName: "v2.pdf", documentGroupId: 1, versionNumber: 2 }),
          ])}
          onDownload={vi.fn()}
          onPreview={vi.fn()}
        />,
      );

      expect(screen.getByText("Planos de Ingeniería (1)")).toBeInTheDocument();
      expect(screen.getByText("v2.pdf")).toBeInTheDocument();
      expect(screen.queryByText("v1.pdf")).not.toBeInTheDocument();
    });

    it("no muestra la flecha de expandir cuando el documento no tiene versiones anteriores", () => {
      render(
        <ProjectDocumentsList project={makeProject([makeDoc()])} onDownload={vi.fn()} onPreview={vi.fn()} />,
      );
      expect(screen.queryByLabelText("Ver versiones anteriores")).not.toBeInTheDocument();
    });

    it("expandir la flecha revela la versión anterior; colapsar la vuelve a ocultar", () => {
      render(
        <ProjectDocumentsList
          project={makeProject([
            makeDoc({ id: 1, originalName: "v1.pdf", documentGroupId: 1, versionNumber: 1 }),
            makeDoc({ id: 2, originalName: "v2.pdf", documentGroupId: 1, versionNumber: 2 }),
          ])}
          onDownload={vi.fn()}
          onPreview={vi.fn()}
        />,
      );

      expect(screen.queryByLabelText("Ver V1")).not.toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Ver versiones anteriores"));
      expect(screen.getByLabelText("Ver V1")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Ver versiones anteriores"));
      expect(screen.queryByLabelText("Ver V1")).not.toBeInTheDocument();
    });

    it("un grupo completamente eliminado se muestra como UNA fila 'Eliminado' con la última versión, expandible a sus versiones previas", () => {
      render(
        <ProjectDocumentsList
          project={makeProject([
            makeDoc({ id: 1, originalName: "v1.pdf", documentGroupId: 1, versionNumber: 1, deletedAt: "2026-08-26T13:11:00Z" }),
            makeDoc({ id: 2, originalName: "v2.pdf", documentGroupId: 1, versionNumber: 2, deletedAt: "2026-08-26T13:11:56Z" }),
          ])}
          onDownload={vi.fn()}
          onPreview={vi.fn()}
        />,
      );

      expect(screen.getByText("Planos de Ingeniería (1)")).toBeInTheDocument();
      expect(screen.getByText("Eliminado")).toBeInTheDocument();
      expect(screen.getByText("v2.pdf")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Ver versiones anteriores"));
      // La fila del acordeón muestra la fecha de subida en vez del nombre
      // cuando uploadedAt está presente (mismo criterio que la fila
      // principal) — V1 se identifica por su badge, no por originalName.
      expect(screen.queryByLabelText("Ver V1")).not.toBeInTheDocument();
    });

    it("un grupo vivo con historial eliminado en el medio (ej. V2 borrada, V1 y V3 vivas) sigue mostrando V3 como Actual", () => {
      render(
        <ProjectDocumentsList
          project={makeProject([
            makeDoc({ id: 1, originalName: "v1.pdf", documentGroupId: 1, versionNumber: 1 }),
            makeDoc({ id: 3, originalName: "v3.pdf", documentGroupId: 1, versionNumber: 3 }),
          ])}
          onDownload={vi.fn()}
          onPreview={vi.fn()}
        />,
      );

      expect(screen.getByText("Actual")).toBeInTheDocument();
      expect(screen.getByText("v3.pdf")).toBeInTheDocument();
    });
  });
});
