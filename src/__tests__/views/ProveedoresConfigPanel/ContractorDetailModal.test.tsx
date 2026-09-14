/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Verifica que el bloque "Sugerencia IA" de rating (Proveedores/Catálogos)
 * respete el gate de Config IA: visible por defecto, oculto cuando el
 * departamento CATALOGOS tiene la IA desactivada.
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ContractorDetailModal from "@/views/ProveedoresConfigPanel/components/ContractorDetailModal";
import type { ConfigContractor } from "@/views/ProveedoresConfigPanel/types";

vi.mock("motion/react", () => {
  const stripMotionProps = (props: Record<string, unknown>) => {
    const { initial, animate, exit, variants, transition, layout, ...rest } = props;
    return rest;
  };
  return {
    useReducedMotion: () => false,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy(
      {},
      {
        get: (_target, tag: string) =>
          ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
            React.createElement(tag, stripMotionProps(props), children),
      },
    ),
  };
});

vi.mock("react-dom", () => ({ createPortal: (content: React.ReactNode) => content }));

const mockIsAiFeatureEnabled = vi.fn(() => true);
vi.mock("@/hooks/useAiFeatureGate", () => ({
  useAiFeatureGate: () => ({ isAiFeatureEnabled: mockIsAiFeatureEnabled, isLoading: false }),
}));

const mockGetContractorRatingSuggestion = vi.fn();
vi.mock("@/services/aiEvaluationService", () => ({
  getContractorRatingSuggestion: (...args: unknown[]) => mockGetContractorRatingSuggestion(...args),
}));

afterEach(() => {
  vi.restoreAllMocks();
  mockIsAiFeatureEnabled.mockReturnValue(true);
});

const contractor: ConfigContractor = {
  code: "C-001",
  name: "Constructora ABC",
  rif: "J-12345678-9",
  specialty: "Electricidad",
  rating: 4.2,
  email: "contacto@abc.com",
  phone: "0212-1234567",
  registrationSource: "INTERNAL",
  status: "ACTIVE",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("ContractorDetailModal — Sugerencia IA", () => {
  it("muestra el bloque de sugerencia IA cuando el gate de Config IA está habilitado (default)", () => {
    render(<ContractorDetailModal contractor={contractor} onClose={vi.fn()} authToken="token" />);

    expect(screen.getByText("Sugerencia IA de rating")).toBeInTheDocument();
  });

  it("oculta el bloque de sugerencia IA cuando el departamento CATALOGOS tiene la IA desactivada en Config IA", () => {
    mockIsAiFeatureEnabled.mockReturnValue(false);

    render(<ContractorDetailModal contractor={contractor} onClose={vi.fn()} authToken="token" />);

    expect(screen.queryByText("Sugerencia IA de rating")).not.toBeInTheDocument();
    // El resto del detalle del proveedor sigue disponible.
    expect(screen.getByText("Constructora ABC")).toBeInTheDocument();
  });

  it("carga y muestra la sugerencia al pedir el análisis", async () => {
    mockGetContractorRatingSuggestion.mockResolvedValue({
      suggestedRating: 4.5,
      confidenceScore: 72,
      rationale: "Tendencia de precios estable y buena tasa de adjudicación.",
      providerUsed: "chatgpt",
    });

    render(<ContractorDetailModal contractor={contractor} onClose={vi.fn()} authToken="token" />);

    fireEvent.click(screen.getByText("Analizar"));

    await waitFor(() => expect(screen.getByText("4.5")).toBeInTheDocument());
    expect(screen.getByText(/Tendencia de precios estable/)).toBeInTheDocument();
    expect(mockGetContractorRatingSuggestion).toHaveBeenCalledWith("C-001", "token");
  });
});
