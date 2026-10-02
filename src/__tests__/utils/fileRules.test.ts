import { describe, it, expect } from "vitest";
import { extensionOf, fileKey, validateFiles } from "@/utils/fileRules";

function makeFile(name: string, size: number, type = "application/pdf", lastModified = 1000): File {
  return new File([new ArrayBuffer(size)], name, { type, lastModified });
}

const MB = 1024 * 1024;

describe("fileRules", () => {
  it("extensionOf devuelve la extensión con punto y en minúsculas", () => {
    expect(extensionOf("Plano.PDF")).toBe(".pdf");
    expect(extensionOf("a.b.jpeg")).toBe(".jpeg");
  });

  it("fileKey distingue por nombre, peso y fecha de modificación", () => {
    expect(fileKey(makeFile("a.pdf", 10, "application/pdf", 1))).not.toBe(fileKey(makeFile("a.pdf", 10, "application/pdf", 2)));
  });

  it("acepta un archivo válido y lo agrega a los existentes", () => {
    const existing = makeFile("a.pdf", 10);
    const incoming = makeFile("b.pdf", 20);

    const { merged, rejected } = validateFiles([incoming], [existing], { accept: ".pdf" });

    expect(merged).toEqual([existing, incoming]);
    expect(rejected).toEqual([]);
  });

  it("rechaza por extensión, vacío, tamaño y MIME con su motivo", () => {
    const { merged, rejected } = validateFiles(
      [makeFile("x.exe", 10), makeFile("v.pdf", 0), makeFile("g.pdf", 3 * MB), makeFile("m.pdf", 10, "image/png")],
      [],
      { accept: ".pdf", maxSizeBytes: 2 * MB },
    );

    expect(merged).toEqual([]);
    expect(rejected.map(r => r.name)).toEqual(["x.exe", "v.pdf", "g.pdf", "m.pdf"]);
    expect(rejected[0].reason).toContain("no permitida");
    expect(rejected[1].reason).toContain("vacío");
    expect(rejected[2].reason).toContain("excede el límite de 2.0 MB");
    expect(rejected[3].reason).toContain("tipo MIME");
  });

  it("detecta duplicados también dentro del mismo lote", () => {
    const { merged, rejected } = validateFiles([makeFile("a.pdf", 10), makeFile("a.pdf", 10)], [], { accept: ".pdf" });

    expect(merged).toHaveLength(1);
    expect(rejected).toEqual([{ name: "a.pdf", reason: "Ya está en la lista." }]);
  });

  it("el mismo nombre con otro peso o fecha no es duplicado", () => {
    const { merged } = validateFiles([makeFile("a.pdf", 11), makeFile("a.pdf", 10, "application/pdf", 2)], [makeFile("a.pdf", 10)], { accept: ".pdf" });

    expect(merged).toHaveLength(3);
  });

  it("la cantidad cuenta existentes y un rechazado no consume cupo", () => {
    const { merged, rejected } = validateFiles(
      [makeFile("mala.png", 10, "image/png"), makeFile("b.pdf", 10), makeFile("c.pdf", 10)],
      [makeFile("a.pdf", 10)],
      { accept: ".pdf", maxFileCount: 2 },
    );

    expect(merged.map(f => f.name)).toEqual(["a.pdf", "b.pdf"]);
    expect(rejected.map(r => r.name)).toEqual(["mala.png", "c.pdf"]);
    expect(rejected[1].reason).toContain("máximo de 2 archivo");
  });

  it("rechaza el archivo que hace superar el peso total por envío", () => {
    const { merged, rejected } = validateFiles(
      [makeFile("a.pdf", 3 * MB), makeFile("b.pdf", 3 * MB), makeFile("c.pdf", 1 * MB)],
      [],
      { accept: ".pdf", maxTotalBytes: 5 * MB },
    );

    expect(merged.map(f => f.name)).toEqual(["a.pdf", "c.pdf"]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toContain("por envío");
  });

  it("un accept vacío acepta cualquier extensión (y sigue validando el resto)", () => {
    const { merged, rejected } = validateFiles([makeFile("a.xyz", 10, ""), makeFile("vacio.xyz", 0, "")], [], { accept: "" });

    expect(merged.map(f => f.name)).toEqual(["a.xyz"]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toContain("vacío");
  });

  it("0 o undefined en los límites significa sin límite", () => {
    const { merged, rejected } = validateFiles([makeFile("a.pdf", 50 * MB)], [], { accept: ".pdf", maxSizeBytes: 0, maxFileCount: 0, maxTotalBytes: 0 });

    expect(merged).toHaveLength(1);
    expect(rejected).toEqual([]);
  });
});
