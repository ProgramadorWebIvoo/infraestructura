/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Botón de exportación reutilizable:
 * - csv   → Blob UTF-8 con BOM (compatibilidad Excel con acentos)
 * - excel → XLSX real vía write-excel-file (lazy-loaded, sin CVEs)
 * - pdf   → vista imprimible inyectada y window.print()
 */

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { formatCurrency } from "../../utils";

export type ExportFormat = "csv" | "excel" | "pdf";
export type ExportRow = (string | number | null | undefined)[];

/** Opciones de presentación por columna (paralelas a `headers`). */
export interface ExportColumn {
  /** Ancho de columna en Excel (default 18). */
  width?: number;
  /** Código de formato numérico de Excel, ej. "$#,##0.00". */
  format?: string;
  /** Alineación en Excel y PDF (default "left"). */
  align?: "left" | "center" | "right";
  /** Formato monetario: PDF muestra "$" con 2 decimales; Excel aplica "$#,##0.00". */
  money?: boolean;
}

/** Fila de total que se agrega al final del export (Excel y PDF). */
export interface ExportFooter {
  label: string;
  value: number;
}

export const PDF_PRINT_ROOT_ID = "export-print-root";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

interface ExportButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  format: ExportFormat;
  /** Nombre base del archivo, sin extensión. La extensión la agrega el componente. */
  filename: string;
  headers: string[];
  rows: ExportRow[];
  /** Encabezado del documento (PDF) y primera fila del libro (Excel). */
  title?: string;
  /** Línea secundaria: fecha, filtros activos, etc. (PDF/Excel). */
  subtitle?: string;
  /** Estilos por columna (Excel y PDF). */
  columns?: ExportColumn[];
  /** Fila de total al final del documento (Excel y PDF). */
  footer?: ExportFooter;
  icon?: ReactNode;
}

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// Escapado válido tanto para HTML como para texto/atributos XML.
function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildCsv(headers: string[], rows: ExportRow[]): string {
  const lines = rows.map((row) => row.map(escapeCsv).join(","));
  return `\uFEFF${[headers.map(escapeCsv).join(","), ...lines].join("\n")}`;
}

type WriteCell = {
  value: string | number;
  fontWeight?: "bold";
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderStyle?: "thin" | "medium" | "double" | "thick";
  align?: "left" | "center" | "right";
  columnSpan?: number;
  height?: number;
  format?: string;
};

type WriteRow = (WriteCell | null)[];

const MONEY_FORMAT = "$#,##0.00";
const BORDER_COLOR = "#cbd5e1";
const HEADER_BG = "#1e293b";
const HEADER_TEXT = "#ffffff";
const ZEBRA_BG = "#f8fafc";
const FOOTER_BG = "#f1f5f9";

function moneyFormat(n: number): string {
  return formatCurrency(n);
}

function pdfCellText(cell: unknown, col?: ExportColumn): string {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "number") {
    return col?.money ? moneyFormat(cell) : cell.toLocaleString("en-US");
  }
  return String(cell);
}

function columnFormat(col?: ExportColumn): string | undefined {
  if (col?.format) return col.format;
  if (col?.money) return MONEY_FORMAT;
  return undefined;
}

async function buildXlsx(
  headers: string[],
  rows: ExportRow[],
  opts: { title?: string; subtitle?: string; columns?: ExportColumn[]; footer?: ExportFooter }
): Promise<Blob> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const { title, subtitle, columns = [], footer } = opts;
  const colCount = headers.length;

  const data: WriteRow[] = [];

  if (title) {
    data.push([{ value: title, fontWeight: "bold", fontSize: 16, textColor: "#0f172a", columnSpan: colCount, height: 28 }]);
  }
  if (subtitle) {
    data.push([{ value: subtitle, fontSize: 10, textColor: "#64748b", columnSpan: colCount, height: 18 }]);
  }
  if (title || subtitle) {
    data.push([]);
  }

  data.push(
    headers.map((h, i): WriteCell => ({
      value: h,
      fontWeight: "bold",
      textColor: HEADER_TEXT,
      backgroundColor: HEADER_BG,
      align: columns[i]?.align === "right" ? "right" : "center",
      borderColor: BORDER_COLOR,
      borderStyle: "thin",
      height: 22,
    }))
  );

  rows.forEach((row, ri) => {
    data.push(
      row.map((cell, ci): WriteCell | null => {
        if (cell === null || cell === undefined) return null;
        return {
          value: cell,
          ...(typeof cell === "number" ? { format: columnFormat(columns[ci]) } : {}),
          align: columns[ci]?.align,
          backgroundColor: ri % 2 === 1 ? ZEBRA_BG : undefined,
          borderColor: BORDER_COLOR,
          borderStyle: "thin",
          height: 20,
        };
      })
    );
  });

  if (footer) {
    const footerRow: WriteRow = [
      {
        value: footer.label,
        fontWeight: "bold",
        textColor: "#0f172a",
        backgroundColor: FOOTER_BG,
        columnSpan: Math.max(colCount - 1, 1),
        height: 22,
        borderColor: BORDER_COLOR,
        borderStyle: "thin",
      },
      // celdas solapadas por el columnSpan del label: deben ir como null
      ...Array(Math.max(colCount - 2, 0)).fill(null),
    ];
    if (colCount > 1) {
      footerRow.push({
        value: footer.value,
        fontWeight: "bold",
        textColor: "#0f172a",
        backgroundColor: FOOTER_BG,
        align: "right",
        format: columnFormat(columns[colCount - 1]),
        height: 22,
        borderColor: BORDER_COLOR,
        borderStyle: "thin",
      });
    }
    data.push(footerRow);
  }

  return writeXlsxFile(data, {
    sheet: "Export",
    columns: headers.map((_, i) => ({ width: columns[i]?.width ?? 18 })),
  }).toBlob();
}

function downloadBlob(content: BlobPart, mime: string, downloadName: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = downloadName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function printPdf(opts: { title?: string; subtitle?: string; headers: string[]; rows: ExportRow[]; columns?: ExportColumn[]; footer?: ExportFooter }): void {
  document.getElementById(PDF_PRINT_ROOT_ID)?.remove();

  const { title, subtitle, headers, rows, columns = [], footer } = opts;

  const root = document.createElement("div");
  root.id = PDF_PRINT_ROOT_ID;

  const heading = title ? `<h1>${escapeXml(title)}</h1>` : "";
  const sub = subtitle ? `<p class="doc-subtitle">${escapeXml(subtitle)}</p>` : "";

  const thead = `<tr>${headers
    .map((h, i) => `<th class="${columns[i]?.align === "right" ? "num" : ""}">${escapeXml(h)}</th>`)
    .join("")}</tr>`;
  const tbody = rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell, ci) => `<td class="${columns[ci]?.align === "right" ? "num" : ""}${columns[ci]?.money ? " money" : ""}">${escapeXml(pdfCellText(cell, columns[ci]))}</td>`)
          .join("")}</tr>`
    )
    .join("");
  const tfoot = footer
    ? `<tr><td class="total-label" colspan="${headers.length - 1}">${escapeXml(footer.label)}</td><td class="total-value">${escapeXml(moneyFormat(footer.value))}</td></tr>`
    : "";

  root.innerHTML = `
    <style>
      #${PDF_PRINT_ROOT_ID} { display: none; }
      @media print {
        body > *:not(#${PDF_PRINT_ROOT_ID}) { display: none !important; }
        #${PDF_PRINT_ROOT_ID} {
          display: block !important;
          font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
          color: #0f172a;
          padding: 20px;
        }
        #${PDF_PRINT_ROOT_ID} .doc-header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px; }
        #${PDF_PRINT_ROOT_ID} h1 { font-size: 17px; margin: 0 0 2px; letter-spacing: -0.01em; }
        #${PDF_PRINT_ROOT_ID} .doc-subtitle { font-size: 11px; color: #475569; margin: 0; }
        #${PDF_PRINT_ROOT_ID} table { width: 100%; border-collapse: collapse; font-size: 10px; }
        #${PDF_PRINT_ROOT_ID} thead th {
          background: ${HEADER_BG};
          color: ${HEADER_TEXT};
          text-align: left;
          padding: 6px 8px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          border: 1px solid ${HEADER_BG};
        }
        #${PDF_PRINT_ROOT_ID} tbody td { border: 1px solid ${BORDER_COLOR}; padding: 5px 8px; }
        #${PDF_PRINT_ROOT_ID} tbody tr:nth-child(even) { background: ${ZEBRA_BG}; }
        #${PDF_PRINT_ROOT_ID} .num { text-align: right; font-variant-numeric: tabular-nums; }
        #${PDF_PRINT_ROOT_ID} .money { font-weight: 600; }
        #${PDF_PRINT_ROOT_ID} tfoot td {
          font-weight: bold;
          background: ${FOOTER_BG};
          border-top: 2px solid #0f172a;
          padding: 6px 8px;
        }
        #${PDF_PRINT_ROOT_ID} .total-value { text-align: right; font-variant-numeric: tabular-nums; }
      }
    </style>
    <div class="doc-header">
      ${heading}
      ${sub}
    </div>
    <table>
      <thead>${thead}</thead>
      <tbody>${tbody}</tbody>
      ${tfoot ? `<tfoot>${tfoot}</tfoot>` : ""}
    </table>
  `;
  document.body.appendChild(root);

  window.print();

  const cleanup = () => {
    window.onafterprint = null;
    root.remove();
  };
  window.onafterprint = cleanup;
  window.setTimeout(cleanup, 60_000);
}

export default function ExportButton({
  format,
  filename,
  headers,
  rows,
  title,
  subtitle,
  columns,
  footer,
  icon,
  children,
  disabled,
  className = "",
  ...rest
}: ExportButtonProps) {
  const handleClick = async () => {
    if (format === "excel") {
      const blob = await buildXlsx(headers, rows, { title, subtitle, columns, footer });
      downloadBlob(blob, XLSX_MIME, `${filename}.xlsx`);
      return;
    }
    if (format === "pdf") {
      printPdf({ title, subtitle, headers, rows, columns, footer });
      return;
    }
    downloadBlob(buildCsv(headers, rows), "text/csv;charset=utf-8", `${filename}.csv`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-xl font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${className}`}
      {...rest}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {children}
    </button>
  );
}
