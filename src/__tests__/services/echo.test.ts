import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waitFor } from "@testing-library/react";

// Mock de laravel-echo: capturamos las opciones pasadas al constructor sin
// levantar una conexión WebSocket real.
const { echoConstructorSpy, mockPost } = vi.hoisted(() => ({
  echoConstructorSpy: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock("laravel-echo", () => ({
  default: class MockEcho {
    constructor(options: unknown) {
      echoConstructorSpy(options);
    }
  },
}));

vi.mock("pusher-js", () => ({
  default: class MockPusher {},
}));

vi.mock("axios", () => ({
  default: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

const mockGetApiBaseUrl = vi.fn(() => "http://localhost:8000/api");
const mockEnsureCsrfCookie = vi.fn().mockResolvedValue(undefined);
const mockReadCookie = vi.fn((_name: string) => "csrf-token-123");
vi.mock("@/services/api", () => ({
  getApiBaseUrl: () => mockGetApiBaseUrl(),
  ensureCsrfCookie: () => mockEnsureCsrfCookie(),
  readCookie: (name: string) => mockReadCookie(name),
}));

describe("createEchoClient", () => {
  beforeEach(() => {
    echoConstructorSpy.mockClear();
    mockPost.mockReset();
    mockGetApiBaseUrl.mockClear();
    mockEnsureCsrfCookie.mockClear();
    mockReadCookie.mockClear();
    vi.stubEnv("VITE_PUSHER_APP_KEY", "test-key");
    vi.stubEnv("VITE_PUSHER_APP_CLUSTER", "mt1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("configura Echo con broadcaster pusher y las variables de entorno", async () => {
    const { createEchoClient } = await import("@/services/echo");
    createEchoClient();

    expect(echoConstructorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        broadcaster: "pusher",
        key: "test-key",
        cluster: "mt1",
        forceTLS: true,
      }),
    );
  });

  it("usa 'mt1' como cluster por defecto si VITE_PUSHER_APP_CLUSTER no está seteado", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_PUSHER_APP_KEY", "test-key");
    // VITE_PUSHER_APP_CLUSTER deliberadamente sin stubear (undefined).

    const { createEchoClient } = await import("@/services/echo");
    createEchoClient();

    expect(echoConstructorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ cluster: "mt1" }),
    );
  });

  it("el authorizer llama a /broadcasting/auth (sin prefijo /api) con withCredentials y el header CSRF", async () => {
    const mockResponse = { auth: "signed-auth-string" };
    mockPost.mockResolvedValue({ data: mockResponse });

    const { createEchoClient } = await import("@/services/echo");
    createEchoClient();

    const options = echoConstructorSpy.mock.calls[0][0] as {
      authorizer: (channel: { name: string }) => { authorize: (socketId: string, cb: (err: unknown, data: unknown) => void) => void };
    };
    const authorizerInstance = options.authorizer({ name: "private-App.Models.User.1" });

    const callback = vi.fn();
    authorizerInstance.authorize("socket-id-123", callback);

    await waitFor(() => expect(callback).toHaveBeenCalled());

    expect(mockEnsureCsrfCookie).toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith(
      "http://localhost:8000/broadcasting/auth",
      { socket_id: "socket-id-123", channel_name: "private-App.Models.User.1" },
      expect.objectContaining({
        withCredentials: true,
        headers: expect.objectContaining({ "X-XSRF-TOKEN": "csrf-token-123" }),
      }),
    );
    expect(callback).toHaveBeenCalledWith(null, mockResponse);
  });

  it("el authorizer invoca el callback con error si la respuesta no es ok", async () => {
    mockPost.mockRejectedValue({ isAxiosError: true, response: { status: 403 } });

    const { createEchoClient } = await import("@/services/echo");
    createEchoClient();

    const options = echoConstructorSpy.mock.calls[0][0] as {
      authorizer: (channel: { name: string }) => { authorize: (socketId: string, cb: (err: unknown, data: unknown) => void) => void };
    };
    const authorizerInstance = options.authorizer({ name: "private-App.Models.User.1" });

    const callback = vi.fn();
    authorizerInstance.authorize("socket-id-123", callback);

    await waitFor(() => expect(callback).toHaveBeenCalled());

    expect(callback).toHaveBeenCalledWith(expect.any(Error), null);
  });
});
