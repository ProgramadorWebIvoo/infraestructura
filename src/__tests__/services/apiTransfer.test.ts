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

import { apiFetch, apiDownload, setApiBaseUrl, isRequestCanceled, REQUEST_TIMEOUT } from "@/services/api";
import { ApiError, EMPTY_DOWNLOAD, NETWORK_ERROR, TRANSFER_INACTIVITY_MS, TRANSFER_PROCESSING_MS, UNEXPECTED_DOWNLOAD_TYPE } from "@ivoo/shared";
import { useTransferStore } from "@/stores/transferStore";

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

describe("apiFetch — registro en el dock de transferencias", () => {
  beforeEach(() => useTransferStore.setState({ transfers: [] }));

  it("registra la subida con su etiqueta y fase, y la quita al terminar", async () => {
    let emit!: (e: { loaded: number; total: number }) => void;
    let finish!: (value: unknown) => void;
    mockRequest.mockImplementation((config: { onUploadProgress: typeof emit }) => {
      emit = config.onUploadProgress;
      return new Promise((resolve) => { finish = resolve; });
    });

    const result = apiFetch("/projects/1/documents", { method: "POST", body: upload("dock"), transferLabel: "Enviando plano" });
    await vi.waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    emit({ loaded: 30, total: 100 });

    expect(useTransferStore.getState().transfers).toMatchObject([{ label: "Enviando plano", phase: "uploading", loaded: 30, total: 100 }]);

    emit({ loaded: 100, total: 100 });
    expect(useTransferStore.getState().transfers[0].phase).toBe("processing");

    finish(OK);
    await result;
    expect(useTransferStore.getState().transfers).toEqual([]);
  });

  it("usa la etiqueta por defecto y limpia el dock también si la subida falla", async () => {
    let during = "";
    mockRequest.mockImplementation(async () => {
      during = useTransferStore.getState().transfers[0]?.label ?? "";
      throw { isAxiosError: true, response: { status: 422, data: JSON.stringify({ message: "Inválido" }) } };
    });

    await apiFetch("/projects/1/documents", { method: "POST", body: upload("falla") }).catch(() => undefined);

    expect(during).toBe("Subiendo archivos");
    expect(useTransferStore.getState().transfers).toEqual([]);
  });

  it("cancelar desde el dock aborta la subida como cancelación", async () => {
    hangUntilAborted();

    const result = apiFetch("/projects/1/documents", { method: "POST", body: upload("cancelable") }).catch((e: unknown) => e);
    await vi.waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    useTransferStore.getState().transfers[0].cancel();

    expect(isRequestCanceled(await result)).toBe(true);
    expect(useTransferStore.getState().transfers).toEqual([]);
  });
});

describe("apiDownload — robustez", () => {
  const pdf = () => new Blob([new ArrayBuffer(10)], { type: "application/pdf" });
  const httpError = (status: number, body = "") => ({ isAxiosError: true, response: { status, data: new Blob([body]) } });

  beforeEach(() => useTransferStore.setState({ transfers: [] }));

  it("devuelve el blob cuando es un archivo real", async () => {
    mockRequest.mockResolvedValue({ status: 200, data: pdf(), headers: {} });

    await expect(apiDownload("/f.pdf")).resolves.toBeInstanceOf(Blob);
  });

  it("rechaza un archivo vacío en vez de guardar un 'plano.pdf' de 0 bytes", async () => {
    mockRequest.mockResolvedValue({ status: 200, data: new Blob([]), headers: {} });

    const error = (await apiDownload("/f.pdf").catch((e: ApiError) => e)) as ApiError;

    expect(error.code).toBe(EMPTY_DOWNLOAD);
    expect(error.message).toContain("vacío");
  });

  it("rechaza HTML (la pantalla de login con 200 por sesión vencida) o JSON de error", async () => {
    mockRequest.mockResolvedValueOnce({ status: 200, data: new Blob(["<html>login</html>"], { type: "text/html" }), headers: {} });
    mockRequest.mockResolvedValueOnce({ status: 200, data: new Blob(['{"message":"x"}'], { type: "application/json" }), headers: {} });

    const html = (await apiDownload("/f.pdf").catch((e: ApiError) => e)) as ApiError;
    const json = (await apiDownload("/f.pdf").catch((e: ApiError) => e)) as ApiError;

    expect(html.code).toBe(UNEXPECTED_DOWNLOAD_TYPE);
    expect(html.message).toContain("la sesión venció");
    expect(json.code).toBe(UNEXPECTED_DOWNLOAD_TYPE);
  });

  it("traduce el estado HTTP a un mensaje claro cuando el backend no manda uno", async () => {
    const messageFor = async (status: number, body = "") => {
      mockRequest.mockRejectedValueOnce(httpError(status, body));
      return ((await apiDownload("/f.pdf").catch((e: ApiError) => e)) as ApiError).message;
    };

    expect(await messageFor(401)).toContain("Sesión expirada");
    expect(await messageFor(419)).toContain("sesión de seguridad venció");
    expect(await messageFor(403)).toContain("No tienes permiso");
    expect(await messageFor(404)).toBe("El archivo no fue encontrado.");
    expect(await messageFor(413)).toContain("demasiado grande");
  });

  it("prefiere el mensaje del backend (p. ej. 'El archivo ya no existe en el servidor.')", async () => {
    mockRequest.mockRejectedValue(httpError(404, JSON.stringify({ message: "El archivo ya no existe en el servidor." })));

    const error = (await apiDownload("/f.pdf").catch((e: ApiError) => e)) as ApiError;

    expect(error.message).toBe("El archivo ya no existe en el servidor.");
    expect(error.status).toBe(404);
  });

  it("sin conexión: mensaje claro (tras reintentar) en vez del error técnico de axios", async () => {
    vi.useFakeTimers();
    mockRequest.mockRejectedValue({ isAxiosError: true, message: "Network Error" });

    const result = apiDownload("/f.pdf").catch((e: ApiError) => e);
    await vi.advanceTimersByTimeAsync(10_000);
    const error = (await result) as ApiError;

    expect(error.code).toBe(NETWORK_ERROR);
    expect(error.message).toContain("conexión a internet");
    expect(mockRequest).toHaveBeenCalledTimes(3); // 1 intento + 2 reintentos (GET idempotente)
  });

  it("un 404 definitivo no se reintenta", async () => {
    mockRequest.mockRejectedValue(httpError(404));

    await apiDownload("/f.pdf").catch(() => undefined);

    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("informa el progreso de recepción y, con transferLabel, aparece en el dock como descarga", async () => {
    let emit!: (e: { loaded: number; total: number }) => void;
    let finish!: (value: unknown) => void;
    mockRequest.mockImplementation((config: { onDownloadProgress: typeof emit }) => {
      emit = config.onDownloadProgress;
      return new Promise((resolve) => { finish = resolve; });
    });
    const progress: Array<{ loaded: number; total?: number }> = [];

    const result = apiDownload("/f.pdf", { transferLabel: "Descargando «plano.pdf»", onDownloadProgress: (p) => progress.push(p) });
    await vi.waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    emit({ loaded: 2000, total: 8000 });

    expect(progress).toEqual([{ loaded: 2000, total: 8000 }]);
    expect(useTransferStore.getState().transfers).toMatchObject([{ kind: "download", phase: "downloading", label: "Descargando «plano.pdf»", loaded: 2000, total: 8000 }]);

    finish({ status: 200, data: pdf(), headers: {} });
    await result;
    expect(useTransferStore.getState().transfers).toEqual([]);
  });

  it("sin transferLabel no toca el dock (vistas previas e imágenes no hacen ruido)", async () => {
    let finish!: (value: unknown) => void;
    mockRequest.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));

    const result = apiDownload("/preview.png");
    await vi.waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    expect(useTransferStore.getState().transfers).toEqual([]);

    finish({ status: 200, data: pdf(), headers: {} });
    await result;
  });

  it("cancelar una descarga rechaza como cancelación, sin reintentos ni mensaje de red", async () => {
    hangUntilAborted();
    const controller = new AbortController();

    const result = apiDownload("/f.pdf", { signal: controller.signal }).catch((e: unknown) => e);
    await vi.waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    controller.abort();

    expect(isRequestCanceled(await result)).toBe(true);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("una descarga que no avanza expira (espera inicial de 5 min, luego 60 s sin bytes)", async () => {
    vi.useFakeTimers();
    hangUntilAborted();

    const result = apiDownload("/f.pdf").catch((e: ApiError) => e);
    await flush();
    await vi.advanceTimersByTimeAsync(TRANSFER_PROCESSING_MS - 1_000);
    expect(mockRequest).toHaveBeenCalledTimes(1); // aún espera: el servidor puede estar armando el archivo
    await vi.advanceTimersByTimeAsync(30 * TRANSFER_PROCESSING_MS);

    expect(((await result) as ApiError).code).toBe(REQUEST_TIMEOUT);
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
