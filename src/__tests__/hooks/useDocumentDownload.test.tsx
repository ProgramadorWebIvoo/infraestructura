import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

const showToast = vi.fn();
vi.mock("@/components/UI/Toast", () => ({ useToast: () => ({ showToast }) }));

const downloadProjectDocument = vi.fn();
vi.mock("@/services/api", () => ({ downloadProjectDocument: (...args: unknown[]) => downloadProjectDocument(...args) }));

import { useDocumentDownload, useProjectDocumentDownload } from "@/hooks/useDocumentDownload";

/** Tarea que queda pendiente hasta que el test la resuelva/rechace. */
function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe("useDocumentDownload", () => {
  beforeEach(() => {
    showToast.mockReset();
    downloadProjectDocument.mockReset();
  });

  it("ignora el doble clic: la misma descarga en curso no se repite", async () => {
    const task = deferred();
    const fn = vi.fn(() => task.promise);
    const { result } = renderHook(() => useDocumentDownload());

    let first!: Promise<void>;
    act(() => {
      first = result.current.run("doc-1", fn);
      void result.current.run("doc-1", fn);
    });
    expect(fn).toHaveBeenCalledTimes(1);

    await act(async () => { task.resolve(); await first; });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("marca ocupada la descarga mientras corre y la libera al terminar", async () => {
    const task = deferred();
    const { result } = renderHook(() => useDocumentDownload());

    let promise!: Promise<void>;
    act(() => { promise = result.current.run("doc-1", () => task.promise); });
    expect(result.current.isBusy("doc-1")).toBe(true);
    expect(result.current.isBusy("doc-2")).toBe(false);

    await act(async () => { task.resolve(); await promise; });
    expect(result.current.isBusy("doc-1")).toBe(false);
  });

  it("descargas de documentos distintos corren en paralelo", () => {
    const fn = vi.fn(() => new Promise<void>(() => {}));
    const { result } = renderHook(() => useDocumentDownload());

    act(() => {
      void result.current.run("a", fn);
      void result.current.run("b", fn);
    });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(result.current.isBusy("a")).toBe(true);
    expect(result.current.isBusy("b")).toBe(true);
  });

  it("un fallo muestra UN toast de error con el mensaje real y libera la clave para reintentar", async () => {
    const { result } = renderHook(() => useDocumentDownload());

    await act(async () => { await result.current.run("doc-1", () => Promise.reject(new Error("El archivo ya no existe en el servidor."))); });

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith("El archivo ya no existe en el servidor.", "error");
    expect(result.current.isBusy("doc-1")).toBe(false);

    const retry = vi.fn().mockResolvedValue(undefined);
    await act(async () => { await result.current.run("doc-1", retry); });
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("usa el mensaje de respaldo si el error no trae uno legible", async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const { result } = renderHook(() => useDocumentDownload());

    await act(async () => { await result.current.run("doc-1", () => Promise.reject(circular), "No se pudo descargar el comprobante."); });

    expect(showToast).toHaveBeenCalledWith("No se pudo descargar el comprobante.", "error");
  });

  it("cancelar desde el dock avisa con un toast informativo, no de error", async () => {
    const { result } = renderHook(() => useDocumentDownload());

    await act(async () => { await result.current.run("doc-1", () => Promise.reject(new DOMException("cancelado", "AbortError"))); });

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith("Descarga cancelada.", "info");
  });
});

describe("useProjectDocumentDownload", () => {
  beforeEach(() => {
    showToast.mockReset();
    downloadProjectDocument.mockReset();
  });

  it("descarga con proyecto, documento y token, y marca ocupado solo ese documento", async () => {
    const task = deferred();
    downloadProjectDocument.mockReturnValue(task.promise);
    const { result } = renderHook(() => useProjectDocumentDownload("tok"));

    let promise!: Promise<void>;
    act(() => { promise = result.current.download("PRJ-1", { id: 7, originalName: "plano.pdf" }); });

    expect(downloadProjectDocument).toHaveBeenCalledWith("PRJ-1", { id: 7, originalName: "plano.pdf" }, "tok");
    expect(result.current.isDownloading("PRJ-1", 7)).toBe(true);
    expect(result.current.isDownloading("PRJ-1", 8)).toBe(false);
    expect(result.current.isDownloading("PRJ-2", 7)).toBe(false);

    await act(async () => { task.resolve(); await promise; });
    expect(result.current.isDownloading("PRJ-1", 7)).toBe(false);
  });
});
