import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockApiFetch = vi.fn();
vi.mock("@/services/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const mockGetErrorMessage = vi.fn();
vi.mock("@/services/logger", () => ({
  logError: vi.fn(),
  getErrorMessage: (...args: unknown[]) => mockGetErrorMessage(...args),
}));

import { useAIConfig, type AiConfigRecord, type AiConfigForm, EMPTY_CONFIG_FORM } from "../../hooks/useAIConfig";
import { PROVIDER_MODELS } from "../../constants/aiModels";

// ── Helpers ──────────────────────────────────────────────────────────────────
function createMockConfig(overrides: Partial<AiConfigRecord> = {}): AiConfigRecord {
  return {
    id: 1,
    provider: "openai",
    model: "gpt-4.1",
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

const EMPTY_USAGE = {
  daily: [], byProvider: [], byModel: [],
  totals: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, total_cost: 0, total_requests: 0, successful_requests: 0, failed_requests: 0 },
};

/** Helper: espera a que el hook termine de cargar (isLoading=false) */
async function waitForLoad() {
  // Flush microtasks (promesas) y re-renders
  for (let i = 0; i < 10; i++) {
    await act(async () => { await Promise.resolve(); });
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("useAIConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetErrorMessage.mockImplementation((_err: unknown, fallback: string) => fallback);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("starts with empty configs and loading=true", () => {
      const { result } = renderHook(() => useAIConfig(""));
      expect(result.current.configs).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.usage).toBeNull();
      expect(result.current.isUsageLoading).toBe(true);
    });

    it("does not fetch when token is empty", () => {
      renderHook(() => useAIConfig(""));
      expect(mockApiFetch).not.toHaveBeenCalled();
    });
  });

  describe("data fetching with token", () => {
    it("loads configs on mount when token is provided", async () => {
      const configs = [createMockConfig()];
      mockApiFetch.mockResolvedValue(configs);

      const { result } = renderHook(() => useAIConfig("valid-token"));

      await waitForLoad();

      expect(mockApiFetch).toHaveBeenCalledWith("/ai/config");
      expect(result.current.configs).toEqual(configs);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("token lifecycle", () => {
    it("fetches when token transitions from falsy to truthy (login)", async () => {
      mockApiFetch.mockResolvedValue([]);

      const { rerender } = renderHook(
        ({ token }) => useAIConfig(token),
        { initialProps: { token: "" } },
      );

      expect(mockApiFetch).not.toHaveBeenCalled();
      mockApiFetch.mockClear();

      rerender({ token: "new-token" });

      await waitForLoad();

      expect(mockApiFetch).toHaveBeenCalledWith("/ai/config");
    });
  });

  describe("providerModels", () => {
    it("carga /ai/config/models al montar y lo expone en el hook", async () => {
      const models = { openai: ["gpt-4.1"], anthropic: ["claude-sonnet-5"], gemini: ["gemini-3.5-flash"] };
      mockApiFetch.mockImplementation((path: string) =>
        path === "/ai/config/models" ? Promise.resolve(models) : Promise.resolve([]),
      );

      const { result } = renderHook(() => useAIConfig("token"));
      await waitForLoad();

      expect(mockApiFetch).toHaveBeenCalledWith("/ai/config/models");
      expect(result.current.providerModels).toEqual(models);
    });

    it("empieza con el catálogo constante de modelos (nunca vacío)", () => {
      mockApiFetch.mockResolvedValue([]);
      const { result } = renderHook(() => useAIConfig("token"));
      expect(result.current.providerModels).toEqual(PROVIDER_MODELS);
    });

    it("el endpoint puede EXTENDER el catálogo constante, no vaciarlo", async () => {
      // El backend devuelve un proveedor nuevo + uno conocido con menos modelos
      const backendModels = { anthropic: ["claude-opus-9"] };
      mockApiFetch.mockImplementation((path: string) =>
        path === "/ai/config/models" ? Promise.resolve(backendModels) : Promise.resolve([]),
      );

      const { result } = renderHook(() => useAIConfig("token"));
      await waitForLoad();

      // anthropic queda reemplazado por lo del backend; el resto sigue del catálogo
      expect(result.current.providerModels.anthropic).toEqual(["claude-opus-9"]);
      expect(result.current.providerModels.openai).toEqual(PROVIDER_MODELS.openai);
      expect(result.current.providerModels.gemini).toEqual(PROVIDER_MODELS.gemini);
    });

    it("conserva el catálogo constante si el fetch de modelos falla", async () => {
      mockApiFetch.mockImplementation((path: string) =>
        path === "/ai/config/models" ? Promise.reject(new Error("offline")) : Promise.resolve([]),
      );

      const { result } = renderHook(() => useAIConfig("token"));
      await waitForLoad();

      expect(result.current.providerModels).toEqual(PROVIDER_MODELS);
    });
  });

  describe("createConfig", () => {
    it("POSTs to /ai/config and appends to local state", async () => {
      const existing = createMockConfig({ id: 1 });
      const created = createMockConfig({ id: 2 });
      mockApiFetch
        .mockResolvedValueOnce([existing]) // loadConfigs on mount
        .mockResolvedValue(created);       // createConfig

      const { result } = renderHook(() => useAIConfig("token"));

      await waitForLoad();

      let returned: AiConfigRecord | undefined;
      await act(async () => {
        returned = await result.current.createConfig(EMPTY_CONFIG_FORM);
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/ai/config", {
        method: "POST",
        body: expect.any(String),
      });
      expect(returned).toEqual(created);
      expect(result.current.configs).toHaveLength(2);
      expect(result.current.configs).toContainEqual(created);
    });
  });

  describe("updateConfig", () => {
    it("PATCHes to /ai/config/{id} and updates local state", async () => {
      const existing = createMockConfig({ id: 1, model: "gpt-4.1" });
      const updated = createMockConfig({ id: 1, model: "gpt-5.6-sol" });

      mockApiFetch
        .mockResolvedValueOnce([existing]) // loadConfigs
        .mockResolvedValue(updated);       // update

      const { result } = renderHook(() => useAIConfig("token"));

      await waitForLoad();

      expect(result.current.configs).toHaveLength(1);
      expect(result.current.configs[0].model).toBe("gpt-4.1");

      await act(async () => {
        await result.current.updateConfig(1, { model: "gpt-5.6-sol" });
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/ai/config/1", {
        method: "PATCH",
        body: JSON.stringify({ model: "gpt-5.6-sol" }),
      });
      expect(result.current.configs[0].model).toBe("gpt-5.6-sol");
    });
  });

  describe("deleteConfig", () => {
    it("DELETEs to /ai/config/{id} and removes from local state", async () => {
      const config = createMockConfig({ id: 1 });
      mockApiFetch
        .mockResolvedValueOnce([config]) // loadConfigs
        .mockResolvedValue(undefined);   // delete

      const { result } = renderHook(() => useAIConfig("token"));

      await waitForLoad();
      expect(result.current.configs).toHaveLength(1);

      await act(async () => {
        await result.current.deleteConfig(1);
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/ai/config/1", {
        method: "DELETE",
      });
      expect(result.current.configs).toEqual([]);
    });
  });

  describe("testConfig", () => {
    it("POSTs to /ai/config/{id}/test and returns result", async () => {
      const testResult = { success: true, message: "Connection OK" };
      mockApiFetch
        .mockResolvedValueOnce([])  // loadConfigs
        .mockResolvedValue(testResult); // test

      const { result } = renderHook(() => useAIConfig("token"));

      await waitForLoad();

      const res = await act(async () => result.current.testConfig(1));

      expect(mockApiFetch).toHaveBeenCalledWith("/ai/config/1/test", {
        method: "POST",
      });
      expect(res).toEqual({ success: true, message: "Connection OK" });
    });
  });

  describe("syncConfig", () => {
    it("POSTs to /ai/config/sync and updates syncMessage", async () => {
      const syncResult = { message: "Synced 3 configs", activeConfigs: 3 };
      mockApiFetch
        .mockResolvedValueOnce([])      // loadConfigs
        .mockResolvedValue(syncResult); // sync

      const { result } = renderHook(() => useAIConfig("token"));

      await waitForLoad();

      const res = await act(async () => result.current.syncConfig());

      expect(mockApiFetch).toHaveBeenCalledWith("/ai/config/sync", {
        method: "POST",
      });
      expect(result.current.syncMessage).toBe("Synced 3 configs");
      expect(result.current.syncIsError).toBe(false);
      expect(res).toEqual(syncResult);
    });

    it("sets syncIsError on failure", async () => {
      mockApiFetch
        .mockResolvedValueOnce([])  // loadConfigs
        .mockRejectedValue(new Error("Sync failed"));

      const { result } = renderHook(() => useAIConfig("token"));

      await waitForLoad();

      await act(async () => {
        await result.current.syncConfig().catch(() => {});
      });

      expect(result.current.syncIsError).toBe(true);
      expect(result.current.syncMessage).toBeTruthy();
    });
  });

  describe("loadUsage", () => {
    it("loads usage with custom days parameter", async () => {
      mockApiFetch
        .mockResolvedValueOnce([])  // loadConfigs on mount
        .mockResolvedValue(EMPTY_USAGE); // loadUsage

      const { result } = renderHook(() => useAIConfig("token"));

      await waitForLoad();

      mockApiFetch.mockClear();

      await act(async () => {
        await result.current.loadUsage(7);
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/ai/config/usage?days=7");
      expect(result.current.usage).toEqual(EMPTY_USAGE);
    });
  });
});
