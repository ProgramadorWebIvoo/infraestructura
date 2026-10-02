import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mismo patrón que api.test.ts: se intercepta `axios.create()` para controlar `http.request`.
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

import { apiFetch, setApiBaseUrl, isRequestCanceled, REQUEST_TIMEOUT } from "@/services/api";
import { ApiError, TRANSFER_INACTIVITY_MS, TRANSFER_PROCESSING_MS } from "@ivoo/shared";

const BASE_URL = "http://localhost:8000/api";
const OK = { status: 200, data: JSON.stringify({ data: { ok: true } }), headers: {} };

/** FormData solo con texto: cuenta como subida pero no pasa por el escáner de archivos. */
const upload = (value = "a") => {
  const form = new FormData();
  form.append("campo", value);
  return form;
};

/** Petición que nunca responde y rechaza como axios cuando su señal se aborta. */
function hangUntilAborted() {
  mockRequest.mockImplementation(
    (config: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        config.signal.addEventListener("abort", () => reject({ code: "ERR_CANCELED", name: "CanceledError" }));
      }),
  );
}

/** Cede el turno a las promesas encadenadas de apiFetch (varios `await` antes de llegar a axios). */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Igual, con timers falsos: vacía microtareas sin mover el reloj. */
async function flush() {
  for (let i = 0; i < 5; i++) await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  setApiBaseUrl(BASE_URL);
  mockRequest.mockReset();
  mockGet.mockReset().mockResolvedValue({ status: 204, data: "", headers: {} });
  document.cookie = "XSRF-TOKEN=token-value-123"; // evita el fetch extra de /sanctum/csrf-cookie
});

afterEach(() => {
  vi.useRealTimers();
});

describe("apiFetch — progreso y fases de una subida", () => {
  it("informa el progreso en bytes y las fases preparing → uploading → processing", async () => {
    const phases: string[] = [];
    const progress: Array<{ loaded: number; total?: number }> = [];
    mockRequest.mockImplementation(async (config: { onUploadProgress: (e: { loaded: number; total: number }) => void }) => {
      config.onUploadProgress({ loaded: 40, total: 100 });
      config.onUploadProgress({ loaded: 100, total: 100 });
      return OK;
    });

    await apiFetch("/projects/1/documents", { method: "POST", body: upload(), onPhase: (p) => phases.push(p), onUploadProgress: (p) => progress.push(p) });

    expect(phases).toEqual(["preparing", "uploading", "processing"]);
    expect(progress).toEqual([{ loaded: 40, total: 100 }, { loaded: 100, total: 100 }]);
  });

  it("una mutación JSON no recibe señal propia ni vigilancia: va como siempre", async () => {
    mockRequest.mockResolvedValue(OK);

    await apiFetch("/projects", { method: "POST", body: JSON.stringify({ a: 1 }) });

    expect(mockRequest.mock.calls[0][0].signal).toBeUndefined();
  });
});

describe("apiFetch — timeout por inactividad", () => {
  it("aborta una subida que deja de avanzar y lo informa como REQUEST_TIMEOUT", async () => {
    vi.useFakeTimers();
    hangUntilAborted();

    const result = apiFetch("/public/closures/tok/photos", { method: "POST", body: upload() }).catch((e: ApiError) => e);
    await flush();
    await vi.advanceTimersByTimeAsync(TRANSFER_INACTIVITY_MS + 1);

    const error = (await result) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe(REQUEST_TIMEOUT);
    expect(isRequestCanceled(error)).toBe(false);
    expect(mockRequest).toHaveBeenCalledTimes(1); // las rutas públicas no se reintentan
  });

  it("cada evento de progreso reinicia el reloj: una subida lenta pero viva no expira", async () => {
    vi.useFakeTimers();
    let emit!: (e: { loaded: number; total: number }) => void;
    let finish!: (value: unknown) => void;
    mockRequest.mockImplementation((config: { onUploadProgress: typeof emit }) => {
      emit = config.onUploadProgress;
      return new Promise((resolve) => { finish = resolve; });
    });

    const result = apiFetch("/public/closures/tok/photos", { method: "POST", body: upload() });
    await flush();
    await vi.advanceTimersByTimeAsync(TRANSFER_INACTIVITY_MS - 1_000);
    emit({ loaded: 10, total: 100 });
    await vi.advanceTimersByTimeAsync(TRANSFER_INACTIVITY_MS - 1_000);
    emit({ loaded: 20, total: 100 });
    await vi.advanceTimersByTimeAsync(TRANSFER_INACTIVITY_MS - 1_000);
    finish(OK);

    await expect(result).resolves.toEqual({ ok: true });
  });

  it("con el cuerpo ya enviado espera más (el servidor procesa) antes de rendirse", async () => {
    vi.useFakeTimers();
    let emit!: (e: { loaded: number; total: number }) => void;
    let finish!: (value: unknown) => void;
    mockRequest.mockImplementation((config: { onUploadProgress: typeof emit }) => {
      emit = config.onUploadProgress;
      return new Promise((resolve) => { finish = resolve; });
    });

    const result = apiFetch("/public/closures/tok/photos", { method: "POST", body: upload() });
    await flush();
    emit({ loaded: 100, total: 100 });
    await vi.advanceTimersByTimeAsync(TRANSFER_INACTIVITY_MS * 2);
    expect(TRANSFER_PROCESSING_MS).toBeGreaterThan(TRANSFER_INACTIVITY_MS * 2);
    finish(OK);

    await expect(result).resolves.toEqual({ ok: true });
  });

  it("en rutas autenticadas reintenta tras el timeout y avisa con onRetry", async () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    hangUntilAborted();

    const result = apiFetch("/projects/1/documents", { method: "POST", body: upload(), onRetry }).catch((e: ApiError) => e);
    await flush();
    await vi.advanceTimersByTimeAsync(10 * TRANSFER_INACTIVITY_MS);

    const error = (await result) as ApiError;
    expect(error.code).toBe(REQUEST_TIMEOUT);
    expect(mockRequest).toHaveBeenCalledTimes(3); // 1 intento + 2 reintentos
    expect(onRetry.mock.calls).toEqual([[1], [2]]);
  });
});

describe("apiFetch — cancelación del usuario", () => {
  it("cancelar rechaza como cancelación (no como error), sin reintentos", async () => {
    hangUntilAborted();
    const controller = new AbortController();

    const result = apiFetch("/projects/1/documents", { method: "POST", body: upload(), signal: controller.signal }).catch((e: ApiError) => e);
    await vi.waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    controller.abort();

    const error = (await result) as ApiError;
    expect(isRequestCanceled(error)).toBe(true);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});

describe("apiFetch — 413", () => {
  it("usa el mensaje con el límite real que manda el backend", async () => {
    mockRequest.mockRejectedValue({ isAxiosError: true, response: { status: 413, data: JSON.stringify({ message: "El servidor admite como máximo 40 MB por envío.", code: "PAYLOAD_TOO_LARGE" }) } });

    const error = (await apiFetch("/projects/1/documents", { method: "POST", body: upload() }).catch((e: ApiError) => e)) as ApiError;

    expect(error.status).toBe(413);
    expect(error.message).toBe("El servidor admite como máximo 40 MB por envío.");
  });

  it("si el 413 lo da el proxy (HTML) cae a un mensaje claro en español", async () => {
    mockRequest.mockRejectedValue({ isAxiosError: true, response: { status: 413, data: "<html>413 Request Entity Too Large</html>" } });

    const error = (await apiFetch("/projects/1/documents", { method: "POST", body: upload() }).catch((e: ApiError) => e)) as ApiError;

    expect(error.status).toBe(413);
    expect(error.message).toContain("pesan demasiado");
  });
});

describe("apiFetch — subida idéntica ya en vuelo", () => {
  it("la segunda llamada no dispara otra petición pero sí recibe el progreso", async () => {
    let emit!: (e: { loaded: number; total: number }) => void;
    let finish!: (value: unknown) => void;
    mockRequest.mockImplementation((config: { onUploadProgress: typeof emit }) => {
      emit = config.onUploadProgress;
      return new Promise((resolve) => { finish = resolve; });
    });
    const secondProgress = vi.fn();

    const first = apiFetch("/projects/1/documents", { method: "POST", body: upload("x") });
    await vi.waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    const second = apiFetch("/projects/1/documents", { method: "POST", body: upload("x"), onUploadProgress: secondProgress });
    await tick();
    emit({ loaded: 50, total: 100 });
    finish(OK);

    await Promise.all([first, second]);
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(secondProgress).toHaveBeenCalledWith({ loaded: 50, total: 100 });
  });

  it("quien se unió puede abandonar con su señal sin cancelar la operación original", async () => {
    let finish!: (value: unknown) => void;
    mockRequest.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const controller = new AbortController();

    const first = apiFetch("/projects/1/documents", { method: "POST", body: upload("y") });
    await vi.waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    const second = apiFetch("/projects/1/documents", { method: "POST", body: upload("y"), signal: controller.signal }).catch((e: ApiError) => e);
    await tick();
    controller.abort();

    expect(isRequestCanceled(await second)).toBe(true);
    finish(OK);
    await expect(first).resolves.toEqual({ ok: true });
  });
});
