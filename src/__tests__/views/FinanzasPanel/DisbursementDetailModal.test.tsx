import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DisbursementDetailModal from "@/views/FinanzasPanel/components/DisbursementDetailModal";
import type { LedgerEntry } from "@/views/FinanzasPanel/components/LedgerSection";
import type { Disbursement } from "@/hooks/useFinanceDisbursements";
import { useExchangeRatesStore } from "@/stores/exchangeRatesStore";
import { useUsdRateModeStore } from "@/stores/usdRateModeStore";

const mockApiFetch = vi.fn();
const mockDownload = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  downloadProjectDocument: (...args: unknown[]) => mockDownload(...args),
  apiDownload: vi.fn(),
}));
vi.mock("@/components/UI/DocumentPreviewModal", () => ({
  default: ({ isOpen, document }: { isOpen: boolean; document: { originalName: string } | null }) =>
    isOpen ? <div role="dialog" aria-label="Previsualizador">{document?.originalName}</div> : null,
}));

const rate = (id: number, code: string, value: number) => ({ id, currency_code: code, rate_to_usd: value, source: "DOLARVZLA_API" as const, effective_at: "2026-01-01", created_at: "", updated_at: "" });

const entry: LedgerEntry = {
  id: "TXN-ADV-PRJ-1", projectId: "PRJ-1", title: "Obra de prueba", contractorCode: "CON-1", type: "ANTICIPO",
  amount: 450, date: "2026-09-25", voucher: "VCH-PRJ-1-A", quoteCurrency: "USDT", fxRateToBase: 1.25,
};

const detail: Disbursement = {
  id: 7, projectId: "PRJ-1", title: "Obra de prueba", contractorCode: "CON-1", contractorName: "Proveedor Uno", type: "ADVANCE",
  amount: 450, paidDate: "2026-09-25", bank: "Banesco", reference: "REF-9", notes: "Pago puntual", orderNumber: "OP-0001",
  proof: { id: 55, name: "comprobante.pdf" }, quoteCurrency: "USDT", fxRateToBase: 1.25,
  settlement: {
    id: 7, type: "ADVANCE", paidDate: "2026-09-25", bank: "Banesco", reference: "REF-9", notes: null, amountBase: 450, baseCurrency: "USD",
    paymentMode: "BS", obligationAmount: 360, obligationCurrency: "USDT", paidCurrency: "VES", paidAmount: 360000, appliedRate: 1000,
    appliedRateSource: "USDT", suggestedRate: 1000, coveredAmount: 360, differenceAmount: 0, differenceReason: null,
    contractRateFreeze: null, paymentRateFreeze: null,
  },
};

function renderModal(e: LedgerEntry | null = entry) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DisbursementDetailModal entry={e} authToken="token" onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe("DisbursementDetailModal", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockDownload.mockReset();
    useExchangeRatesStore.setState({ rates: [rate(1, "USD", 800), rate(2, "USDT", 1000)], isLoading: false, hasLoaded: true });
    useUsdRateModeStore.setState({ mode: "BCV", sessionRole: null });
  });

  it("no consulta nada mientras no hay un egreso abierto", () => {
    renderModal(null);

    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("muestra monto con conversor, banco, referencia, orden, cómo se pagó y el comprobante", async () => {
    mockApiFetch.mockResolvedValue([detail]);
    renderModal();

    expect(await screen.findByText("Banesco")).toBeInTheDocument();
    expect(screen.getByText("REF-9")).toBeInTheDocument();
    expect(screen.getByText("OP-0001")).toBeInTheDocument();
    expect(screen.getByText("Proveedor Uno")).toBeInTheDocument();
    expect(screen.getByText("Pago puntual")).toBeInTheDocument();
    expect(screen.getByText(/Cotizado:/)).toBeInTheDocument();
    expect(screen.getByText(/Tasa aplicada:/)).toBeInTheDocument();
    expect(screen.getByText("comprobante.pdf")).toBeInTheDocument();
    expect(mockApiFetch).toHaveBeenCalledWith("/finance/disbursements", { token: "token" });
  });

  it("previsualiza y descarga el comprobante", async () => {
    mockApiFetch.mockResolvedValue([detail]);
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole("button", { name: /Ver comprobante comprobante\.pdf/ }));
    expect(screen.getByRole("dialog", { name: "Previsualizador" })).toHaveTextContent("comprobante.pdf");

    await user.click(screen.getByRole("button", { name: /Descargar comprobante comprobante\.pdf/ }));
    await waitFor(() => expect(mockDownload).toHaveBeenCalledWith("PRJ-1", { id: 55, originalName: "comprobante.pdf" }, "token"));
  });

  it("un pago sin comprobante ni liquidación lo indica en vez de inventar datos", async () => {
    mockApiFetch.mockResolvedValue([{ ...detail, proof: null, settlement: null }]);
    renderModal();

    expect(await screen.findByText("Sin comprobante.")).toBeInTheDocument();
    expect(screen.getByText(/Sin detalle de moneda/)).toBeInTheDocument();
  });

  it("si el detalle no llega, avisa", async () => {
    mockApiFetch.mockRejectedValue(new Error("boom"));
    renderModal();

    expect(await screen.findByText("No se pudo cargar el detalle del pago.")).toBeInTheDocument();
  });
});
