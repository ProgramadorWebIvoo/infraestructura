import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mismo patrón de mock que api.test.ts: `http.request` de axios es el único punto de red.
const { mockRequest, mockGet } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
  mockGet: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    create: () => ({ request: mockRequest }),
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
  },
}));

import { apiFetch, setApiBaseUrl } from "@/services/api";
import { buildApiError, generateIdempotencyKey, IDEMPOTENCY_IN_PROGRESS, resetIdempotencyState } from "@ivoo/shared";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ok = (body: unknown = { data: { id: 1 } }) => ({ status: 200, data: JSON.stringify(body), headers: {} });
const networkError = () => ({ isAxiosError: true, message: "Network Error" });
const httpError = (status: number, body: unknown = {}, headers: Record<string, string> = {}) => ({
  isAxiosError: true,
  response: { status, data: JSON.stringify(body), headers },
});

const sentHeaders = (call = 0): Record<string, string> => mockRequest.mock.calls[call][0].headers;

beforeEach(() => {
  setApiBaseUrl("http://localhost:8000/api");
  mockRequest.mockReset();
  resetIdempotencyState();
  mockGet.mockReset().mockResolvedValue({ status: 204, data: "", headers: {} });
  document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Ejecuta la mutación avanzando los timers de backoff hasta que termine. */
async function runWithTimers<T>(promise: Promise<T>): Promise<T> {
  // Evita un unhandled rejection mientras se avanzan los timers.
  const settled = promise.then((v) => ({ v }), (e) => ({ e }));
  await vi.advanceTimersByTimeAsync(10_000);
  const result = await settled;
  if ("e" in result) throw result.e;
  return result.v;
}

describe("Idempotency-Key en apiFetch", () => {
  it("las mutaciones envían un UUID v4 en Idempotency-Key", async () => {
    mockRequest.mockResolvedValue(ok());

    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      mockRequest.mockClear();
      await apiFetch("/things", { method, body: "{}" });
      expect(sentHeaders()["Idempotency-Key"]).toMatch(UUID);
    }
  });

  it("los GET no envían clave", async () => {
    mockRequest.mockResolvedValue(ok());

    await apiFetch("/things");

    expect(sentHeaders()["Idempotency-Key"]).toBeUndefined();
  });

  it("cada llamada mutante genera una clave distinta", async () => {
    mockRequest.mockResolvedValue(ok());

    await apiFetch("/things", { method: "POST", body: "{}" });
    await apiFetch("/things", { method: "POST", body: "{}" });

    expect(sentHeaders(0)["Idempotency-Key"]).not.toBe(sentHeaders(1)["Idempotency-Key"]);
  });

  it("respeta la clave que pasa el caller y no la mezcla con el body", async () => {
    mockRequest.mockResolvedValue(ok());
    const key = generateIdempotencyKey();

    await apiFetch("/things", { method: "POST", body: JSON.stringify({ a: 1 }), idempotencyKey: key });

    expect(sentHeaders()["Idempotency-Key"]).toBe(key);
    expect(mockRequest.mock.calls[0][0].data).toBe(JSON.stringify({ a: 1 }));
  });
});

describe("reintentos seguros de mutaciones", () => {
  beforeEach(() => vi.useFakeTimers());

  it("reintenta un error de red con la MISMA clave y devuelve el resultado", async () => {
    mockRequest.mockRejectedValueOnce(networkError()).mockResolvedValueOnce(ok({ data: { id: 7 } }));

    const result = await runWithTimers(apiFetch("/things", { method: "POST", body: "{}" }));

    expect(result).toEqual({ id: 7 });
    expect(mockRequest).toHaveBeenCalledTimes(2);
    expect(sentHeaders(0)["Idempotency-Key"]).toBe(sentHeaders(1)["Idempotency-Key"]);
  });

  it("reintenta 502 y 504", async () => {
    for (const status of [502, 504]) {
      mockRequest.mockReset().mockRejectedValueOnce(httpError(status)).mockResolvedValueOnce(ok());

      await runWithTimers(apiFetch("/things", { method: "PATCH", body: "{}" }));

      expect(mockRequest).toHaveBeenCalledTimes(2);
    }
  });

  it("se rinde tras 2 reintentos (3 intentos en total) y lanza el error", async () => {
    mockRequest.mockRejectedValue(networkError());

    await expect(runWithTimers(apiFetch("/things", { method: "POST", body: "{}" }))).rejects.toMatchObject({ message: "Network Error" });

    expect(mockRequest).toHaveBeenCalledTimes(3);
  });

  it("409 IDEMPOTENCY_IN_PROGRESS espera Retry-After y reintenta con la misma clave", async () => {
    mockRequest
      .mockRejectedValueOnce(httpError(409, { code: IDEMPOTENCY_IN_PROGRESS, message: "En proceso" }, { "retry-after": "2" }))
      .mockResolvedValueOnce(ok());

    const promise = apiFetch("/things", { method: "POST", body: "{}" });
    await vi.advanceTimersByTimeAsync(1_900);
    expect(mockRequest).toHaveBeenCalledTimes(1); // aún espera los 2 s
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    expect(mockRequest).toHaveBeenCalledTimes(2);
    expect(sentHeaders(0)["Idempotency-Key"]).toBe(sentHeaders(1)["Idempotency-Key"]);
  });

  it.each([
    [500, {}],
    [503, {}],
    [422, { message: "x" }],
    [409, { code: "OTRO_CONFLICTO" }],
    [428, { code: "IDEMPOTENCY_KEY_REQUIRED", message: "Falta la clave" }],
  ])("NO reintenta un %i", async (status, body) => {
    mockRequest.mockRejectedValue(httpError(status as number, body));

    await expect(runWithTimers(apiFetch("/things", { method: "POST", body: "{}" }))).rejects.toBeDefined();

    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it.each([
    "/public/invitations/abc/proposal",
    "/ai/config/3/test",
    "/exchange-rates/sync",
    "/rating-ia/run",
    "/login",
    "/contractors",
  ])("NO reintenta %s (el backend no la protege con idempotencia)", async (path) => {
    mockRequest.mockRejectedValue(networkError());

    await expect(runWithTimers(apiFetch(path, { method: "POST", body: "{}" }))).rejects.toBeDefined();

    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("NO reintenta GET", async () => {
    mockRequest.mockRejectedValue(networkError());

    await expect(runWithTimers(apiFetch("/things"))).rejects.toBeDefined();

    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("no reintenta si la petición fue cancelada por el usuario", async () => {
    mockRequest.mockRejectedValue({ isAxiosError: true, code: "ERR_CANCELED", message: "canceled" });

    await expect(runWithTimers(apiFetch("/things", { method: "POST", body: "{}" }))).rejects.toBeDefined();

    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});

describe("buildApiError con códigos de idempotencia", () => {
  it("usa el mensaje del backend y expone code y Retry-After", () => {
    const error = buildApiError(409, JSON.stringify({ code: IDEMPOTENCY_IN_PROGRESS, message: "Sigue en proceso" }), { "retry-after": "2" });

    expect(error.message).toBe("Sigue en proceso");
    expect(error.status).toBe(409);
    expect(error.code).toBe(IDEMPOTENCY_IN_PROGRESS);
    expect(error.retryAfterSeconds).toBe(2);
  });

  it("422 con IDEMPOTENCY_KEY_REUSED conserva su mensaje (no el de validación genérico)", () => {
    const error = buildApiError(422, JSON.stringify({ code: "IDEMPOTENCY_KEY_REUSED", message: "Datos distintos" }));

    expect(error.message).toBe("Datos distintos");
    expect(error.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("los errores sin code siguen igual que antes", () => {
    expect(buildApiError(500, "{}").message).toBe("Error interno del servidor. Intenta más tarde.");
    expect(buildApiError(409, "{}").message).toBe("Error del servidor (409).");
    expect(buildApiError(403, "{}").code).toBeUndefined();
  });
});

describe("generateIdempotencyKey", () => {
  it("genera UUID v4 válidos y distintos", () => {
    const a = generateIdempotencyKey();
    const b = generateIdempotencyKey();

    expect(a).toMatch(UUID);
    expect(a).not.toBe(b);
  });

  it("sin crypto.randomUUID (http en la red local) cae a getRandomValues", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.forEach((_, i) => { bytes[i] = (i * 37 + 11) % 256; });
        return bytes;
      },
    });

    expect(generateIdempotencyKey()).toMatch(UUID);
  });

  it("sin ningún crypto disponible sigue generando un UUID v4 válido", () => {
    vi.stubGlobal("crypto", undefined);

    expect(generateIdempotencyKey()).toMatch(UUID);
  });
});

describe("identidad de la operación (doble clic y reintento manual)", () => {
  const post = (body: unknown = { amount: 100 }) => apiFetch("/projects/P1/payments", { method: "POST", body: JSON.stringify(body) });

  it("dos llamadas idénticas en vuelo (doble clic) comparten UNA petición", async () => {
    let resolve!: (value: unknown) => void;
    mockRequest.mockReturnValue(new Promise((r) => { resolve = r; }));

    const first = post();
    const second = post();
    resolve(ok({ data: { id: 9 } }));

    expect(await first).toEqual({ id: 9 });
    expect(await second).toEqual({ id: 9 });
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("llamadas con body distinto en vuelo son operaciones distintas con claves distintas", async () => {
    mockRequest.mockResolvedValue(ok());

    await Promise.all([post({ amount: 100 }), post({ amount: 200 })]);

    expect(mockRequest).toHaveBeenCalledTimes(2);
    expect(sentHeaders(0)["Idempotency-Key"]).not.toBe(sentHeaders(1)["Idempotency-Key"]);
  });

  it("tras un éxito, la misma operación otra vez es una operación nueva (clave nueva)", async () => {
    mockRequest.mockResolvedValue(ok());

    await post();
    await post();

    expect(mockRequest).toHaveBeenCalledTimes(2);
    expect(sentHeaders(0)["Idempotency-Key"]).not.toBe(sentHeaders(1)["Idempotency-Key"]);
  });

  it("tras un error con respuesta del servidor (422) la clave se descarta", async () => {
    mockRequest.mockRejectedValueOnce(httpError(422, { message: "Falta comprobante" })).mockResolvedValueOnce(ok());

    await expect(post()).rejects.toBeDefined();
    await post();

    expect(sentHeaders(0)["Idempotency-Key"]).not.toBe(sentHeaders(1)["Idempotency-Key"]);
  });

  it("tras un resultado desconocido (red) el reintento manual REUTILIZA la clave", async () => {
    vi.useFakeTimers();
    mockRequest.mockRejectedValue(networkError());
    await expect(runWithTimers(post())).rejects.toBeDefined(); // 3 intentos, todos sin respuesta
    const usedKey = sentHeaders(0)["Idempotency-Key"];

    mockRequest.mockReset().mockResolvedValue(ok());
    await post();

    expect(sentHeaders(0)["Idempotency-Key"]).toBe(usedKey);
  });

  it("un 409 'en proceso' que no se resuelve conserva la clave", async () => {
    vi.useFakeTimers();
    mockRequest.mockRejectedValue(httpError(409, { code: IDEMPOTENCY_IN_PROGRESS, message: "En proceso" }, { "retry-after": "1" }));
    await expect(runWithTimers(post())).rejects.toMatchObject({ code: IDEMPOTENCY_IN_PROGRESS });
    const usedKey = sentHeaders(0)["Idempotency-Key"];

    mockRequest.mockReset().mockResolvedValue(ok());
    await post();

    expect(sentHeaders(0)["Idempotency-Key"]).toBe(usedKey);
  });

  it("si el usuario cambia los datos tras un resultado desconocido, nace una clave nueva", async () => {
    vi.useFakeTimers();
    mockRequest.mockRejectedValue(networkError());
    await expect(runWithTimers(post({ amount: 100 }))).rejects.toBeDefined();
    const usedKey = sentHeaders(0)["Idempotency-Key"];

    mockRequest.mockReset().mockResolvedValue(ok());
    await post({ amount: 150 });

    expect(sentHeaders(0)["Idempotency-Key"]).not.toBe(usedKey);
  });

  it("una clave pendiente vence a los 10 minutos", async () => {
    vi.useFakeTimers();
    mockRequest.mockRejectedValue(networkError());
    await expect(runWithTimers(post())).rejects.toBeDefined();
    const usedKey = sentHeaders(0)["Idempotency-Key"];

    await vi.advanceTimersByTimeAsync(11 * 60 * 1000);
    mockRequest.mockReset().mockResolvedValue(ok());
    await post();

    expect(sentHeaders(0)["Idempotency-Key"]).not.toBe(usedKey);
  });

  it("resetIdempotencyState (logout) descarta las claves pendientes", async () => {
    vi.useFakeTimers();
    mockRequest.mockRejectedValue(networkError());
    await expect(runWithTimers(post())).rejects.toBeDefined();
    const usedKey = sentHeaders(0)["Idempotency-Key"];

    resetIdempotencyState();
    mockRequest.mockReset().mockResolvedValue(ok());
    await post();

    expect(sentHeaders(0)["Idempotency-Key"]).not.toBe(usedKey);
  });

  it("FormData: los mismos archivos son la misma operación; otro archivo, otra", async () => {
    const form = (content: string) => {
      const data = new FormData();
      data.append("files[]", new File([content], "comprobante.pdf", { type: "application/pdf", lastModified: 1 }));
      return data;
    };
    let resolve!: (value: unknown) => void;
    mockRequest.mockReturnValue(new Promise((r) => { resolve = r; }));

    const a = apiFetch("/projects/P1/documents", { method: "POST", body: form("AAAA") });
    const b = apiFetch("/projects/P1/documents", { method: "POST", body: form("AAAA") });
    const c = apiFetch("/projects/P1/documents", { method: "POST", body: form("BBBBBB") });
    resolve(ok());
    await Promise.all([a, b, c]);

    expect(mockRequest).toHaveBeenCalledTimes(2); // a y b se fusionan, c es distinta
  });

  it("con idempotencyKey explícita no se fusiona ni se recuerda", async () => {
    mockRequest.mockResolvedValue(ok());

    await Promise.all([
      apiFetch("/things", { method: "POST", body: "{}", idempotencyKey: generateIdempotencyKey() }),
      apiFetch("/things", { method: "POST", body: "{}", idempotencyKey: generateIdempotencyKey() }),
    ]);

    expect(mockRequest).toHaveBeenCalledTimes(2);
  });
});

describe("replay de respuesta omitida por tamaño", () => {
  it("lanza un ApiError con code en vez de entregar { replayed: true } como si fuera el recurso", async () => {
    mockRequest.mockResolvedValue({
      status: 201,
      data: JSON.stringify({ replayed: true, code: "IDEMPOTENCY_RESPONSE_OMITTED", message: "Ya se aplicó; actualiza." }),
      headers: {},
    });

    await expect(apiFetch("/projects/P1/payments", { method: "POST", body: "{}" })).rejects.toMatchObject({
      message: "Ya se aplicó; actualiza.",
      status: 201,
      code: "IDEMPOTENCY_RESPONSE_OMITTED",
    });
  });
});
