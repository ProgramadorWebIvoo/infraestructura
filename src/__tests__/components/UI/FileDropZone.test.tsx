/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para FileDropZone — validación, reject, duplicados, drag & drop.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FileDropZone from "@/components/UI/FileDropZone";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createFile(name: string, size: number, type: string, ext?: string): File {
  const fileName = ext ? `${name}${ext}` : name;
  return new File([new ArrayBuffer(size)], fileName, { type });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FileDropZone", () => {
  const onFilesChange = vi.fn();
  const onFileRejected = vi.fn();

  beforeEach(() => {
    onFilesChange.mockClear();
    onFileRejected.mockClear();
  });

  // -----------------------------------------------------------------------
  // Renderizado básico
  // -----------------------------------------------------------------------

  it("renderiza label y extensiones", () => {
    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Planos"
        accept=".pdf,.dwg"
        extensionsLabel="PDF, DWG"
      />
    );

    expect(screen.getByText("Planos")).toBeInTheDocument();
    expect(screen.getByText("PDF, DWG")).toBeInTheDocument();
    expect(screen.getByText(/arrastra o haz clic/i)).toBeInTheDocument();
  });

  it("muestra asterisco rojo si required=true", () => {
    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Planos"
        accept=".pdf"
        extensionsLabel="PDF"
        required
      />
    );

    expect(screen.getByText("*")).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Input file oculto
  // -----------------------------------------------------------------------

  it("tiene input file oculto con accept y multiple", () => {
    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf,.jpg"
        extensionsLabel="PDF, JPG"
      />
    );

    const input = screen.getByTestId("file-input");
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("multiple");
    expect(input).toHaveAttribute("accept", ".pdf,.jpg");
    expect(input).toHaveClass("hidden");
  });

  it("usa id personalizado en input", () => {
    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
        id="custom-input"
      />
    );

    expect(screen.getByTestId("file-input")).toHaveAttribute("id", "custom-input");
  });

  // -----------------------------------------------------------------------
  // File list
  // -----------------------------------------------------------------------

  it("muestra lista de archivos cuando hay", () => {
    const files = [
      createFile("doc1", 1000, "application/pdf", ".pdf"),
      createFile("doc2", 2000, "image/png", ".png"),
    ];

    render(
      <FileDropZone
        files={files}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf,.png"
        extensionsLabel="PDF, PNG"
      />
    );

    expect(screen.getByText("doc1.pdf")).toBeInTheDocument();
    expect(screen.getByText("doc2.png")).toBeInTheDocument();
  });

  it("muestra tamaño formateado de archivos", () => {
    const files = [createFile("doc", 1024, "application/pdf", ".pdf")];

    render(
      <FileDropZone
        files={files}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
      />
    );

    // 1024 bytes = 1 KB
    expect(screen.getByText(/1\.?\d* KB/)).toBeInTheDocument();
  });

  it("elimina archivo al click en botón X", () => {
    const files = [createFile("doc1", 100, "application/pdf", ".pdf")];

    render(
      <FileDropZone
        files={files}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
      />
    );

    const removeButtons = screen.getAllByRole("button");
    fireEvent.click(removeButtons[0]);

    expect(onFilesChange).toHaveBeenCalledWith([]);
  });

  // -----------------------------------------------------------------------
  // Contador
  // -----------------------------------------------------------------------

  it("muestra contador con countLabel", () => {
    const files = [createFile("doc1", 100, "application/pdf", ".pdf")];

    render(
      <FileDropZone
        files={files}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
        countLabel="archivo adjunto"
      />
    );

    expect(screen.getByText("1 archivo adjunto")).toBeInTheDocument();
  });

  it("pluraliza countLabel cuando hay múltiples archivos", () => {
    const files = [
      createFile("doc1", 100, "application/pdf", ".pdf"),
      createFile("doc2", 200, "application/pdf", ".pdf"),
    ];

    render(
      <FileDropZone
        files={files}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
        countLabel="archivo adjunto"
      />
    );

    expect(screen.getByText("2 archivo adjuntos")).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Validación de extensión
  // -----------------------------------------------------------------------

  it("rechaza archivos con extensión no permitida", () => {
    const pdfFile = createFile("doc", 100, "application/pdf", ".pdf");

    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".dwg,.dxf"
        extensionsLabel="DWG, DXF"
        onFileRejected={onFileRejected}
      />
    );

    const input = screen.getByTestId("file-input");
    fireEvent.change(input, { target: { files: [pdfFile] } });

    expect(onFileRejected).toHaveBeenCalledWith(
      "doc.pdf",
      expect.stringContaining('Extensión ".pdf" no permitida')
    );
    // onFilesChange se llama pero con el mismo array (sin archivos agregados)
    expect(onFilesChange).toHaveBeenCalledWith([]);
  });

  it("acepta archivos con extensión permitida", () => {
    const pdfFile = createFile("doc", 100, "application/pdf", ".pdf");

    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
      />
    );

    const input = screen.getByTestId("file-input");
    fireEvent.change(input, { target: { files: [pdfFile] } });

    expect(onFilesChange).toHaveBeenCalledWith([pdfFile]);
  });

  // -----------------------------------------------------------------------
  // Validación de tamaño máximo
  // -----------------------------------------------------------------------

  it("rechaza archivos que exceden maxSizeBytes", () => {
    const bigFile = createFile("big", 5 * 1024 * 1024, "application/pdf", ".pdf"); // 5MB
    const limit = 1024 * 1024; // 1MB

    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
        maxSizeBytes={limit}
        onFileRejected={onFileRejected}
      />
    );

    const input = screen.getByTestId("file-input");
    fireEvent.change(input, { target: { files: [bigFile] } });

    expect(onFileRejected).toHaveBeenCalledWith(
      "big.pdf",
      expect.stringContaining("excede el límite")
    );
    // onFilesChange se llama pero con el mismo array (sin archivos agregados)
    expect(onFilesChange).toHaveBeenCalledWith([]);
  });

  it("permite archivos dentro del límite de tamaño", () => {
    const smallFile = createFile("small", 500, "application/pdf", ".pdf"); // 500 bytes
    const limit = 1024 * 1024; // 1MB

    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
        maxSizeBytes={limit}
      />
    );

    const input = screen.getByTestId("file-input");
    fireEvent.change(input, { target: { files: [smallFile] } });

    expect(onFilesChange).toHaveBeenCalledWith([smallFile]);
  });

  it("no valida tamaño si maxSizeBytes=0", () => {
    const hugeFile = createFile("huge", 100 * 1024 * 1024, "application/pdf", ".pdf"); // 100MB

    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
        maxSizeBytes={0}
      />
    );

    const input = screen.getByTestId("file-input");
    fireEvent.change(input, { target: { files: [hugeFile] } });

    expect(onFilesChange).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Validación de cantidad máxima
  // -----------------------------------------------------------------------

  it("rechaza archivos que exceden maxFileCount (contando los ya existentes)", () => {
    const existing = [createFile("existing", 100, "application/pdf", ".pdf")];
    const newFile = createFile("new", 100, "application/pdf", ".pdf");

    render(
      <FileDropZone
        files={existing}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
        maxFileCount={1}
        onFileRejected={onFileRejected}
      />
    );

    const input = screen.getByTestId("file-input");
    fireEvent.change(input, { target: { files: [newFile] } });

    expect(onFileRejected).toHaveBeenCalledWith(
      "new.pdf",
      expect.stringContaining("máximo de 1 archivo"),
    );
    // No se agrega — se llama con el mismo array de existentes.
    expect(onFilesChange).toHaveBeenCalledWith(existing);
  });

  it("acepta hasta llegar exactamente a maxFileCount, rechaza el resto del mismo drop", () => {
    const fileA = createFile("a", 100, "application/pdf", ".pdf");
    const fileB = createFile("b", 100, "application/pdf", ".pdf");
    const fileC = createFile("c", 100, "application/pdf", ".pdf");

    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
        maxFileCount={2}
        onFileRejected={onFileRejected}
      />
    );

    const input = screen.getByTestId("file-input");
    fireEvent.change(input, { target: { files: [fileA, fileB, fileC] } });

    expect(onFilesChange).toHaveBeenCalledWith([fileA, fileB]);
    expect(onFileRejected).toHaveBeenCalledWith("c.pdf", expect.stringContaining("máximo de 2 archivo"));
  });

  it("no valida cantidad si maxFileCount no se pasa (undefined)", () => {
    const files = Array.from({ length: 5 }, (_, i) => createFile(`doc${i}`, 100, "application/pdf", ".pdf"));

    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
      />
    );

    const input = screen.getByTestId("file-input");
    fireEvent.change(input, { target: { files } });

    expect(onFilesChange).toHaveBeenCalledWith(files);
    expect(onFileRejected).not.toHaveBeenCalled();
  });

  it("una extensión inválida no cuenta contra el cupo de maxFileCount", () => {
    const validFile = createFile("valid", 100, "application/pdf", ".pdf");
    const invalidFile = createFile("invalid", 100, "image/png", ".png");

    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
        maxFileCount={1}
        onFileRejected={onFileRejected}
      />
    );

    const input = screen.getByTestId("file-input");
    fireEvent.change(input, { target: { files: [invalidFile, validFile] } });

    // El .png se rechaza por extensión (no por cupo), dejando espacio real
    // para que el .pdf entre dentro del límite de 1.
    expect(onFileRejected).toHaveBeenCalledWith("invalid.png", expect.stringContaining("Extensión"));
    expect(onFilesChange).toHaveBeenCalledWith([validFile]);
  });

  // -----------------------------------------------------------------------
  // Duplicados — onFilesChange siempre se llama; verificar que no se agregue
  // -----------------------------------------------------------------------

  it("NO agrega archivos duplicados (mismo nombre + tamaño)", () => {
    const file = createFile("doc", 100, "application/pdf", ".pdf");

    render(
      <FileDropZone
        files={[file]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
      />
    );

    const input = screen.getByTestId("file-input");
    fireEvent.change(input, { target: { files: [file] } });

    // Se llama con el mismo array (ningún archivo nuevo agregado)
    expect(onFilesChange).toHaveBeenCalledWith([file]);
  });

  it("agrega archivos con mismo nombre pero diferente tamaño", () => {
    const fileV1 = createFile("doc", 100, "application/pdf", ".pdf");
    const fileV2 = createFile("doc", 200, "application/pdf", ".pdf");

    render(
      <FileDropZone
        files={[fileV1]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
      />
    );

    const input = screen.getByTestId("file-input");
    fireEvent.change(input, { target: { files: [fileV2] } });

    expect(onFilesChange).toHaveBeenCalledWith([fileV1, fileV2]);
  });

  // -----------------------------------------------------------------------
  // Drag & Drop
  // -----------------------------------------------------------------------

  it("cambia estilo visual al arrastrar sobre la zona", () => {
    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
      />
    );

    const dropZone = screen.getByText(/arrastra o haz clic/i).closest("div")!;

    fireEvent.dragOver(dropZone);
    expect(dropZone).toHaveClass("bg-sky-50");

    fireEvent.dragLeave(dropZone);
    expect(dropZone).not.toHaveClass("bg-sky-50");
  });

  it("procesa archivos soltados con drag & drop", () => {
    const pdfFile = createFile("dropped", 100, "application/pdf", ".pdf");

    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
      />
    );

    const dropZone = screen.getByText(/arrastra o haz clic/i).closest("div")!;

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [pdfFile] },
    });

    expect(onFilesChange).toHaveBeenCalledWith([pdfFile]);
  });

  // -----------------------------------------------------------------------
  // MIME type validation
  // -----------------------------------------------------------------------

  it("rechaza archivos con MIME type que no coincide con la extensión", () => {
    // Archivo .pdf pero con MIME type de imagen
    const fakePdf = createFile("fake", 100, "image/png", ".pdf");

    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
        onFileRejected={onFileRejected}
      />
    );

    const input = screen.getByTestId("file-input");
    fireEvent.change(input, { target: { files: [fakePdf] } });

    expect(onFileRejected).toHaveBeenCalledWith(
      "fake.pdf",
      expect.stringContaining("tipo MIME")
    );
    // onFilesChange se llama pero con el mismo array (sin archivos agregados)
    expect(onFilesChange).toHaveBeenCalledWith([]);
  });

  it("salta validación MIME si el archivo no tiene type", () => {
    const noTypeFile = createFile("notype", 100, "", ".pdf");

    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
      />
    );

    const input = screen.getByTestId("file-input");
    fireEvent.change(input, { target: { files: [noTypeFile] } });

    // Si no hay type, no valida MIME
    expect(onFilesChange).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Color themes — el div principal siempre usa border-slate-200 + theme hover
  // -----------------------------------------------------------------------

  it("aplica color theme sky por defecto (clase hover)", () => {
    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
      />
    );

    const dropZone = screen.getByText(/arrastra o haz clic/i).closest("div")!;
    // No dragging → border-slate-200 bg-slate-50 hover:border-sky-400 hover:bg-sky-50/30
    expect(dropZone).toHaveClass("border-slate-200");
    expect(dropZone).toHaveClass("hover:border-sky-400");
  });

  it("aplica color theme indigo (clase hover)", () => {
    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Docs"
        accept=".pdf"
        extensionsLabel="PDF"
        color="indigo"
      />
    );

    const dropZone = screen.getByText(/arrastra o haz clic/i).closest("div")!;
    // No dragging → border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/30
    expect(dropZone).toHaveClass("border-slate-200");
    expect(dropZone).toHaveClass("hover:border-indigo-400");
  });

  // -----------------------------------------------------------------------
  // compact
  // -----------------------------------------------------------------------

  it("compact=true reemplaza el recuadro grande por un botón chico, sin perder la lista de archivos", () => {
    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Planos"
        accept=".pdf"
        extensionsLabel="PDF"
        compact
      />
    );

    expect(screen.queryByText(/arrastra o haz clic/i)).not.toBeInTheDocument();
    expect(screen.getByText("+ Cargar archivo")).toBeInTheDocument();
  });

  it("compact=true sigue validando y agregando archivos vía el input oculto", () => {
    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Planos"
        accept=".pdf"
        extensionsLabel="PDF"
        compact
      />
    );

    const file = createFile("plano", 1000, "application/pdf", ".pdf");
    const input = screen.getByTestId("file-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFilesChange).toHaveBeenCalledWith([file]);
  });

  it("compact=false (default) muestra el recuadro grande de arrastrar", () => {
    render(
      <FileDropZone
        files={[]}
        onFilesChange={onFilesChange}
        label="Planos"
        accept=".pdf"
        extensionsLabel="PDF"
      />
    );

    expect(screen.getByText(/arrastra o haz clic/i)).toBeInTheDocument();
    expect(screen.queryByText("+ Cargar archivo")).not.toBeInTheDocument();
  });
});
