/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para ExportButton — CSV (Blob con BOM), Excel (HTML MSO)
 * y PDF (vista imprimible + window.print).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { unzipSync, strFromU8 } from "fflate";
import ExportButton, { PDF_PRINT_ROOT_ID } from "@/components/UI/ExportButton";

const HEADERS = ["id", "title", "status"];
const ROWS = [
  ["P-001", 'Obra "Alpha", fase 1', "CREADO"],
  ["P-002", "Obra Beta", "CONTRATADO"],
  ["P-003", "<script>alert(1)</script>", "VERIFICANDO"],
  ["P-004", "Obra Numérica", 987654.32],
];

// ---------------------------------------------------------------------------
// Helpers — captura el <a> creado y el Blob del download
// ---------------------------------------------------------------------------

interface DownloadCapture {
  anchor: HTMLAnchorElement;
  blob: Blob;
}

function captureDownload() {
  let anchor: HTMLAnchorElement;
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    const el = originalCreateElement(tag);
    if (tag === "a") anchor = el as HTMLAnchorElement;
    return el;
  });
  const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  return {
    getAnchor: () => anchor!,
    getBlob: () => createObjectUrlSpy.mock.calls[0][0] as Blob,
    createObjectUrlSpy,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.getElementById(PDF_PRINT_ROOT_ID)?.remove();
});

// ---------------------------------------------------------------------------
// Helpers — descomprimir el XLSX (fflate) para validar las partes OOXML
// ---------------------------------------------------------------------------

function readZipEntries(bytes: Uint8Array): Map<string, string> {
  const files = unzipSync(bytes);
  return new Map(Object.entries(files).map(([name, data]) => [name, strFromU8(data)]));
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

describe("ExportButton — CSV", () => {
  it("descarga CSV con BOM, headers, filas y nombre correcto", async () => {
    const cap = captureDownload();

    render(
      <ExportButton format="csv" filename="master-obras-2026-07-31" headers={HEADERS} rows={ROWS}>
        Exportar CSV
      </ExportButton>
    );
    fireEvent.click(screen.getByRole("button", { name: "Exportar CSV" }));

    expect(cap.getAnchor().download).toBe("master-obras-2026-07-31.csv");
    expect(cap.getAnchor().href).toBe("blob:mock");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");

    // Blob.text() decodifica y descarta el BOM; verificar los bytes crudos
    const bytes = new Uint8Array(await cap.getBlob().arrayBuffer());
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);

    const text = await cap.getBlob().text();
    expect(text).toContain("id,title,status");
    expect(text).toContain("P-001");
    expect(text).toContain('"Obra ""Alpha"", fase 1"');
  });

  it("no descarga nada si está disabled", () => {
    const cap = captureDownload();

    render(
      <ExportButton format="csv" filename="master" headers={HEADERS} rows={ROWS} disabled>
        Exportar
      </ExportButton>
    );
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    expect(cap.createObjectUrlSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Excel (XLSX real vía write-excel-file)
// ---------------------------------------------------------------------------

describe("ExportButton — Excel", () => {
  it("descarga un XLSX real: ZIP con partes OOXML, sharedStrings y contenido escapado", async () => {
    const cap = captureDownload();

    render(
      <ExportButton format="excel" filename="master" headers={HEADERS} rows={ROWS}>
        Exportar Excel
      </ExportButton>
    );
    fireEvent.click(screen.getByRole("button", { name: "Exportar Excel" }));

    // el handler es async: esperar a que se genere y descargue el blob
    await vi.waitFor(() => expect(cap.createObjectUrlSpy).toHaveBeenCalled());

    expect(cap.getAnchor().download).toBe("master.xlsx");
    expect(cap.getBlob().type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    const bytes = new Uint8Array(await cap.getBlob().arrayBuffer());
    // firma ZIP "PK\x03\x04"
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);

    const entries = readZipEntries(bytes);
    expect(entries.has("[Content_Types].xml")).toBe(true);
    expect(entries.has("xl/workbook.xml")).toBe(true);
    expect(entries.has("xl/sharedStrings.xml")).toBe(true);
    expect(entries.has("xl/worksheets/sheet1.xml")).toBe(true);

    // los strings viven en sharedStrings y deben salir escapados (XSS-safe)
    const shared = entries.get("xl/sharedStrings.xml")!;
    expect(shared).toContain("id");
    expect(shared).toContain("P-001");
    expect(shared).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(shared).not.toContain("<script>");

    // celda numérica real en la hoja
    const sheet = entries.get("xl/worksheets/sheet1.xml")!;
    expect(sheet).toContain("<v>987654.32</v>");

    expect(entries.get("xl/workbook.xml")).toContain('name="Export"');
  });

  it("estiliza el libro: título/subtítulo, header oscuro, merge del total y formato monetario", async () => {
    const cap = captureDownload();

    render(
      <ExportButton
        format="excel"
        filename="diario-egresos"
        headers={["Voucher", "Obra", "Monto"]}
        rows={[["VCH-1", "Obra A", 2500000.5]]}
        title="Diario de Egresos"
        subtitle="Generado hoy"
        columns={[{}, {}, { align: "right", money: true }]}
        footer={{ label: "TOTAL DESEMBOLSADO", value: 2500000.5 }}
      >
        Exportar Excel
      </ExportButton>
    );
    fireEvent.click(screen.getByRole("button", { name: "Exportar Excel" }));
    await vi.waitFor(() => expect(cap.createObjectUrlSpy).toHaveBeenCalled());

    const bytes = new Uint8Array(await cap.getBlob().arrayBuffer());
    const entries = readZipEntries(bytes);

    const shared = entries.get("xl/sharedStrings.xml")!;
    expect(shared).toContain("Diario de Egresos");
    expect(shared).toContain("Generado hoy");
    expect(shared).toContain("TOTAL DESEMBOLSADO");

    // celdas combinadas del título/subtítulo y del label del total
    const sheet = entries.get("xl/worksheets/sheet1.xml")!;
    expect(sheet).toContain("<mergeCells");
    // valor numérico real (sin formatear en XML) en datos y total
    expect(sheet).toContain("<v>2500000.5</v>");

    // formato monetario aplicado vía numFmt
    const styles = entries.get("xl/styles.xml")!;
    expect(styles).toContain("$#,##0.00");
  });
});

// ---------------------------------------------------------------------------
// PDF (vista imprimible)
// ---------------------------------------------------------------------------

describe("ExportButton — PDF", () => {
  it("inyecta vista imprimible, llama window.print y limpia el DOM", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    render(
      <ExportButton format="pdf" filename="master" headers={HEADERS} rows={ROWS} title="Master de Obras" subtitle="Filtro: todos">
        Exportar PDF
      </ExportButton>
    );
    fireEvent.click(screen.getByRole("button", { name: "Exportar PDF" }));

    expect(printSpy).toHaveBeenCalledOnce();

    const root = document.getElementById(PDF_PRINT_ROOT_ID);
    expect(root).not.toBeNull();
    expect(root!.textContent).toContain("Master de Obras");
    expect(root!.textContent).toContain("Filtro: todos");
    expect(root!.textContent).toContain("P-001");
    expect(root!.innerHTML).toContain("@media print");
    expect(root!.innerHTML).toContain("&lt;script&gt;");
    expect(root!.innerHTML).not.toContain("<script>");

    // jsdom no enruta onafterprint como listener real; invocar el handler registrado
    const afterPrintHandler = window.onafterprint;
    expect(afterPrintHandler).not.toBeNull();
    afterPrintHandler?.call(window, new Event("afterprint"));
    expect(document.getElementById(PDF_PRINT_ROOT_ID)).toBeNull();
  });
});
