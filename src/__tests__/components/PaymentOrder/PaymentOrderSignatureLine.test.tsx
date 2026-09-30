import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import PaymentOrderSignatureLine from "@/components/PaymentOrder/PaymentOrderSignatureLine";
import type { PaymentOrderDetail } from "@/types";

vi.mock("@/components/UI/Toast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));

const mockFetch = vi.fn();
const mockSign = vi.fn();
vi.mock("@/services/paymentOrders", () => ({
  fetchPaymentOrder: (...args: unknown[]) => mockFetch(...args),
  signPaymentOrder: (...args: unknown[]) => mockSign(...args),
}));

function detail(overrides: Partial<PaymentOrderDetail> = {}): PaymentOrderDetail {
  return {
    id: 1, number: 3, projectId: "PRJ-1", proposalId: "PROP-1", contractorCode: "CON-1",
    paymentType: "ADVANCE", amount: 3000, amountBase: 3000, currency: "USD", exchangeRate: null,
    status: "EN_FIRMA", contentHash: "abc", voidReason: null, elaboratedByName: null,
    snapshot: { project: { id: "PRJ-1", title: "Obra", location: "Caracas" }, contractor: { code: "CON-1", name: "X", rif: "J-1" }, proposal: { id: "PROP-1", total_cost: "10000", negotiated_advance_percent: "30", currency: "USD" }, payment_type: "ADVANCE", amount: "3000" },
    createdAt: "2026-09-30T00:00:00Z",
    pendingRequiredSignature: null,
    integrityValid: true,
    canSign: true,
    signatureLine: [
      { step: { id: 1, paymentType: "ADVANCE", stepOrder: 1, role: "PROCURA", userId: null, userName: null, label: "Elaboración", isActive: true, isRequired: true }, status: "FIRMADO", signedByName: "Ana Procura", signedAt: "2026-09-30T01:00:00Z" },
      { step: { id: 2, paymentType: "ADVANCE", stepOrder: 2, role: "PRESIDENCIA", userId: null, userName: null, label: "Aprobación", isActive: true, isRequired: true }, status: "PROXIMO", signedByName: null, signedAt: null },
      { step: { id: 3, paymentType: "ADVANCE", stepOrder: 3, role: "FINANZAS", userId: null, userName: null, label: "Pago", isActive: true, isRequired: true }, status: "PENDIENTE", signedByName: null, signedAt: null },
    ],
    ...overrides,
  };
}

describe("PaymentOrderSignatureLine", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockSign.mockReset();
  });

  it("no renderiza nada cuando el tipo de pago no tiene pasos configurados", async () => {
    mockFetch.mockResolvedValue(detail({ signatureLine: [] }));
    const { container } = render(<PaymentOrderSignatureLine orderId={1} authToken="t" />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra firmado, próximo y pendiente, con el botón Firmar solo en el próximo paso cuando canSign", async () => {
    mockFetch.mockResolvedValue(detail());
    render(<PaymentOrderSignatureLine orderId={1} authToken="t" />);

    await waitFor(() => expect(screen.getByText("Elaboración")).toBeInTheDocument());
    expect(screen.getByText(/Firmado por Ana Procura/)).toBeInTheDocument();
    expect(screen.getByText("Aprobación")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Firmar" })).toBeInTheDocument();
  });

  it("oculta el botón Firmar cuando no le corresponde al usuario actual", async () => {
    mockFetch.mockResolvedValue(detail({ canSign: false }));
    render(<PaymentOrderSignatureLine orderId={1} authToken="t" />);

    await waitFor(() => expect(screen.getByText("Aprobación")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Firmar" })).not.toBeInTheDocument();
  });

  it("firma tras confirmar y refresca la línea", async () => {
    mockFetch.mockResolvedValueOnce(detail());
    mockSign.mockResolvedValue(undefined);
    const signedDetail = detail({
      signatureLine: [
        { step: { id: 1, paymentType: "ADVANCE", stepOrder: 1, role: "PROCURA", userId: null, userName: null, label: "Elaboración", isActive: true, isRequired: true }, status: "FIRMADO", signedByName: "Ana Procura", signedAt: "2026-09-30T01:00:00Z" },
        { step: { id: 2, paymentType: "ADVANCE", stepOrder: 2, role: "PRESIDENCIA", userId: null, userName: null, label: "Aprobación", isActive: true, isRequired: true }, status: "FIRMADO", signedByName: "Pedro Presidente", signedAt: "2026-09-30T02:00:00Z" },
        { step: { id: 3, paymentType: "ADVANCE", stepOrder: 3, role: "FINANZAS", userId: null, userName: null, label: "Pago", isActive: true, isRequired: true }, status: "PROXIMO", signedByName: null, signedAt: null },
      ],
    });
    mockFetch.mockResolvedValueOnce(signedDetail);
    const onSigned = vi.fn();

    render(<PaymentOrderSignatureLine orderId={1} authToken="t" onSigned={onSigned} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Firmar" })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Firmar" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Firmar" }));

    await waitFor(() => expect(mockSign).toHaveBeenCalledWith(1, "t"));
    await waitFor(() => expect(onSigned).toHaveBeenCalled());
    expect(screen.getByText(/Firmado por Pedro Presidente/)).toBeInTheDocument();
  });
});
