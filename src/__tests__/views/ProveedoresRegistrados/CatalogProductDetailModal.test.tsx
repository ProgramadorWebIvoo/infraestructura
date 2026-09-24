import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import CatalogProductDetailModal from "@/views/ProveedoresRegistrados/components/CatalogProductDetailModal";
import type { CatalogProduct, CatalogProductPriceHistoryResponse } from "@/types";
import { apiFetch } from "@/services/api";

vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));
vi.mock("react-dom", () => ({ createPortal: (content: React.ReactNode) => content }));

vi.mock("@/services/api", () => ({
  apiFetch: vi.fn(),
}));

afterEach(() => vi.restoreAllMocks());

const product: CatalogProduct = {
  id: 1,
  name: "Cemento Portland",
  unit: "Saco",
  estimated_unit_price: 10,
  is_active: true,
  category_id: null,
  normalized_specs: null,
  is_custom_origin: false,
};

const historyResponse: CatalogProductPriceHistoryResponse = {
  series: [
    {
      id: 1,
      catalog_product_id: 1,
      supplier_code: "CON-001",
      quantity: 5,
      price_usd: 8,
      original_currency: "USD",
      original_price: 8,
      fx_rate_to_usd: 1,
      fx_rate_source: "test",
      quoted_at: "2026-01-01T00:00:00Z",
      project_id: null,
      origin: "PORTAL_PROV",
    },
    {
      id: 2,
      catalog_product_id: 1,
      supplier_code: "CON-001",
      quantity: 3,
      price_usd: 12,
      original_currency: "USD",
      original_price: 12,
      fx_rate_to_usd: 1,
      fx_rate_source: "test",
      quoted_at: "2026-02-01T00:00:00Z",
      project_id: null,
      origin: "PORTAL_PROV",
    },
  ],
  stats: {
    productId: 1,
    lastPriceUsd: 12,
    lastCurrency: "USD",
    lastQuotedAt: "2026-02-01T00:00:00Z",
    minPriceUsd: 8,
    maxPriceUsd: 12,
    avgPriceUsd: 10,
    variationUsd: 4,
    variationPercent: 50,
    dataPoints: 2,
  },
};

describe("CatalogProductDetailModal", () => {
  it("muestra las estadísticas de histórico (último, min, max, promedio, variación)", async () => {
    vi.mocked(apiFetch).mockImplementation((path: string) => {
      if (path.includes("/price-history")) {
        return Promise.resolve(historyResponse as unknown);
      }
      return Promise.resolve(product as unknown);
    });

    render(<CatalogProductDetailModal product={product} onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText("Último")).toBeInTheDocument());

    expect(screen.getByText("Mínimo")).toBeInTheDocument();
    expect(screen.getByText("Máximo")).toBeInTheDocument();
    expect(screen.getByText("Promedio")).toBeInTheDocument();
    expect(screen.getByText("Variación")).toBeInTheDocument();
    expect(screen.getAllByText("+50.0%").length).toBeGreaterThan(0);
  });

  it("no muestra el bloque de estadísticas cuando no hay histórico", async () => {
    vi.mocked(apiFetch).mockImplementation((path: string) => {
      if (path.includes("/price-history")) {
        return Promise.resolve({
          series: [],
          stats: {
            productId: 1,
            lastPriceUsd: null,
            lastCurrency: null,
            lastQuotedAt: null,
            minPriceUsd: null,
            maxPriceUsd: null,
            avgPriceUsd: null,
            variationUsd: null,
            variationPercent: null,
            dataPoints: 0,
          },
        } as unknown);
      }
      return Promise.resolve(product as unknown);
    });

    render(<CatalogProductDetailModal product={product} onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText("Sin histórico de precios todavía.")).toBeInTheDocument());
    expect(screen.queryByText("Último")).not.toBeInTheDocument();
  });
});
