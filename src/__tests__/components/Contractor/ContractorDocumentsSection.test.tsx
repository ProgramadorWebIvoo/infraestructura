import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ContractorDocumentsSection from "@/components/Contractor/ContractorDocumentsSection";

vi.mock("@/components/UI/Toast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock("@/components/UI/DocumentPreviewModal", () => ({ default: () => null }));
vi.mock("@/hooks/useContractorDocumentTypes", () => ({
  useContractorDocumentTypes: () => ({
    types: [
      { id: 1, key: "rif", label: "RIF de la empresa", isRequired: true, isActive: true, sortOrder: 10 },
      { id: 2, key: "acta", label: "Acta", isRequired: true, isActive: true, sortOrder: 20 },
    ],
    isLoading: false,
    hasError: false,
  }),
}));

const mockFetch = vi.fn();
vi.mock("@/services/contractorDocuments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/contractorDocuments")>()),
  fetchContractorDocuments: (...args: unknown[]) => mockFetch(...args),
}));

const DOC = {
  id: 10, contractorCode: "CON-1", documentTypeId: 1, documentTypeLabel: "RIF de la empresa", originalName: "rif.pdf",
  mimeType: "application/pdf", sizeBytes: 2048, sha256: "x", versionNumber: 2, documentGroupId: 10,
  source: "INTERNAL", uploadedBy: 1, uploadedAt: "2026-09-29T00:00:00Z", deletedAt: null,
};

describe("ContractorDocumentsSection", () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({ data: [DOC], completeness: { complete: false, missing: [{ id: 2, key: "acta", label: "Acta" }] } });
  });

  it("muestra el documento cargado, el faltante y la marca de documentación incompleta", async () => {
    render(<ContractorDocumentsSection contractorCode="CON-1" authToken="t" activeRole="FINANZAS" />);
    await waitFor(() => expect(screen.getByText("Documentación incompleta")).toBeInTheDocument());
    expect(screen.getByText(/rif\.pdf · v2/)).toBeInTheDocument();
    expect(screen.getByText("Faltante")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar RIF de la empresa" })).toBeInTheDocument();
  });

  it("oculta cargar/reemplazar/eliminar para roles sin permiso", async () => {
    render(<ContractorDocumentsSection contractorCode="CON-1" authToken="t" activeRole="FINANZAS" />);
    await waitFor(() => expect(screen.getByText("Faltante")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Reemplazar|Cargar|Eliminar/ })).not.toBeInTheDocument();
  });

  it("muestra las acciones de gestión a un ADMIN", async () => {
    render(<ContractorDocumentsSection contractorCode="CON-1" authToken="t" activeRole="ADMIN" />);
    await waitFor(() => expect(screen.getByText("Faltante")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Reemplazar RIF de la empresa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cargar Acta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar RIF de la empresa" })).toBeInTheDocument();
  });

  it("no renderiza nada si el backend responde 403", async () => {
    mockFetch.mockRejectedValue(Object.assign(new Error("forbidden"), { status: 403 }));
    const { container } = render(<ContractorDocumentsSection contractorCode="CON-1" authToken="t" activeRole="ANALISTA" />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
