/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas de AIConfigTable — render, acciones de fila, y guard runtime de la
 * API key (regresión del hallazgo ALTO de la auditoría 29/07: nunca exponer
 * una clave completa en el DOM).
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AIConfigTable from "@/views/AIConfigPanel/components/AIConfigTable";
import type { AiConfigRecord } from "@/hooks/useAIConfig";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

function createConfig(overrides: Partial<AiConfigRecord> = {}): AiConfigRecord {
  return {
    id: 1,
    provider: "openai",
    model: "gpt-5.6-sol",
    hasApiKey: true,
    apiKey: "••••abcd",
    baseUrl: null,
    maxTokens: 4096,
    isActive: true,
    isFallback: false,
    sortOrder: 0,
    createdAt: "2026-07-22T00:00:00.000000Z",
    updatedAt: "2026-07-22T00:00:00.000000Z",
    ...overrides,
  };
}

describe("AIConfigTable", () => {
  const handlers = {
    onTest: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleActive: vi.fn(),
    onSync: vi.fn(),
    onCreateNew: vi.fn(),
  };

  function renderTable(configs: AiConfigRecord[], extra: Partial<typeof handlers> = {}) {
    return render(
      <AIConfigTable
        configs={configs}
        isLoading={false}
        testingId={null}
        deletingId={null}
        isSyncing={false}
        onTest={extra.onTest ?? handlers.onTest}
        onEdit={extra.onEdit ?? handlers.onEdit}
        onDelete={extra.onDelete ?? handlers.onDelete}
        onToggleActive={extra.onToggleActive ?? handlers.onToggleActive}
        onSync={extra.onSync ?? handlers.onSync}
        onCreateNew={extra.onCreateNew ?? handlers.onCreateNew}
      />
    );
  }

  it("renderiza el encabezado y las acciones principales", () => {
    renderTable([]);
    expect(screen.getByRole("heading", { name: "Modelos de IA" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sincronizar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nueva config." })).toBeInTheDocument();
  });

  it("muestra el mensaje vacío sin configuraciones", () => {
    renderTable([]);
    expect(screen.getByText("No hay configuraciones de IA. Crea una nueva para comenzar.")).toBeInTheDocument();
  });

  it("muestra estado Activo/Inactivo y Fallback", () => {
    renderTable([
      createConfig({ id: 1, isActive: true, isFallback: false }),
      createConfig({ id: 2, isActive: false, isFallback: true, model: "claude-sonnet-5" }),
    ]);
    expect(screen.getAllByText("Activo")).toHaveLength(1);
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
    expect(screen.getByText("Fallback")).toBeInTheDocument();
  });

  it("dispara test/edit/delete/toggle/sync/new con los callbacks", () => {
    const config = createConfig();
    renderTable([config]);

    fireEvent.click(screen.getByRole("button", { name: `Probar conexión ${config.model}` }));
    expect(handlers.onTest).toHaveBeenCalledWith(config.id);

    fireEvent.click(screen.getByRole("button", { name: `Editar ${config.model}` }));
    expect(handlers.onEdit).toHaveBeenCalledWith(config);

    fireEvent.click(screen.getByRole("button", { name: "Desactivar" }));
    expect(handlers.onToggleActive).toHaveBeenCalledWith(config);

    fireEvent.click(screen.getByRole("button", { name: `Eliminar ${config.model}` }));
    expect(handlers.onDelete).toHaveBeenCalledWith(config.id);

    fireEvent.click(screen.getByRole("button", { name: "Sincronizar" }));
    expect(handlers.onSync).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Nueva config." }));
    expect(handlers.onCreateNew).toHaveBeenCalledTimes(1);
  });

  it("deshabilita 'Probar conexión' para configs inactivas", () => {
    renderTable([createConfig({ isActive: false })]);
    expect(screen.getByRole("button", { name: /probar conexión/i })).toBeDisabled();
  });

  describe("guard de API key (seguridad)", () => {
    it("muestra la clave enmascarada normal (8 chars)", () => {
      renderTable([createConfig({ apiKey: "••••abcd" })]);
      expect(screen.getByText("••••abcd")).toBeInTheDocument();
    });

    it("enmascara por completo una clave larga que llegara del backend (guard runtime)", () => {
      renderTable([createConfig({ apiKey: "sk-proj-1234567890-SECRET-FULL-KEY" })]);
      expect(screen.queryByText("sk-proj-1234567890-SECRET-FULL-KEY")).not.toBeInTheDocument();
      expect(screen.getByText("••••••••")).toBeInTheDocument();
    });

    it("muestra guión cuando no hay clave", () => {
      renderTable([createConfig({ hasApiKey: false, apiKey: "" })]);
      expect(screen.getByTitle("Sin clave")).toBeInTheDocument();
    });
  });
});
