import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContractorHistoryModal from "@/views/ProveedoresRegistrados/components/ContractorHistoryModal";
import type { Contractor, ContractorHistory } from "@/types";

const history: ContractorHistory = {
  monthlySeries: Array.from({ length: 12 }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, "0")}`, quoteCount: 0, avgPriceUsd: null })),
  topProducts: [],
  customProducts: Array.from({ length: 45 }, (_, i) => ({
    catalogProductId: i + 1,
    productName: `Producto a medida ${String(i + 1).padStart(2, "0")}`,
    quoteCount: 2,
    firstPriceUsd: 10,
    lastPriceUsd: 12,
    lastCurrency: "USD",
    variationPercent: 20,
    firstQuotedAt: "2026-01-01",
    lastQuotedAt: "2026-02-01",
  })),
  projects: Array.from({ length: 30 }, (_, i) => ({
    projectId: `PRJ-${i + 1}`,
    projectTitle: `Proyecto ${String(i + 1).padStart(2, "0")}`,
    projectType: "INFRAESTRUCTURA",
    projectStatus: "CREADO",
    projectLocation: "Sede",
    proposalId: `PROP-${i + 1}`,
    fechaOferta: "2026-01-01",
    origen: "MANUAL",
    isAwarded: i === 21,
    isSuperseded: false,
    isWithdrawn: false,
  })),
  stats: {
    contractorCode: "CON-1",
    contractorName: "Proveedor",
    rating: 4,
    totalQuoteCount: 90,
    distinctProductCount: 45,
    customProductCount: 45,
    totalProjectsBidOn: 30,
    awardedProjectCount: 1,
    trendPercent: null,
    periodMonths: 12,
  },
};

vi.mock("@/services/api", () => ({ apiFetch: vi.fn().mockResolvedValue(history) }));

const contractor = { code: "CON-1", name: "Proveedor", rating: 4 } as unknown as Contractor;
const dataRows = (name: string) => within(screen.getByRole("table", { name })).getAllByRole("row").length - 1;

describe("ContractorHistoryModal — listas sin tope en el backend", () => {
  it("pagina los productos personalizados con buscador en lugar de dibujar los 45", async () => {
    render(<ContractorHistoryModal contractor={contractor} onClose={() => {}} />);
    await userEvent.click(await screen.findByRole("tab", { name: /Productos/ }));

    expect(dataRows("Productos personalizados")).toBe(10);
    await userEvent.type(screen.getByRole("searchbox"), "a medida 44");
    expect(dataRows("Productos personalizados")).toBe(1);
  });

  it("pagina los proyectos y el filtro 'Adjudicados' encuentra el adjudicado de otra página", async () => {
    render(<ContractorHistoryModal contractor={contractor} onClose={() => {}} />);
    await userEvent.click(await screen.findByRole("tab", { name: /Proyectos/ }));

    expect(dataRows("Proyectos ofertados")).toBe(10);
    await userEvent.click(screen.getByRole("button", { name: /Adjudicados/ }));
    expect(dataRows("Proyectos ofertados")).toBe(1);
    expect(screen.getByText("Proyecto 22")).toBeInTheDocument();
  });
});
