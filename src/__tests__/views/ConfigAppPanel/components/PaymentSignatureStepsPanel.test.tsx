import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PaymentSignatureStepsPanel from "@/views/ConfigAppPanel/components/PaymentSignatureStepsPanel";

const mockShowToast = vi.fn();
vi.mock("@/components/UI/Toast", () => ({ useToast: () => ({ showToast: mockShowToast }) }));

const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));

Element.prototype.scrollIntoView = vi.fn();

const STEPS = [
  { id: 1, paymentType: "ADVANCE" as const, stepOrder: 1, role: "PROCURA", userId: null, userName: null, label: "Elaboración", isActive: true },
  { id: 2, paymentType: "ADVANCE" as const, stepOrder: 2, role: "PRESIDENCIA", userId: null, userName: null, label: "Aprobación", isActive: true },
];

describe("PaymentSignatureStepsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockImplementation((path: string) =>
      Promise.resolve(path === "/roles" ? ["PROCURA", "PRESIDENCIA", "FINANZAS"] : STEPS),
    );
  });

  it("lista los pasos configurados con su tipo y rol", async () => {
    render(<PaymentSignatureStepsPanel authToken="t" />);
    await waitFor(() => expect(screen.getByText("Elaboración")).toBeInTheDocument());
    expect(screen.getByText("Aprobación")).toBeInTheDocument();
    expect(screen.getAllByText("Anticipo")).toHaveLength(2);
    expect(screen.getByText("Selección de contratista o envío a Finanzas")).toBeInTheDocument();
    expect(screen.getByText("Aprobación de la adjudicación")).toBeInTheDocument();
  });

  it("crea un paso nuevo eligiendo el rol en el Select", async () => {
    render(<PaymentSignatureStepsPanel authToken="t" />);
    await waitFor(() => expect(screen.getByText("Elaboración")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Nuevo paso" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Orden del paso"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("combobox", { name: "Rol que firma" }));
    fireEvent.click(await screen.findByRole("option", { name: "Finanzas" }));
    expect(screen.getByText("Liberación del anticipo (pago)")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Etiqueta del paso"), { target: { value: "Pago" } });

    mockApiFetch.mockResolvedValueOnce({});
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith("Paso de firma creado correctamente.", "success"));
    const call = mockApiFetch.mock.calls.find(([, opts]) => (opts as { method?: string })?.method === "POST")!;
    expect(call[0]).toBe("/payment-signature-steps/config");
    expect(JSON.parse((call[1] as { body: string }).body)).toEqual({ paymentType: "ADVANCE", stepOrder: 3, role: "FINANZAS", label: "Pago" });
  });

  it("rechaza guardar sin rol o etiqueta", async () => {
    render(<PaymentSignatureStepsPanel authToken="t" />);
    await waitFor(() => expect(screen.getByText("Elaboración")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Nuevo paso" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(mockShowToast).toHaveBeenCalledWith("Completa el orden, el rol que firma y una etiqueta.", "error");
  });

  it("elimina un paso tras confirmar", async () => {
    render(<PaymentSignatureStepsPanel authToken="t" />);
    await waitFor(() => expect(screen.getByText("Elaboración")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Elaboración" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    mockApiFetch.mockResolvedValueOnce({});
    mockApiFetch.mockResolvedValueOnce([STEPS[1]]);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith("Paso de firma eliminado correctamente.", "success"));
  });
});
