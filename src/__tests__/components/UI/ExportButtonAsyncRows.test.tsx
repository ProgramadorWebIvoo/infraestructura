/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ExportButton con `rows` como función asíncrona (listados paginados server-side,
 * ej. Histórico de Obras): resuelve al hacer clic, avisa si falla y evita doble descarga.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ExportButton from "@/components/UI/ExportButton";
import { useToastStore } from "@/stores/toastStore";

const HEADERS = ["id", "title"];

function captureDownload() {
  const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  return { createObjectUrlSpy, getBlob: () => createObjectUrlSpy.mock.calls[0][0] as Blob };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ExportButton — rows asíncronas", () => {
  it("resuelve las filas al hacer clic y las exporta", async () => {
    const cap = captureDownload();
    const rows = vi.fn().mockResolvedValue([["P-9", "Obra nueva"]]);

    render(<ExportButton format="csv" filename="x" headers={HEADERS} rows={rows}>Exportar</ExportButton>);
    expect(rows).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    await waitFor(() => expect(cap.createObjectUrlSpy).toHaveBeenCalledTimes(1));
    expect(rows).toHaveBeenCalledTimes(1);
    expect(await cap.getBlob().text()).toContain("P-9,Obra nueva");
  });

  it("si la función falla, avisa con un toast y no descarga nada", async () => {
    const cap = captureDownload();
    const showToast = vi.fn();
    vi.spyOn(useToastStore, "getState").mockReturnValue({ showToast } as never);
    const rows = vi.fn().mockRejectedValue(new Error("boom"));

    render(<ExportButton format="csv" filename="x" headers={HEADERS} rows={rows}>Exportar</ExportButton>);
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/exportación/i), "error"));
    expect(cap.createObjectUrlSpy).not.toHaveBeenCalled();
  });

  it("ignora clics repetidos mientras la exportación está en curso", async () => {
    const cap = captureDownload();
    let release!: (rows: (string | number)[][]) => void;
    const rows = vi.fn(() => new Promise<(string | number)[][]>((resolve) => { release = resolve; }));

    render(<ExportButton format="csv" filename="x" headers={HEADERS} rows={rows}>Exportar</ExportButton>);
    const button = screen.getByRole("button", { name: "Exportar" });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(rows).toHaveBeenCalledTimes(1);
    release([["P-1", "A"]]);
    await waitFor(() => expect(cap.createObjectUrlSpy).toHaveBeenCalledTimes(1));
  });

  it("permite volver a exportar después de un fallo", async () => {
    captureDownload();
    vi.spyOn(useToastStore, "getState").mockReturnValue({ showToast: vi.fn() } as never);
    const rows = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce([["P-1", "A"]]);

    render(<ExportButton format="csv" filename="x" headers={HEADERS} rows={rows}>Exportar</ExportButton>);
    const button = screen.getByRole("button", { name: "Exportar" });

    fireEvent.click(button);
    await waitFor(() => expect(rows).toHaveBeenCalledTimes(1));
    fireEvent.click(button);
    await waitFor(() => expect(rows).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
  });
});
