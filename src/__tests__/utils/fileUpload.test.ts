import { describe, it, expect, vi, afterEach } from "vitest";
import { inspectFile, normalizeFileName, optimizeImageFile, prepareFileForUpload, prepareFormDataFiles } from "@/utils/fileUpload";

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0];

function makeFile(bytes: number[] | string, name: string, type = ""): File {
  const part = typeof bytes === "string" ? bytes : new Uint8Array(bytes);
  return new File([part], name, { type });
}

describe("fileUpload", () => {
  afterEach(() => vi.unstubAllGlobals());

  describe("normalizeFileName", () => {
    it("pasa la extensión a minúsculas canónicas", () => {
      expect(normalizeFileName("FOTO.JPEG")).toBe("FOTO.jpg");
      expect(normalizeFileName("plano.TIF")).toBe("plano.tiff");
    });

    it("quita rutas, caracteres de control y overrides bidireccionales", () => {
      expect(normalizeFileName("C:\\fakepath\\informe.pdf")).toBe("informe.pdf");
      expect(normalizeFileName("factura\u202Efdp.exe")).toBe("facturafdp.exe");
      expect(normalizeFileName("a\u0000b.pdf")).toBe("ab.pdf");
    });

    it("normaliza Unicode a NFC y colapsa espacios", () => {
      expect(normalizeFileName("Cubicacio\u0301n   final.xlsx")).toBe("Cubicación final.xlsx");
    });

    it("conserva un nombre sin extensión y rellena uno vacío", () => {
      expect(normalizeFileName("LEEME")).toBe("LEEME");
      expect(normalizeFileName("")).toBe("archivo");
    });
  });

  describe("inspectFile", () => {
    it("acepta una imagen cuya firma coincide con su extensión", async () => {
      expect(await inspectFile(makeFile([...PNG_HEADER, 0, 0], "a.png", "image/png"))).toBeNull();
    });

    it("rechaza un ejecutable disfrazado", async () => {
      expect(await inspectFile(makeFile([0x4d, 0x5a, 0x90, 0x00], "a.jpg"))).toMatch(/ejecutable/);
    });

    it("rechaza contenido que no corresponde a la extensión", async () => {
      expect(await inspectFile(makeFile([...PNG_HEADER], "a.jpg"))).toMatch(/no coincide/);
    });

    it("rechaza código embebido en una imagen", async () => {
      const payload = "<" + "?php echo 1; ?>";
      expect(await inspectFile(makeFile([...JPEG_HEADER, ...Array.from(payload).map(c => c.charCodeAt(0))], "a.jpg"))).toMatch(/código embebido/);
    });

    it("rechaza un PDF con acciones activas y acepta uno limpio", async () => {
      expect(await inspectFile(makeFile("%PDF-1.4\n/OpenAction << /S /JavaScript >>", "a.pdf"))).toMatch(/código embebido/);
      expect(await inspectFile(makeFile("%PDF-1.4\n%%EOF", "a.pdf"))).toBeNull();
    });
  });

  describe("optimizeImageFile", () => {
    it("devuelve el original si el navegador no soporta createImageBitmap", async () => {
      vi.stubGlobal("createImageBitmap", undefined);
      const file = makeFile([...JPEG_HEADER], "a.jpg", "image/jpeg");
      expect(await optimizeImageFile(file)).toBe(file);
    });

    it("no toca tipos que no son JPEG/PNG/WEBP", async () => {
      const file = makeFile("%PDF-1.4", "a.pdf", "application/pdf");
      expect(await optimizeImageFile(file)).toBe(file);
    });

    it("conserva el original si recomprimir no mejora el peso", async () => {
      const close = vi.fn();
      vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 100, height: 100, close }));
      const file = new File([new Uint8Array(300 * 1024)], "a.jpg", { type: "image/jpeg" });
      const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }), toBlob: (cb: (b: Blob | null) => void) => cb(new Blob([new Uint8Array(299 * 1024)])) };
      vi.spyOn(document, "createElement").mockReturnValueOnce(canvas as unknown as HTMLElement);
      expect(await optimizeImageFile(file)).toBe(file);
    });

    it("usa la versión recomprimida cuando baja el peso", async () => {
      vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 100, height: 100, close: vi.fn() }));
      const file = new File([new Uint8Array(300 * 1024)], "a.jpg", { type: "image/jpeg" });
      const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }), toBlob: (cb: (b: Blob | null) => void) => cb(new Blob([new Uint8Array(100 * 1024)])) };
      vi.spyOn(document, "createElement").mockReturnValueOnce(canvas as unknown as HTMLElement);
      const result = await optimizeImageFile(file);
      expect(result).not.toBe(file);
      expect(result.size).toBe(100 * 1024);
      expect(result.name).toBe("a.jpg");
      expect(result.type).toBe("image/jpeg");
    });
  });

  describe("prepareFileForUpload / prepareFormDataFiles", () => {
    it("normaliza el nombre del archivo", async () => {
      const prepared = await prepareFileForUpload(makeFile([...PNG_HEADER, 1], "FOTO.PNG", "image/png"));
      expect(prepared.name).toBe("FOTO.png");
    });

    it("lanza con un mensaje para el usuario si el archivo se rechaza", async () => {
      await expect(prepareFileForUpload(makeFile([0x7f, 0x45, 0x4c, 0x46], "a.pdf"))).rejects.toThrow(/ejecutable/);
    });

    it("conserva campos y orden, y prepara cada archivo del FormData", async () => {
      const form = new FormData();
      form.append("document_type", "PLANO");
      form.append("files[]", makeFile([...PNG_HEADER, 1], "uno.PNG", "image/png"));
      form.append("files[]", makeFile("%PDF-1.4\n%%EOF", "dos.pdf", "application/pdf"));

      const prepared = await prepareFormDataFiles(form);
      const entries = Array.from(prepared.entries());

      expect(entries.map(([key]) => key)).toEqual(["document_type", "files[]", "files[]"]);
      expect(entries[0][1]).toBe("PLANO");
      expect((entries[1][1] as File).name).toBe("uno.png");
      expect((entries[2][1] as File).name).toBe("dos.pdf");
    });

    it("rechaza todo el FormData si uno de sus archivos es inválido", async () => {
      const form = new FormData();
      form.append("files[]", makeFile([0x4d, 0x5a, 0x00], "malo.png"));
      await expect(prepareFormDataFiles(form)).rejects.toThrow(/ejecutable/);
    });
  });
});
