import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ContractorDocumentTypesPanel from "@/views/ConfigAppPanel/components/ProveedoresConfigPanel/components/ContractorDocumentTypesPanel";

const mockShowToast = vi.fn();
vi.mock("@/components/UI/Toast", () => ({ useToast: () => ({ showToast: mockShowToast }) }));

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));

const TYPES = [
  { id: 1, key: "rif", label: "RIF de la empresa", isRequired: true, isActive: true, sortOrder: 10, documentsCount: 3 },
  { id: 2, key: "acta", label: "Acta", isRequired: false, isActive: true, sortOrder: 20, documentsCount: 0 },
];

describe("ContractorDocumentTypesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue(TYPES);
  });

  it("lista los tipos y bloquea eliminar los que tienen documentos", async () => {
    render(<ContractorDocumentTypesPanel authToken="t" />);
    await waitFor(() => expect(screen.getByText("RIF de la empresa")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Eliminar RIF de la empresa" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Eliminar Acta" })).toBeEnabled();
  });

  it("crea un tipo nuevo enviando el cuerpo en camelCase", async () => {
    render(<ContractorDocumentTypesPanel authToken="t" />);
    await waitFor(() => expect(screen.getByText("Acta")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Nuevo tipo de documento" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Nombre del documento/), { target: { value: "Solvencia fiscal" } });
    fireEvent.click(screen.getByLabelText("Obligatorio para el registro"));

    mockApiFetch.mockResolvedValueOnce({ id: 3, key: "solvencia_fiscal", label: "Solvencia fiscal", isRequired: false, isActive: true, sortOrder: 30 });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith("Tipo de documento creado correctamente.", "success"));
    const call = mockApiFetch.mock.calls.find(([, opts]) => (opts as { method?: string })?.method === "POST")!;
    expect(call[0]).toBe("/contractor-document-types/config");
    expect(JSON.parse((call[1] as { body: string }).body)).toEqual({ label: "Solvencia fiscal", isRequired: false });
  });

  it("rechaza guardar sin nombre", async () => {
    render(<ContractorDocumentTypesPanel authToken="t" />);
    await waitFor(() => expect(screen.getByText("Acta")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Nuevo tipo de documento" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(mockShowToast).toHaveBeenCalledWith("Ingresa el nombre del tipo de documento.", "error");
  });
});
