/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas de MiniBarChart — regresión del crash de hooks (early return antes
 * de useMemo) + render diario/semanal.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MiniBarChart from "@/views/AIConfigPanel/components/MiniBarChart";
import type { AiUsageDaily } from "@/hooks/useAIConfig";

const DAYS: AiUsageDaily[] = [
  { date: "2026-07-01", prompt_tokens: 100, completion_tokens: 50, total_tokens: 150, cost: 0.01, requests: 2, successful_requests: 2, failed_requests: 0 },
  { date: "2026-07-02", prompt_tokens: 200, completion_tokens: 100, total_tokens: 300, cost: 0.02, requests: 3, successful_requests: 2, failed_requests: 1 },
  { date: "2026-07-03", prompt_tokens: 50, completion_tokens: 25, total_tokens: 75, cost: 0.005, requests: 1, successful_requests: 1, failed_requests: 0 },
];

describe("MiniBarChart", () => {
  it("muestra estado vacío sin datos", () => {
    render(<MiniBarChart data={[]} />);
    expect(screen.getByText("Sin datos de uso en este período.")).toBeInTheDocument();
  });

  it("NO crashea al transicionar de vacío a datos (regresión regla de hooks)", () => {
    const { rerender } = render(<MiniBarChart data={[]} />);
    // Sin throw, esto habría lanzado "Rendered fewer hooks" antes del fix.
    expect(() => rerender(<MiniBarChart data={DAYS} />)).not.toThrow();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("renderiza barras horizontales por defecto (modo diario)", () => {
    render(<MiniBarChart data={DAYS} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
    // valores de tokens visibles
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
    expect(screen.getByText(/Máximo|Max/)).toBeInTheDocument();
  });

  it("cambia a vista vertical (7 días)", () => {
    render(<MiniBarChart data={DAYS} />);
    fireEvent.click(screen.getByRole("button", { name: "7 días" }));
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("aria-label describe el gráfico", () => {
    render(<MiniBarChart data={DAYS} />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("aria-label")).toContain("Gráfico de uso de tokens");
    expect(img.getAttribute("aria-label")).toContain("300");
  });
});
