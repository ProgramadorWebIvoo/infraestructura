/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integración de AIConfigPanel — flujos completos: crear, editar, probar,
 * eliminar (con confirmación), sincronizar y toggle activo. El hook se
 * mockea; los sub-componentes se renderizan reales.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AIConfigPanel from "@/views/AIConfigPanel";
import { EMPTY_CONFIG_FORM, type AiConfigRecord } from "@/hooks/useAIConfig";
import { PROVIDER_MODELS } from "@/constants/aiModels";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, whileHover, whileTap, ...rest } = props;
      return <button {...rest}>{children}</button>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, whileHover, whileTap, ...rest } = props;
      return <span {...rest}>{children}</span>;
    },
    ul: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <ul {...rest}>{children}</ul>;
    },
  },
}));

const mockShowToast = vi.fn();
vi.mock("@/components/UI/Toast", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockHook = {
  configs: [] as AiConfigRecord[],
  isLoading: false,
  usage: null,
  isUsageLoading: false,
  providerModels: PROVIDER_MODELS,
  loadUsage: vi.fn().mockResolvedValue(undefined),
  createConfig: vi.fn().mockResolvedValue({} as AiConfigRecord),
  updateConfig: vi.fn().mockResolvedValue({} as AiConfigRecord),
  deleteConfig: vi.fn().mockResolvedValue({}),
  testConfig: vi.fn().mockResolvedValue({ success: true, message: "Conexión exitosa." }),
  syncConfig: vi.fn().mockResolvedValue({ message: "Sincronizado.", activeConfigs: 1 }),
};

vi.mock("@/hooks/useAIConfig", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useAIConfig")>();
  return {
    ...actual,
    useAIConfig: () => mockHook,
  };
});

const CONFIG: AiConfigRecord = {
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
};

describe("AIConfigPanel (integración)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHook.configs = [];
    mockHook.usage = null;
  });

  it("renderiza el dashboard de uso y la tabla de modelos", () => {
    render(<AIConfigPanel authToken="token" />);
    expect(screen.getByRole("heading", { name: "Dashboard de Uso" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Modelos de IA" })).toBeInTheDocument();
  });

  it("valida el formulario antes de crear (modelo vacío → toast error)", async () => {
    render(<AIConfigPanel authToken="token" />);
    fireEvent.click(screen.getByRole("button", { name: "Nueva config." }));

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("El nombre del modelo es obligatorio.", "error");
    });
    expect(mockHook.createConfig).not.toHaveBeenCalled();
  });

  it("crea una configuración con modelo y API key", async () => {
    render(<AIConfigPanel authToken="token" />);
    fireEvent.click(screen.getByRole("button", { name: "Nueva config." }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Modelo"));
    fireEvent.click(screen.getByRole("option", { name: "gpt-5.6-sol" }));
    fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "sk-test-1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() => {
      expect(mockHook.createConfig).toHaveBeenCalledWith({
        ...EMPTY_CONFIG_FORM,
        model: "gpt-5.6-sol",
        apiKey: "sk-test-1234",
      });
    });
    expect(mockShowToast).toHaveBeenCalledWith("Configuración creada correctamente.", "success");
  });

  it("edita una configuración (payload tipado sin apiKey vacía)", async () => {
    mockHook.configs = [CONFIG];
    render(<AIConfigPanel authToken="token" />);

    fireEvent.click(screen.getByRole("button", { name: `Editar ${CONFIG.model}` }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockHook.updateConfig).toHaveBeenCalledWith(CONFIG.id, {
        model: CONFIG.model,
        baseUrl: null,
        maxTokens: 4096,
        isActive: true,
        isFallback: false,
        sortOrder: 0,
      });
    });
  });

  it("prueba la conexión y muestra el resultado", async () => {
    mockHook.configs = [CONFIG];
    render(<AIConfigPanel authToken="token" />);

    fireEvent.click(screen.getByRole("button", { name: `Probar conexión ${CONFIG.model}` }));

    await waitFor(() => expect(mockHook.testConfig).toHaveBeenCalledWith(CONFIG.id));
    expect(mockShowToast).toHaveBeenCalledWith("Conexión exitosa.", "success");
  });

  it("elimina tras confirmación", async () => {
    mockHook.configs = [CONFIG];
    render(<AIConfigPanel authToken="token" />);

    fireEvent.click(screen.getByRole("button", { name: `Eliminar ${CONFIG.model}` }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(mockHook.deleteConfig).toHaveBeenCalledWith(CONFIG.id));
    expect(mockShowToast).toHaveBeenCalledWith("Configuración eliminada correctamente.", "success");
  });

  it("sincroniza y muestra el banner de éxito", async () => {
    render(<AIConfigPanel authToken="token" />);

    fireEvent.click(screen.getByRole("button", { name: "Sincronizar" }));

    await waitFor(() => expect(mockHook.syncConfig).toHaveBeenCalledTimes(1));
    expect(mockShowToast).toHaveBeenCalledWith("Configuración sincronizada en tiempo real.", "success");
  });

  it("alterna el estado activo", async () => {
    mockHook.configs = [CONFIG];
    render(<AIConfigPanel authToken="token" />);

    fireEvent.click(screen.getByRole("button", { name: "Desactivar" }));

    await waitFor(() => {
      expect(mockHook.updateConfig).toHaveBeenCalledWith(CONFIG.id, { isActive: false });
    });
  });
});
