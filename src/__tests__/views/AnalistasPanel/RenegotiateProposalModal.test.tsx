import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RenegotiateProposalModal from "@/views/AnalistasPanel/components/RenegotiateProposalModal";
import { useExchangeRatesStore } from "@/stores/exchangeRatesStore";
import { usePublicSettingsStore } from "@/stores/publicSettingsStore";
import { useUsdRateModeStore } from "@/stores/usdRateModeStore";
import type { Project, Proposal } from "@/types";

vi.mock("@/services/api", () => ({ apiFetch: vi.fn().mockRejectedValue(new Error("sin red")) }));

const rate = (id: number, code: string, value: number) => ({ id, currency_code: code, rate_to_usd: value, source: "DOLARVZLA_API" as const, effective_at: "2026-01-01", created_at: "", updated_at: "" });

const project = { id: "PRJ-1", title: "Obra", type: "INFRAESTRUCTURA", description: "", location: "Sede", createdDate: "2026-01-01", status: "COMPARATIVA_ENVIADA", materials: [], approvedInvestmentAmount: 100000 } as unknown as Project;

// 1.200 USDT = 1.500 USD-BCV (USDT 1.000 / USD 800 = 1,25).
const proposal = {
  id: "PROP-1",
  contractorCode: "CON-1",
  contractorName: "Constructora",
  materialCost: 1500,
  laborCost: 0,
  laborCostOriginal: 0,
  totalCost: 1500,
  totalCostOriginal: 1200,
  quoteCurrency: "USDT",
  fxRateToBase: 1.25,
  deliveryWeeks: 2,
  negotiatedAdvancePercent: 30,
  description: "Oferta",
  origen: "MANUAL",
  fechaOferta: "2026-09-30",
  materialItems: [{ materialName: "Cabilla", quantity: 1, unit: "und", unitPrice: 1200, totalPrice: 1200 }],
} as unknown as Proposal;

describe("RenegotiateProposalModal — dólar activo", () => {
  beforeEach(() => {
    useExchangeRatesStore.setState({ rates: [rate(1, "USD", 800), rate(2, "USDT", 1000)], isLoading: false, hasLoaded: true });
    usePublicSettingsStore.setState({ settings: { sincronizacion_tasa: [{ key: "tasa_switch_roles", value: JSON.stringify(["ANALISTA"]) }] } });
  });

  it("en modo BCV el equivalente del precio anterior está en USD-BCV", () => {
    useUsdRateModeStore.setState({ mode: "BCV", sessionRole: "ANALISTA" });
    render(<RenegotiateProposalModal project={project} proposal={proposal} onClose={() => {}} onRenegotiateProposal={async () => {}} />);

    expect(screen.getAllByText(/= \$1,500\.00 USD-BCV/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Diferencia \(USD-BCV\)/)).toBeInTheDocument();
  });

  it("en modo USDT el equivalente pasa a USD-USDT (1.200 USDT = $1.200)", () => {
    useUsdRateModeStore.setState({ mode: "USDT", sessionRole: "ANALISTA" });
    render(<RenegotiateProposalModal project={project} proposal={proposal} onClose={() => {}} onRenegotiateProposal={async () => {}} />);

    expect(screen.getAllByText(/= \$1,200\.00 USD-USDT/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Diferencia \(USD-USDT\)/)).toBeInTheDocument();
  });
});
