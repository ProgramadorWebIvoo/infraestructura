import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { REVOKE_DELAY_MS, saveBlob } from "@/utils/saveBlob";
import { sanitizeFileName } from "@/utils/fileUpload";

describe("saveBlob", () => {
  let created: HTMLAnchorElement[];

  beforeEach(() => {
    vi.useFakeTimers();
    created = [];
    URL.createObjectURL = vi.fn(() => "blob:fake-url");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      created.push(this);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("dispara la descarga con el nombre indicado y deja el DOM limpio", () => {
    saveBlob(new Blob(["x"]), "plano.pdf");

    expect(created).toHaveLength(1);
    expect(created[0].href).toBe("blob:fake-url");
    expect(created[0].download).toBe("plano.pdf");
    expect(document.body.querySelector("a[download]")).toBeNull();
  });

  it("NO revoca la URL en el mismo instante del click: algunos navegadores cancelarían la descarga", () => {
    saveBlob(new Blob(["x"]), "plano.pdf");

    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(REVOKE_DELAY_MS - 1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });

  it("sanea el nombre: sin rutas ni caracteres de control, conserva la extensión", () => {
    saveBlob(new Blob(["x"]), "..\\..\\carpeta/FOTO.JPEG");

    expect(created[0].download).toBe("FOTO.JPEG");
  });

  it("un nombre vacío cae a 'archivo'", () => {
    expect(sanitizeFileName("   ")).toBe("archivo");
  });
});
