/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Previsualizador genérico de un ProjectDocument: PDF vía pdfjs-dist (canvas,
 * zoom, paginación), imágenes vía <img>, y un mensaje de "no disponible"
 * para cualquier otro formato (DWG/DXF y similares no tienen soporte de
 * renderizado en navegador sin un conversor server-side, fuera de alcance).
 */

import { useEffect, useRef, useState } from "react";
import { Download, Eye, Minus, Plus, ZoomIn } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import Spinner from "./Spinner";
import { apiDownload } from "../../services/api";
import { useToast } from "./Toast";
import type { ProjectDocument } from "../../types";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  document: ProjectDocument | null;
  authToken: string;
  onDownload: (doc: ProjectDocument) => void;
}

type PreviewKind = "pdf" | "image" | "csv" | "unsupported";

function kindFor(doc: ProjectDocument): PreviewKind {
  const mime = doc.mimeType ?? "";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime === "text/csv") return "csv";
  // finfo a veces detecta DWG/DXF (o CSV como text/plain) como tipos
  // genéricos — usar la extensión como fallback antes de rendirse.
  const ext = doc.originalName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext && ["png", "jpg", "jpeg", "webp", "svg", "tiff", "tif"].includes(ext)) return "image";
  if (ext === "csv") return "csv";
  return "unsupported";
}

/** Parser CSV mínimo: coma como separador, comillas dobles con escape ""
 * dentro de campo — cubre el caso común sin traer una librería para esto. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function CsvViewer({ blobUrl }: { blobUrl: string }) {
  const [rows, setRows] = useState<string[][] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(blobUrl);
        const text = await res.text();
        if (!cancelled) setRows(parseCsv(text));
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blobUrl]);

  if (error) {
    return <p className="text-xs text-danger-600 font-semibold text-center py-8">No se pudo leer el archivo CSV.</p>;
  }
  if (!rows) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
        <Spinner size="lg" />
        <span className="text-xs font-semibold">Leyendo CSV...</span>
      </div>
    );
  }
  if (rows.length === 0) {
    return <p className="text-xs text-slate-400 font-semibold text-center py-8">El archivo está vacío.</p>;
  }

  const [header, ...body] = rows;

  return (
    <div className="max-h-[60vh] overflow-auto border border-slate-200 rounded-xl">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 bg-slate-50">
          <tr className="text-slate-500 font-bold border-b border-slate-200">
            {header.map((cell, i) => (
              <th key={i} className="py-2 px-3 text-left whitespace-nowrap">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {body.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
              {r.map((cell, j) => (
                <td key={j} className="py-2 px-3 whitespace-nowrap text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PdfViewer({ blobUrl }: { blobUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState(false);
  const docRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        const { default: pdfWorker } = await import("pdfjs-dist/build/pdf.worker.mjs?url");
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

        const doc = await pdfjsLib.getDocument({ url: blobUrl }).promise;
        if (cancelled) return;
        docRef.current = doc;
        setNumPages(doc.numPages);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      docRef.current = null;
    };
  }, [blobUrl]);

  useEffect(() => {
    if (!docRef.current || !canvasRef.current) return;
    let cancelled = false;

    (async () => {
      const doc = docRef.current;
      if (!doc) return;
      const pdfPage = await doc.getPage(page);
      if (cancelled) return;
      const viewport = pdfPage.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await pdfPage.render({ canvasContext: context, viewport, canvas }).promise;
    })();

    return () => {
      cancelled = true;
    };
  }, [page, scale, numPages]);

  if (error) {
    return <p className="text-xs text-danger-600 font-semibold text-center py-8">No se pudo renderizar el PDF.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setScale((s) => Math.max(0.5, s - 0.25))} icon={<Minus className="h-3.5 w-3.5" />}>
          Alejar
        </Button>
        <span className="text-[11px] font-bold text-slate-500 font-mono">{Math.round(scale * 100)}%</span>
        <Button variant="secondary" size="sm" onClick={() => setScale((s) => Math.min(3, s + 0.25))} icon={<Plus className="h-3.5 w-3.5" />}>
          Acercar
        </Button>
        {numPages > 1 && (
          <>
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span className="text-[11px] font-bold text-slate-500 font-mono">
              {page} / {numPages}
            </span>
            <Button variant="secondary" size="sm" disabled={page >= numPages} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </Button>
          </>
        )}
      </div>
      <div className="max-h-[60vh] overflow-auto border border-slate-200 rounded-xl bg-slate-50 p-2">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  projectId,
  document: doc,
  authToken,
  onDownload,
}: DocumentPreviewModalProps) {
  const { showToast } = useToast();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!isOpen || !doc) return;

    let cancelled = false;
    let objectUrl: string | null = null;
    setIsLoading(true);
    setLoadError(false);

    (async () => {
      try {
        const blob = await apiDownload(`/projects/${projectId}/documents/${doc.id}/preview`, { token: authToken });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setLoadError(true);
          showToast("No se pudo cargar la vista previa.", "error");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setBlobUrl(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, doc?.id, projectId, authToken]);

  if (!doc) return null;
  const kind = kindFor(doc);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={doc.originalName}
      infoLine={doc.versionNumber > 1 ? `Versión ${doc.versionNumber}` : undefined}
      icon={<Eye className="h-5 w-5" />}
      iconColor="sky"
      maxWidth="max-w-3xl"
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => onDownload(doc)} icon={<Download className="h-3.5 w-3.5" />}>
            Descargar
          </Button>
        </div>
      }
    >
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
          <Spinner size="lg" />
          <span className="text-xs font-semibold">Cargando vista previa...</span>
        </div>
      )}

      {!isLoading && !loadError && blobUrl && kind === "pdf" && <PdfViewer blobUrl={blobUrl} />}

      {!isLoading && !loadError && blobUrl && kind === "image" && (
        <img src={blobUrl} alt={doc.originalName} className="max-w-full max-h-[65vh] object-contain mx-auto rounded-lg" />
      )}

      {!isLoading && !loadError && blobUrl && kind === "csv" && <CsvViewer blobUrl={blobUrl} />}

      {!isLoading && kind === "unsupported" && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <ZoomIn className="h-8 w-8 text-slate-300" />
          <p className="text-xs font-semibold text-slate-500">
            Vista previa no disponible para este formato. Descargar archivo.
          </p>
        </div>
      )}
    </Modal>
  );
}
