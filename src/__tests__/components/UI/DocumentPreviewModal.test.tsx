import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DocumentPreviewModal from "@/components/UI/DocumentPreviewModal";
import { ToastProvider } from "@/components/UI/Toast";
import type { ProjectDocument } from "@/types";

const mockApiDownload = vi.fn();
vi.mock("@/services/api", () => ({
  apiDownload: (...args: unknown[]) => mockApiDownload(...args),
}));

vi.mock("react-dom", () => ({
  createPortal: (content: React.ReactNode) => content,
}));

// pdfjs-dist import dinámico — mockeado para no depender de rendering real de canvas en jsdom.
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: () => Promise.resolve({
        getViewport: () => ({ width: 100, height: 100 }),
        render: () => ({ promise: Promise.resolve() }),
      }),
    }),
  }),
}));
vi.mock("pdfjs-dist/build/pdf.worker.mjs?url", () => ({ default: "worker-url" }));

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

afterEach(() => {
  vi.restoreAllMocks();
  mockApiDownload.mockReset();
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
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

describe("DocumentPreviewModal", () => {
  it("renderiza un PDF vía pdfjs cuando el mimeType es application/pdf", async () => {
    URL.createObjectURL = vi.fn(() => "blob:pdf-url");
    URL.revokeObjectURL = vi.fn();
    mockApiDownload.mockResolvedValueOnce(new Blob(["pdf-content"], { type: "application/pdf" }));

    render(
      <ToastProvider>
        <DocumentPreviewModal
          isOpen
          onClose={vi.fn()}
          projectId="PRJ-001"
          document={makeDoc({ mimeType: "application/pdf" })}
          authToken="t"
          onDownload={vi.fn()}
        />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(mockApiDownload).toHaveBeenCalledWith("/projects/PRJ-001/documents/1/preview", { token: "t" });
    });
  });

  it("renderiza una imagen con <img> cuando el mimeType es image/*", async () => {
    URL.createObjectURL = vi.fn(() => "blob:image-url");
    URL.revokeObjectURL = vi.fn();
    mockApiDownload.mockResolvedValueOnce(new Blob(["img"], { type: "image/png" }));

    render(
      <ToastProvider>
        <DocumentPreviewModal
          isOpen
          onClose={vi.fn()}
          projectId="PRJ-001"
          document={makeDoc({ id: 2, mimeType: "image/png", originalName: "foto.png" })}
          authToken="t"
          onDownload={vi.fn()}
        />
      </ToastProvider>,
    );

    await waitFor(() => {
      const img = screen.getByAltText("foto.png") as HTMLImageElement;
      expect(img.src).toContain("blob:image-url");
    });
  });

  it("muestra mensaje de formato no soportado para DWG/DXF", async () => {
    URL.createObjectURL = vi.fn(() => "blob:dwg-url");
    URL.revokeObjectURL = vi.fn();
    mockApiDownload.mockResolvedValueOnce(new Blob(["dwg"], { type: "application/acad" }));

    render(
      <ToastProvider>
        <DocumentPreviewModal
          isOpen
          onClose={vi.fn()}
          projectId="PRJ-001"
          document={makeDoc({ id: 3, mimeType: "application/acad", originalName: "plano.dwg" })}
          authToken="t"
          onDownload={vi.fn()}
        />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Vista previa no disponible para este formato. Descargar archivo.")).toBeInTheDocument();
    });
  });
});
