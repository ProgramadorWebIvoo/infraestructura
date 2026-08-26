/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para KpiPill — no mockea motion/react: useMotionValue/
 * useTransform/animate son lógica pura sin DOM, así que se ejecutan reales
 * contra jsdom en vez de simularse, evitando divergir del comportamiento
 * real de la animación de count-up/down.
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TrendingUp } from "lucide-react";
import KpiPill from "@/components/UI/KpiPill";

describe("KpiPill", () => {
  it("renderiza el valor numérico inicial sin animar desde cero", () => {
    render(<KpiPill icon={<TrendingUp />} label="Contratados" value={5} accent="brand" />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renderiza valores string estáticos sin animación", () => {
    render(<KpiPill icon={<TrendingUp />} label="Estado" value="N/D" accent="neutral" />);
    expect(screen.getByText("N/D")).toBeInTheDocument();
  });

  it("anima el valor hacia el nuevo número al cambiar la prop (count-up)", async () => {
    const { rerender } = render(<KpiPill icon={<TrendingUp />} label="Contratados" value={3} accent="brand" />);
    expect(screen.getByText("3")).toBeInTheDocument();

    rerender(<KpiPill icon={<TrendingUp />} label="Contratados" value={7} accent="brand" />);

    await waitFor(() => expect(screen.getByText("7")).toBeInTheDocument(), { timeout: 1000 });
  });

  it("anima el valor hacia abajo (count-down) al disminuir", async () => {
    const { rerender } = render(<KpiPill icon={<TrendingUp />} label="Pendientes" value={10} accent="warning" />);
    rerender(<KpiPill icon={<TrendingUp />} label="Pendientes" value={4} accent="warning" />);

    await waitFor(() => expect(screen.getByText("4")).toBeInTheDocument(), { timeout: 1000 });
  });

  it("no anima cuando el valor no cambia entre renders", () => {
    const { rerender } = render(<KpiPill icon={<TrendingUp />} label="Contratados" value={5} accent="brand" />);
    rerender(<KpiPill icon={<TrendingUp />} label="Contratados" value={5} accent="brand" />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
