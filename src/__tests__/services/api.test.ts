import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// packages/shared/src/api.ts crea su cliente axios una sola vez a nivel de
// módulo (`const http = axios.create()`) — el mock debe interceptar
// `axios.create()` para devolver un objeto cuyo `.request` controlamos, y
// también `axios.get`/`axios.post` sueltos (usados directamente en
// ensureCsrfCookie y en el authorizer de echo.ts, fuera de packages/shared).
// AxiosError no es una clase real acá — los helpers construyen objetos con
// `isAxiosError`/`.response` que es lo único que el código de producción
// inspecciona (`err as AxiosError`, nunca `instanceof`).
// ---------------------------------------------------------------------------

const { mockRequest, mockGet, mockPost } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    create: () => ({ request: mockRequest }),
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { apiFetch, apiDownload, setTokenRefreshHandler, setApiBaseUrl, fetchDocumentHistory, fetchAllProjectDocuments } from "@/services/api";

const BASE_URL = "http://localhost:8000/api";

// ---------------------------------------------------------------------------
// api.ts calcula API_BASE_URL desde VITE_API_URL como side-effect al importar
// el módulo (antes de que cualquier vi.stubEnv de este archivo pueda surtir
// efecto) — usa directamente el valor real del .env local. setApiBaseUrl()
// (ya exportado por el módulo para ese propósito) fija explícitamente la URL
// que este archivo espera, sin depender del entorno de quien ejecute el test.
// ---------------------------------------------------------------------------

beforeEach(() => {
  setApiBaseUrl(BASE_URL);
  mockRequest.mockReset();
  mockGet.mockReset().mockResolvedValue({ status: 204, data: "", headers: {} });
  mockPost.mockReset();
  document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simula una respuesta exitosa (2xx) del cliente axios (`http.request`). */
function mockAxiosSuccess(response: {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}) {
  const { status = 200, body = null, headers = {} } = response;
  const text =
    body === null
      ? ""
      : typeof body === "string"
        ? body
        : JSON.stringify(body);

  mockRequest.mockResolvedValue({ status, data: text, headers });
}

/** Simula un error HTTP (axios rechaza con `.response` poblado) en `http.request`. */
function mockAxiosError(status: number, body: unknown) {
  const data = body === null ? "" : typeof body === "string" ? body : JSON.stringify(body);
  mockRequest.mockRejectedValue({ isAxiosError: true, response: { status, data } });
}

function lastRequestConfig(): { url: string; method: string; headers: Record<string, string>; data?: unknown } {
  return mockRequest.mock.calls[0][0];
}

// ---------------------------------------------------------------------------
// apiFetch
// ---------------------------------------------------------------------------

describe("apiFetch", () => {
  it("GET — retorna data desenvuelta de .data (Laravel convention)", async () => {
    mockAxiosSuccess({ body: { data: [{ id: 1, name: "Test" }] } });

    const result = await apiFetch("/test");
    expect(result).toEqual([{ id: 1, name: "Test" }]);
  });

  it("GET — retorna json directo si no hay .data", async () => {
    mockAxiosSuccess({ body: { message: "ok" } });

    const result = await apiFetch("/test");
    expect(result).toEqual({ message: "ok" });
  });

  it("204 No Content — retorna undefined", async () => {
    mockAxiosSuccess({ status: 204, body: null });

    const result = await apiFetch("/test");
    expect(result).toBeUndefined();
  });

  it("ignora un `token` Bearer heredado — web se autentica por cookie de sesión", async () => {
    mockAxiosSuccess({ body: { ok: true } });

    await apiFetch("/secure", { token: "abc123" });

    const { headers } = lastRequestConfig();
    expect(headers.Authorization).toBeUndefined();
  });

  it("siempre envía withCredentials: true (cookie httpOnly de sesión)", async () => {
    mockAxiosSuccess({ body: { ok: true } });

    await apiFetch("/secure");

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: `${BASE_URL}/secure`, withCredentials: true }),
    );
  });

  it("envía Content-Type application/json cuando hay body string", async () => {
    mockAxiosSuccess({ body: { ok: true } });

    await apiFetch("/post", {
      method: "POST",
      body: JSON.stringify({ foo: "bar" }),
    });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${BASE_URL}/post`,
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });

  it("NO envía Content-Type si no hay body", async () => {
    mockAxiosSuccess({ body: { ok: true } });

    await apiFetch("/get");

    const { headers } = lastRequestConfig();
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("mezcla headers custom con los default", async () => {
    mockAxiosSuccess({ body: { ok: true } });

    await apiFetch("/test", {
      headers: { "X-Custom": "val" } as Record<string, string>,
    });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${BASE_URL}/test`,
        headers: expect.objectContaining({ "X-Custom": "val" }),
      }),
    );
  });

  // -----------------------------------------------------------------------
  // CSRF (Sanctum SPA): cookie XSRF-TOKEN ↔ header X-XSRF-TOKEN
  // -----------------------------------------------------------------------

  it("GET no dispara la obtención de la cookie CSRF", async () => {
    mockAxiosSuccess({ body: { ok: true } });

    await apiFetch("/test");

    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("POST sin cookie XSRF-TOKEN — la obtiene primero desde /sanctum/csrf-cookie", async () => {
    mockAxiosSuccess({ body: { ok: true } });

    await apiFetch("/post", { method: "POST", body: JSON.stringify({ a: 1 }) });

    expect(mockGet).toHaveBeenCalledWith(
      "http://localhost:8000/sanctum/csrf-cookie",
      expect.objectContaining({ withCredentials: true }),
    );
  });

  it("POST con cookie XSRF-TOKEN presente — la envía como header X-XSRF-TOKEN", async () => {
    document.cookie = "XSRF-TOKEN=token-value-123";
    mockAxiosSuccess({ body: { ok: true } });

    await apiFetch("/post", { method: "POST", body: JSON.stringify({ a: 1 }) });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${BASE_URL}/post`,
        headers: expect.objectContaining({ "X-XSRF-TOKEN": "token-value-123" }),
      }),
    );
    // Cookie ya presente: no vuelve a pedir /sanctum/csrf-cookie
    expect(mockGet).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Error handling — HTTP status codes
  // -----------------------------------------------------------------------

  it("401 — lanza 'Sesión expirada...'", async () => {
    mockAxiosError(401, { message: "Unauthenticated" });

    await expect(apiFetch("/secure")).rejects.toThrow("Sesión expirada");
  });

  it("403 — lanza 'No tienes permiso...'", async () => {
    mockAxiosError(403, { message: "Forbidden" });

    await expect(apiFetch("/admin")).rejects.toThrow("No tienes permiso");
  });

  it("404 — lanza 'El recurso solicitado...'", async () => {
    mockAxiosError(404, { message: "Not Found" });

    await expect(apiFetch("/missing")).rejects.toThrow("El recurso solicitado");
  });

  it("422 — extrae primer error de validación de Laravel", async () => {
    mockAxiosError(422, {
      message: "The given data was invalid.",
      errors: { email: ["El correo ya está registrado."], name: ["El nombre es requerido."] },
    });

    await expect(apiFetch("/validate")).rejects.toThrow("El correo ya está registrado.");
  });

  it("422 sin errors — usa body.message como fallback", async () => {
    mockAxiosError(422, { message: "Validation failed" });

    await expect(apiFetch("/validate")).rejects.toThrow("Validation failed");
  });

  it("422 sin errors ni message — lanza 'Datos inválidos.'", async () => {
    mockAxiosError(422, {});

    await expect(apiFetch("/validate")).rejects.toThrow("Datos inválidos.");
  });

  it("422 con body no parseable — lanza mensaje genérico", async () => {
    mockAxiosError(422, "not-json");

    await expect(apiFetch("/validate")).rejects.toThrow("Revisa la información ingresada");
  });

  it("429 — lanza 'Demasiadas solicitudes...'", async () => {
    mockAxiosError(429, { message: "Too Many Attempts." });

    await expect(apiFetch("/rate-limited")).rejects.toThrow("Demasiadas solicitudes");
  });

  it("503 con attemptLog — lanza error con attemptLog", async () => {
    mockAxiosError(503, { error: "Todos los proveedores fallaron.", attemptLog: ["OpenAI: timeout", "Gemini: 500"] });

    let error: Error & { attemptLog?: string[] } | undefined;
    try {
      await apiFetch("/evaluate");
    } catch (e) {
      error = e as Error & { attemptLog?: string[] };
    }

    expect(error?.message).toContain("Todos los proveedores fallaron");
    expect(error?.attemptLog).toEqual(["OpenAI: timeout", "Gemini: 500"]);
  });

  it("503 sin attemptLog — lanza mensaje genérico IA", async () => {
    mockAxiosError(503, {});

    await expect(apiFetch("/evaluate")).rejects.toThrow("Error en la evaluación de IA");
  });

  it("503 con body no parseable — lanza mensaje genérico IA", async () => {
    mockAxiosError(503, "not-json");

    await expect(apiFetch("/evaluate")).rejects.toThrow("Error en la evaluación de IA");
  });

  it("500 — lanza 'Error interno del servidor...'", async () => {
    mockAxiosError(500, { message: "Server Error" });

    await expect(apiFetch("/broken")).rejects.toThrow("Error interno del servidor");
  });

  it("status code no manejado — lanza mensaje con el código", async () => {
    mockAxiosError(418, {});

    await expect(apiFetch("/teapot")).rejects.toThrow("Error del servidor (418)");
  });

  // -----------------------------------------------------------------------
  // Token refresh via X-Refresh-Token
  // -----------------------------------------------------------------------

  it("X-Refresh-Token header — invoca handler registrado", async () => {
    const handler = vi.fn();
    setTokenRefreshHandler(handler);

    mockAxiosSuccess({ body: { ok: true }, headers: { "x-refresh-token": "new-token-123" } });

    await apiFetch("/test");

    expect(handler).toHaveBeenCalledWith("new-token-123");
  });

  it("X-Refresh-Token header — no falla si no hay handler", async () => {
    setTokenRefreshHandler(null!);

    mockAxiosSuccess({ body: { ok: true }, headers: { "x-refresh-token": "new-token" } });

    await expect(apiFetch("/test")).resolves.toEqual({ ok: true });
  });

  // -----------------------------------------------------------------------
  // Respuesta vacía (texto plano o sin contenido)
  // -----------------------------------------------------------------------

  it("respuesta vacía (text empty) — retorna undefined", async () => {
    mockAxiosSuccess({ status: 200, body: "" });

    const result = await apiFetch("/empty");
    expect(result).toBeUndefined();
  });

  it("respuesta ok con body string (no JSON) — tira error de parseo", async () => {
    mockAxiosSuccess({ status: 200, body: "plain text" });

    await expect(apiFetch("/plain")).rejects.toThrow(); // JSON.parse lanza
  });

  // -----------------------------------------------------------------------
  // Dedup de GETs concurrentes — evita multiplicar requests idénticas en
  // vuelo (ej. StrictMode duplicando efectos de montaje, o dos componentes
  // pidiendo el mismo endpoint al mismo tiempo). Ver Hallazgo de 429 en
  // cascada por agotamiento del rate limit del backend.
  // -----------------------------------------------------------------------

  it("dos GET concurrentes al mismo path comparten una sola llamada a axios", async () => {
    let resolveRequest!: (value: unknown) => void;
    mockRequest.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRequest = resolve;
        }),
    );

    const p1 = apiFetch("/dedup-test");
    const p2 = apiFetch("/dedup-test");

    resolveRequest({ status: 200, data: JSON.stringify({ data: { id: 1 } }), headers: {} });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual({ id: 1 });
    expect(r2).toEqual({ id: 1 });
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("dos GET secuenciales (uno después de que el otro ya resolvió) disparan axios por separado", async () => {
    mockAxiosSuccess({ body: { data: { id: 1 } } });

    await apiFetch("/dedup-sequential");
    await apiFetch("/dedup-sequential");

    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it("dos POST concurrentes al mismo path NUNCA comparten promesa (solo GET se deduplica)", async () => {
    document.cookie = "XSRF-TOKEN=token-value-123"; // evita el fetch extra de /sanctum/csrf-cookie
    mockAxiosSuccess({ body: { data: { ok: true } } });

    await Promise.all([
      apiFetch("/dedup-mutation", { method: "POST", body: JSON.stringify({ a: 1 }) }),
      apiFetch("/dedup-mutation", { method: "POST", body: JSON.stringify({ a: 2 }) }),
    ]);

    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it("un GET que falla no deja la entrada de dedup colgada — el siguiente intento dispara una request nueva", async () => {
    mockAxiosError(500, { message: "Server Error" });

    await expect(apiFetch("/dedup-error")).rejects.toThrow();
    await expect(apiFetch("/dedup-error")).rejects.toThrow();

    expect(mockRequest).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// fetchDocumentHistory / fetchAllProjectDocuments — apiFetch ya desenvuelve
// `response.data` internamente (convención Laravel); estas dos funciones
// deben devolver el array directo, sin volver a desestructurar `.data` por
// encima (bug real: eso devolvía `undefined` en producción, ver commit que
// agrega estos tests).
// ---------------------------------------------------------------------------

describe("fetchDocumentHistory", () => {
  it("devuelve el array de versiones directo, no envuelto en { data }", async () => {
    const versions = [
      { id: 1, documentType: "PLANO", originalName: "v1.pdf", documentGroupId: 1, versionNumber: 1 },
      { id: 2, documentType: "PLANO", originalName: "v2.pdf", documentGroupId: 1, versionNumber: 2 },
    ];
    mockAxiosSuccess({ body: { data: versions } });

    const result = await fetchDocumentHistory("PRJ-001", 2, "token");

    expect(result).toEqual(versions);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("fetchAllProjectDocuments", () => {
  it("devuelve el array de documentos directo, no envuelto en { data }", async () => {
    const documents = [
      { id: 40, documentType: "FOTO", originalName: "LOGO.jpg", documentGroupId: 40, versionNumber: 1, deletedAt: null },
      { id: 42, documentType: "FOTO", originalName: "borrado.png", documentGroupId: 42, versionNumber: 1, deletedAt: "2026-08-26T13:10:20+00:00" },
    ];
    mockAxiosSuccess({ body: { data: documents } });

    const result = await fetchAllProjectDocuments("PRJ-015", "token");

    expect(result).toEqual(documents);
    expect(result).toHaveLength(2);
  });

  it("llama al endpoint con all_versions=true e include_deleted=true", async () => {
    mockAxiosSuccess({ body: { data: [] } });

    await fetchAllProjectDocuments("PRJ-015", "token");

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${BASE_URL}/projects/PRJ-015/documents?all_versions=true&include_deleted=true`,
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// apiDownload
// ---------------------------------------------------------------------------

describe("apiDownload", () => {
  it("descarga blob exitosamente", async () => {
    mockRequest.mockResolvedValue({ status: 200, data: new Blob([new ArrayBuffer(10)]), headers: {} });

    const blob = await apiDownload("/file.pdf");

    expect(blob).toBeInstanceOf(Blob);
  });

  it("envía withCredentials: true, ignora un token Bearer heredado", async () => {
    mockRequest.mockResolvedValue({ status: 200, data: new Blob([new ArrayBuffer(10)]), headers: {} });

    await apiDownload("/file.pdf", { token: "tok" });

    const config = lastRequestConfig();
    expect(config.url).toBe(`${BASE_URL}/file.pdf`);
    expect((config as unknown as { withCredentials: boolean }).withCredentials).toBe(true);
    expect(config.headers?.Authorization).toBeUndefined();
  });

  it("error — lanza mensaje del body", async () => {
    const body = JSON.stringify({ message: "Archivo no encontrado." });
    mockRequest.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: new Blob([body]) },
    });

    await expect(apiDownload("/missing.pdf")).rejects.toThrow("Archivo no encontrado.");
  });

  it("error sin body parseable — lanza mensaje genérico", async () => {
    mockRequest.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: new Blob(["server error"]) },
    });

    await expect(apiDownload("/broken.pdf")).rejects.toThrow("Error al descargar");
  });
});
