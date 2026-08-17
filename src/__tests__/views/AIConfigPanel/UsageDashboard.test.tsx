/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas de UsageDashboard — KPIs, loading, distribución por proveedor y
 * formateo de costos.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UsageDashboard from "@/views/AIConfigPanel/components/UsageDashboard";
import type { AiUsageData } from "@/hooks/useAIConfig";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  motion: {
    div: ({ children, animate, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, exit, variants, transition, ...rest } = props;
      // Aplica `animate` como estilo final directo (sin animación real) para
      // que los tests puedan leer el valor "de llegada" (ej. width de una
      // barra) sin depender del motor de Framer Motion.
      const style = animate && typeof animate === "object" ? (animate as Record<string, unknown>) : undefined;
      return <div {...rest} style={style}>{children}</div>;
    },
  },
}));

const USAGE: AiUsageData = {
  daily: [],
  byProvider: [
    { provider: "openai", prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500, cost: 0.045, requests: 10 },
    { provider: "anthropic", prompt_tokens: 500, completion_tokens: 250, total_tokens: 750, cost: 0.012, requests: 5 },
  ],
  byModel: [],
  totals: {
    prompt_tokens: 1500,
    completion_tokens: 750,
    total_tokens: 2250,
    total_cost: 0.057,
    total_requests: 15,
    successful_requests: 13,
    failed_requests: 2,
  },
};

describe("UsageDashboard", () => {
  const onUsageDaysChange = vi.fn();

  it("muestra skeleton de carga mientras isUsageLoading", () => {
    render(
      <UsageDashboard
        usage={null}
        isUsageLoading
        usageDays={30}
        onUsageDaysChange={onUsageDaysChange}
      />
    );
    expect(screen.getByRole("heading", { name: "Dashboard de Uso" })).toBeInTheDocument();
    // Skeleton (misma forma que el contenido final) reemplaza al spinner
    // centrado — se identifica por su clase de shimmer.
    expect(document.querySelectorAll(".skeleton-shimmer").length).toBeGreaterThan(0);
  });

  it("renderiza los 4 KPIs con valores formateados", () => {
    render(
      <UsageDashboard usage={USAGE} isUsageLoading={false} usageDays={30} onUsageDaysChange={onUsageDaysChange} />
    );

    expect(screen.getByText("15")).toBeInTheDocument(); // peticiones
    expect(screen.getByText(/2[.,]250/)).toBeInTheDocument(); // tokens (separador según locale)
    expect(screen.getByText("$0.06")).toBeInTheDocument(); // costo estimado
    expect(screen.getByText("86.7%")).toBeInTheDocument(); // tasa de éxito 13/15
    expect(screen.getByText("13 exitosas")).toBeInTheDocument();
    expect(screen.getByText("2 fallidas")).toBeInTheDocument();
  });

  it("muestra barras por proveedor con share del total", () => {
    render(
      <UsageDashboard usage={USAGE} isUsageLoading={false} usageDays={30} onUsageDaysChange={onUsageDaysChange} />
    );

    expect(screen.getByText("OpenAI (ChatGPT)")).toBeInTheDocument();
    expect(screen.getByText("Anthropic (Claude)")).toBeInTheDocument();
    expect(screen.getByText(/1[.,]500 tokens/)).toBeInTheDocument();
    expect(screen.getByText("750 tokens")).toBeInTheDocument();

    // OpenAI = 1500/2250 = 66.7% de la barra
    const openaiBar = screen.getByText(/1[.,]500 tokens/).closest("div")?.nextElementSibling
      ?.firstElementChild as HTMLElement;
    expect(openaiBar.style.width).toBe("66.66666666666666%");
  });

  it("muestra 'Sin actividad registrada' cuando no hay providers", () => {
    const empty = { ...USAGE, byProvider: [], totals: { ...USAGE.totals, total_requests: 0, successful_requests: 0, failed_requests: 0, total_tokens: 0, total_cost: 0 } };
    render(
      <UsageDashboard usage={empty} isUsageLoading={false} usageDays={30} onUsageDaysChange={onUsageDaysChange} />
    );
    expect(screen.getByText("Sin actividad registrada.")).toBeInTheDocument();
  });

  it("dispara el cambio de período", () => {
    render(
      <UsageDashboard usage={USAGE} isUsageLoading={false} usageDays={30} onUsageDaysChange={onUsageDaysChange} />
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "7" } });
    expect(onUsageDaysChange).toHaveBeenCalledWith(7);
  });
});
