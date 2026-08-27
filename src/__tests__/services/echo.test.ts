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

  it("retorna null sin instanciar Echo cuando VITE_PUSHER_APP_KEY no está definida", async () => {
    // Stub explícito a "" (no unstub): unstub revierte al valor real del
    // .env local, que sí tiene VITE_PUSHER_APP_KEY seteada para desarrollo
    // — este test simula el escenario real que rompió PRD (build sin la env
    // var definida), que solo se reproduce forzando el valor vacío acá.
    vi.stubEnv("VITE_PUSHER_APP_KEY", "");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { createEchoClient } = await import("@/services/echo");
    const result = createEchoClient();

    expect(result).toBeNull();
    expect(echoConstructorSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("VITE_PUSHER_APP_KEY"));

    consoleErrorSpy.mockRestore();
  });

  it("retorna null en vez de lanzar si el constructor de Echo tira una excepción síncrona", async () => {
    vi.stubEnv("VITE_PUSHER_APP_KEY", "test-key");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    echoConstructorSpy.mockImplementationOnce(() => {
      throw new Error("You must pass your app key when you instantiate Pusher.");
    });

    const { createEchoClient } = await import("@/services/echo");

    let result: unknown;
    expect(() => { result = createEchoClient(); }).not.toThrow();
    expect(result).toBeNull();

    consoleErrorSpy.mockRestore();
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
