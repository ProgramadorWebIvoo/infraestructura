import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import PhotoDropzone from "@/views/CierrePublico/components/PhotoDropzone";

// Sin red: los límites del servidor no llegan, así que se usan los ajustes de la app por defecto.
vi.mock("@/stores/uploadLimitsStore", () => ({
  useUploadLimitsStore: (selector: (state: unknown) => unknown) => selector({ limits: null, load: () => Promise.resolve() }),
}));
vi.mock("@/services/api", () => ({ getApiBaseUrl: () => "http://api.test" }));

const MB = 1024 * 1024;
const photo = (name: string, size: number, type: string) => new File([new ArrayBuffer(size)], name, { type });

describe("PhotoDropzone — validación previa", () => {
  const onFiles = vi.fn();
  const onFileRejected = vi.fn();

  beforeEach(() => {
    onFiles.mockClear();
    onFileRejected.mockClear();
  });

  function setup() {
    const { container } = render(<PhotoDropzone photos={[]} editable isUploading={false} onFiles={onFiles} onFileRejected={onFileRejected} onDelete={vi.fn()} />);
    return container.querySelector("#closure-photo-input") as HTMLInputElement;
  }

  it("entrega solo las fotos válidas y avisa cada rechazo con su motivo", () => {
    const input = setup();
    const ok = photo("ok.jpg", 1000, "image/jpeg");

    fireEvent.change(input, {
      target: { files: [ok, photo("gif.gif", 10, "image/gif"), photo("grande.png", 6 * MB, "image/png"), photo("vacia.png", 0, "image/png")] },
    });

    expect(onFiles).toHaveBeenCalledWith([ok]);
    expect(onFileRejected).toHaveBeenCalledTimes(3);
    expect(onFileRejected).toHaveBeenCalledWith("gif.gif", expect.stringContaining("no permitida"));
    expect(onFileRejected).toHaveBeenCalledWith("grande.png", expect.stringContaining("excede el límite de 5.0 MB"));
    expect(onFileRejected).toHaveBeenCalledWith("vacia.png", expect.stringContaining("vacío"));
  });

  it("no llama a onFiles si ninguna foto es válida", () => {
    const input = setup();

    fireEvent.change(input, { target: { files: [photo("doc.pdf", 10, "application/pdf")] } });

    expect(onFiles).not.toHaveBeenCalled();
    expect(onFileRejected).toHaveBeenCalledTimes(1);
  });
});
