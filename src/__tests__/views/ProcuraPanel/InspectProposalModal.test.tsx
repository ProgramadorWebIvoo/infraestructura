import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import InspectProposalModal from "@/views/ProcuraPanel/components/InspectProposalModal";
import { useExchangeRatesStore } from "@/stores/exchangeRatesStore";
import { usePublicSettingsStore } from "@/stores/publicSettingsStore";
import { useUsdRateModeStore } from "@/stores/usdRateModeStore";
import type { Project, Proposal } from "@/types";

const rate = (id: number, code: string, value: number) => ({ id, currency_code: code, rate_to_usd: value, source: "DOLARVZLA_API" as const, effective_at: "2026-01-01", created_at: "", updated_at: "" });

const project = { id: "PRJ-1", title: "Obra", type: "INFRAESTRUCTURA", description: "", location: "Sede", createdDate: "2026-01-01", status: "COMPARATIVA_ENVIADA", materials: [] } as unknown as Project;

// 18 USDT de unitario × 1,25 (USDT 1.000 / USD 800) = 22,50 USD-BCV; en USD-USDT son 18.
const convertedProposal = {
  id: "PROP-1",
  contractorCode: "CON-1",
  contractorName: "Constructora",
  materialCost: 22.5,
  materialCostOriginal: 18,
  laborCost: 0,
  laborCostOriginal: 0,
  totalCost: 22.5,
  totalCostOriginal: 18,
  quoteCurrency: "USDT",
  fxRateToBase: 1.25,
  baseCurrencyAtImport: "USD",
  deliveryWeeks: 2,
  negotiatedAdvancePercent: 30,
  description: "Oferta",
  origen: "MANUAL",
  fechaOferta: "2026-09-30",
  materialItems: [{ materialName: "Cabilla", quantity: 1, unit: "und", unitPrice: 18, totalPrice: 18 }],
} as unknown as Proposal;

describe("InspectProposalModal — propuesta cotizada en otra moneda", () => {
  beforeEach(() => {
    useExchangeRatesStore.setState({ rates: [rate(1, "USD", 800), rate(2, "USDT", 1000)], isLoading: false, hasLoaded: true });
    useUsdRateModeStore.setState({ mode: "BCV", sessionRole: null });
  });

  it("muestra las líneas en la moneda de cotización con su equivalente USD-BCV, sin mezclar 18 con 22,50 sin explicación", () => {
    render(<InspectProposalModal project={project} proposal={convertedProposal} authToken="t" onClose={() => {}} />);

    expect(screen.getByText(/Precio unit\. \(USDT\)/)).toBeInTheDocument();
    expect(screen.getAllByText(/₮18\.00 USDT/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/≈ \$22\.50 USD-BCV/).length).toBeGreaterThan(0);
    // Bs. de la oferta con la tasa de su propia moneda (18 USDT × 1000), no con el dólar BCV.
    expect(screen.getAllByText(/Bs\. 18\.000,00/).length).toBeGreaterThan(0);
  });

  it("en modo USDT el dólar también cambia: 18 USDT valen $18.00 USD-USDT (ya no chocan con el total)", () => {
    usePublicSettingsStore.setState({ settings: { sincronizacion_tasa: [{ key: "tasa_switch_roles", value: JSON.stringify(["PROCURA"]) }] } });
    useUsdRateModeStore.setState({ mode: "USDT", sessionRole: "PROCURA" });

    render(<InspectProposalModal project={project} proposal={convertedProposal} authToken="t" onClose={() => {}} />);

    expect(screen.getAllByText(/≈ \$18\.00 USD-USDT/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/USD-BCV/)).not.toBeInTheDocument();
    // Los Bs. son los reales de la oferta en ambos modos.
    expect(screen.getAllByText(/Bs\. 18\.000,00/).length).toBeGreaterThan(0);
  });

  it("avisa que los precios del resumen están en USD-BCV", () => {
    render(<InspectProposalModal project={project} proposal={convertedProposal} authToken="t" onClose={() => {}} />);

    expect(screen.getByText("Precios en USD-BCV")).toBeInTheDocument();
  });
});
