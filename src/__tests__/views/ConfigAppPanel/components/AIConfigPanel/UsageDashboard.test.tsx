/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas de UsageDashboard — KPIs, loading, distribución por proveedor y
 * formateo de costos.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UsageDashboard from "@/views/ConfigAppPanel/components/AIConfigPanel/components/UsageDashboard";
import type { AiUsageData } from "@/hooks/useAIConfig";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  motion: {
    div: ({ children, animate, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, exit, variants, transition, ...rest } = props;
      // Aplica `animate` como estilo final directo (sin animación real) para
      // que los tests puedan leer el valor "de llegada" (ej. width de una
      // barra) sin depender del motor de Framer Motion.
      const animateObj = animate && typeof animate === "object" ? (animate as Record<string, unknown>) : undefined;
      // scaleX/scaleY no son propiedades CSS válidas como claves sueltas de
      // `style` (jsdom las rechaza con un TypeError al asignarlas) — se
      // excluyen del `style` inline y se exponen en un data-attribute para
      // que los tests que animan con transform (barras de progreso — ver
      // ProviderBar acá y componentes similares) puedan leer el valor "de
      // llegada" sin depender del motor de Framer Motion.
      const { scaleX: _scaleX, scaleY: _scaleY, ...style } = animateObj ?? {};
      return (
        <div {...rest} style={animateObj ? style : undefined} data-motion-animate={animateObj ? JSON.stringify(animateObj) : undefined}>
          {children}
        </div>
      );
    },
    ul: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <ul {...rest}>{children}</ul>;
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

    // OpenAI = 1500/2250 = 66.7% de la barra — animado con scaleX (transform),
    // no width, para no disparar layout/reflow en cada frame (ver
    // UsageDashboard.tsx). scaleX no es una propiedad CSS válida como clave
    // suelta de `style`, así que el mock de motion.div la expone en
    // data-motion-animate en vez de aplicarla como inline style.
    const openaiBar = screen.getByText(/1[.,]500 tokens/).closest("div")?.nextElementSibling
      ?.firstElementChild as HTMLElement;
    const animate = JSON.parse(openaiBar.getAttribute("data-motion-animate") ?? "{}");
    expect(animate.scaleX).toBeCloseTo(2 / 3, 5);
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
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "7 días" }));
    expect(onUsageDaysChange).toHaveBeenCalledWith(7);
  });
});
