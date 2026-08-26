import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waitFor } from "@testing-library/react";

// Mock de laravel-echo: capturamos las opciones pasadas al constructor sin
// levantar una conexión WebSocket real.
const echoConstructorSpy = vi.fn();
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

const mockGetApiBaseUrl = vi.fn(() => "http://localhost:8000/api");
const mockEnsureCsrfCookie = vi.fn().mockResolvedValue(undefined);
const mockReadCookie = vi.fn((_name: string) => "csrf-token-123");
vi.mock("@/services/api", () => ({
  getApiBaseUrl: () => mockGetApiBaseUrl(),
  ensureCsrfCookie: () => mockEnsureCsrfCookie(),
  readCookie: (name: string) => mockReadCookie(name),
}));

describe("createEchoClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    echoConstructorSpy.mockClear();
    mockGetApiBaseUrl.mockClear();
    mockEnsureCsrfCookie.mockClear();
    mockReadCookie.mockClear();
    vi.stubEnv("VITE_REVERB_APP_KEY", "test-key");
    vi.stubEnv("VITE_REVERB_HOST", "localhost");
    vi.stubEnv("VITE_REVERB_PORT", "8080");
    vi.stubEnv("VITE_REVERB_SCHEME", "http");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("configura Echo con broadcaster reverb y las variables de entorno", async () => {
    const { createEchoClient } = await import("@/services/echo");
    createEchoClient();

    expect(echoConstructorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        broadcaster: "reverb",
        key: "test-key",
        wsHost: "localhost",
        wsPort: 8080,
        wssPort: 8080,
        forceTLS: false,
        enabledTransports: ["ws", "wss"],
      }),
    );
  });

  it("forceTLS es true cuando VITE_REVERB_SCHEME es https", async () => {
    vi.stubEnv("VITE_REVERB_SCHEME", "https");

    const { createEchoClient } = await import("@/services/echo");
    createEchoClient();

    expect(echoConstructorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ forceTLS: true }),
    );
  });

  it("el authorizer llama a /broadcasting/auth (sin prefijo /api) con credentials include y el header CSRF", async () => {
    const mockResponse = { auth: "signed-auth-string" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    }) as unknown as typeof fetch;

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
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/broadcasting/auth",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({ "X-XSRF-TOKEN": "csrf-token-123" }),
        body: JSON.stringify({ socket_id: "socket-id-123", channel_name: "private-App.Models.User.1" }),
      }),
    );
    expect(callback).toHaveBeenCalledWith(null, mockResponse);
  });

  it("el authorizer invoca el callback con error si la respuesta no es ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 }) as unknown as typeof fetch;

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
