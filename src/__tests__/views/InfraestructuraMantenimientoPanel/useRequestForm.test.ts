import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useRequestForm,
  validateRequestForm,
  validateDatosStep,
  validateMaterialesStep,
  validateAdjuntosStep,
} from "@/hooks/useRequestForm";

describe("validateDatosStep", () => {
  it("reporta error por cada campo vacío del paso 1", () => {
    const errors = validateDatosStep({ title: "", location: "", description: "" });
    expect(errors.title).toBeTruthy();
    expect(errors.location).toBeTruthy();
    expect(errors.description).toBeTruthy();
    expect(errors.materials).toBeFalsy();
  });

  it("sin errores cuando título/ubicación/descripción son válidos", () => {
    const errors = validateDatosStep({ title: "Reparación", location: "CD Central", description: "Descripción" });
    expect(Object.values(errors).every((v) => !v)).toBe(true);
  });
});

describe("validateMaterialesStep", () => {
  it("exige al menos un material", () => {
    const errors = validateMaterialesStep({ addedMaterials: [] });
    expect(errors.materials).toBeTruthy();
  });

  it("sin error cuando hay al menos un material", () => {
    const errors = validateMaterialesStep({
      addedMaterials: [{ name: "Cemento", quantity: 1, unit: "Saco", estimatedUnitPrice: 10, condition: "NUEVO" as const }],
    });
    expect(errors.materials).toBeFalsy();
  });
});

describe("validateAdjuntosStep", () => {
  it("exige al menos un archivo entre los 3 grupos", () => {
    const errors = validateAdjuntosStep({ photoFiles: [], documentFiles: [], planFiles: [] });
    expect(errors.attachments).toBeTruthy();
  });

  it("sin error si hay al menos un archivo en cualquier grupo", () => {
    const file = new File(["x"], "foto.png");
    expect(validateAdjuntosStep({ photoFiles: [file], documentFiles: [], planFiles: [] }).attachments).toBeFalsy();
    expect(validateAdjuntosStep({ photoFiles: [], documentFiles: [file], planFiles: [] }).attachments).toBeFalsy();
    expect(validateAdjuntosStep({ photoFiles: [], documentFiles: [], planFiles: [file] }).attachments).toBeFalsy();
  });
});

describe("validateRequestForm", () => {
  it("reporta error por cada campo vacío, incluyendo adjuntos", () => {
    const errors = validateRequestForm({
      title: "", location: "", description: "", addedMaterials: [],
      photoFiles: [], documentFiles: [], planFiles: [],
    });
    expect(errors.title).toBeTruthy();
    expect(errors.location).toBeTruthy();
    expect(errors.description).toBeTruthy();
    expect(errors.materials).toBeTruthy();
    expect(errors.attachments).toBeTruthy();
  });

  it("sin errores cuando todos los campos son válidos", () => {
    const errors = validateRequestForm({
      title: "Reparación",
      location: "CD Central",
      description: "Descripción",
      addedMaterials: [{ name: "Cemento", quantity: 1, unit: "Saco", estimatedUnitPrice: 10, condition: "NUEVO" as const }],
      photoFiles: [new File(["x"], "foto.png")],
      documentFiles: [],
      planFiles: [],
    });
    expect(Object.values(errors).every((v) => !v)).toBe(true);
  });
});

describe("useRequestForm", () => {
  it("setTitle limpia el error de title al escribir", () => {
    const { result } = renderHook(() => useRequestForm({ onAddProject: vi.fn() }));

    act(() => {
      result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    expect(result.current.fieldErrors.title).toBeTruthy();

    act(() => {
      result.current.setTitle("Nueva obra");
    });
    expect(result.current.fieldErrors.title).toBeFalsy();
  });

  it("handleSubmit arma el payload correcto y limpia el estado tras éxito", async () => {
    const onAddProject = vi.fn().mockResolvedValue({ ok: true, partial: false, failedGroups: [] });
    const { result } = renderHook(() => useRequestForm({ onAddProject }));
    const photo = new File(["x"], "foto.png");

    act(() => {
      result.current.setTitle("Reparación");
      result.current.setLocation("CD Central");
      result.current.setDescription("Descripción");
      result.current.setAddedMaterials([{ name: "Cemento", quantity: 2, unit: "Saco", estimatedUnitPrice: 10, condition: "NUEVO" as const }]);
      result.current.setPhotoFiles([photo]);
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(onAddProject).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Reparación", location: "CD Central", estimatedTotal: 20 }),
      { photos: [photo], documents: [], plans: [] },
    );
    expect(result.current.title).toBe("");
    expect(result.current.addedMaterials).toEqual([]);
  });

  it("no envía si falta adjuntar al menos un archivo", async () => {
    const onAddProject = vi.fn().mockResolvedValue({ ok: true, partial: false, failedGroups: [] });
    const { result } = renderHook(() => useRequestForm({ onAddProject }));

    act(() => {
      result.current.setTitle("Reparación");
      result.current.setLocation("CD Central");
      result.current.setDescription("Descripción");
      result.current.setAddedMaterials([{ name: "Cemento", quantity: 1, unit: "Saco", estimatedUnitPrice: 10, condition: "NUEVO" as const }]);
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(onAddProject).not.toHaveBeenCalled();
    expect(result.current.fieldErrors.attachments).toBeTruthy();
  });

  it("no limpia el estado si el submit falla (ok: false)", async () => {
    const onAddProject = vi.fn().mockResolvedValue({ ok: false, partial: false, failedGroups: [] });
    const { result } = renderHook(() => useRequestForm({ onAddProject }));

    act(() => {
      result.current.setTitle("Reparación");
      result.current.setLocation("CD Central");
      result.current.setDescription("Descripción");
      result.current.setAddedMaterials([{ name: "Cemento", quantity: 1, unit: "Saco", estimatedUnitPrice: 10, condition: "NUEVO" as const }]);
      result.current.setPhotoFiles([new File(["x"], "foto.png")]);
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(result.current.title).toBe("Reparación");
  });

  it("markMaterialReviewed agrega el índice a reviewedMaterialIndexes", () => {
    const { result } = renderHook(() => useRequestForm({ onAddProject: vi.fn() }));

    act(() => {
      result.current.setAddedMaterials([{ name: "Cemento", quantity: 1, unit: "Saco", estimatedUnitPrice: 10, condition: "NUEVO" as const }]);
    });
    expect(result.current.reviewedMaterialIndexes.has(0)).toBe(false);

    act(() => {
      result.current.markMaterialReviewed(0);
    });
    expect(result.current.reviewedMaterialIndexes.has(0)).toBe(true);
  });

  it("quitar un material resetea reviewedMaterialIndexes (los índices dejan de ser estables)", () => {
    const { result } = renderHook(() => useRequestForm({ onAddProject: vi.fn() }));

    act(() => {
      result.current.setAddedMaterials([
        { name: "Cemento", quantity: 1, unit: "Saco", estimatedUnitPrice: 10, condition: "NUEVO" as const },
        { name: "Acero", quantity: 1, unit: "Cabilla", estimatedUnitPrice: 18, condition: "NUEVO" as const },
      ]);
      result.current.markMaterialReviewed(0);
      result.current.markMaterialReviewed(1);
    });
    expect(result.current.reviewedMaterialIndexes.size).toBe(2);

    act(() => {
      result.current.setAddedMaterials([{ name: "Acero", quantity: 1, unit: "Cabilla", estimatedUnitPrice: 18, condition: "NUEVO" as const }]);
    });
    expect(result.current.reviewedMaterialIndexes.size).toBe(0);
  });

  it("handleSubmit exitoso resetea reviewedMaterialIndexes junto con addedMaterials", async () => {
    const onAddProject = vi.fn().mockResolvedValue({ ok: true, partial: false, failedGroups: [] });
    const { result } = renderHook(() => useRequestForm({ onAddProject }));

    act(() => {
      result.current.setTitle("Reparación");
      result.current.setLocation("CD Central");
      result.current.setDescription("Descripción");
      result.current.setAddedMaterials([{ name: "Cemento", quantity: 1, unit: "Saco", estimatedUnitPrice: 10, condition: "NUEVO" as const }]);
      result.current.markMaterialReviewed(0);
      result.current.setPhotoFiles([new File(["x"], "foto.png")]);
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(result.current.reviewedMaterialIndexes.size).toBe(0);
  });
});

describe("useRequestForm — versionReplacements (modo edición)", () => {
  const existingProject = {
    id: "PRJ-010",
    title: "Obra",
    type: "INFRAESTRUCTURA" as const,
    description: "desc",
    location: "loc",
    materials: [],
    documents: [
      { id: 1, documentType: "PLANO" as const, originalName: "plano1.pdf", documentGroupId: 1, versionNumber: 1 },
      { id: 2, documentType: "FOTO" as const, originalName: "foto1.png", documentGroupId: 2, versionNumber: 1 },
    ],
  };

  it("pendingReplacementFor devuelve undefined hasta que se setea un reemplazo", () => {
    const { result } = renderHook(() =>
      useRequestForm({ onAddProject: vi.fn(), existingProject, onResubmitProject: vi.fn() }),
    );

    expect(result.current.pendingReplacementFor(1)).toBeUndefined();
  });

  it("setVersionReplacement asocia el archivo al documentId, recuperable vía pendingReplacementFor", () => {
    const { result } = renderHook(() =>
      useRequestForm({ onAddProject: vi.fn(), existingProject, onResubmitProject: vi.fn() }),
    );
    const file = new File(["v2"], "plano1-v2.pdf");

    act(() => {
      result.current.setVersionReplacement(1, file);
    });

    expect(result.current.pendingReplacementFor(1)).toBe(file);
  });

  it("clearVersionReplacement quita el archivo asociado", () => {
    const { result } = renderHook(() =>
      useRequestForm({ onAddProject: vi.fn(), existingProject, onResubmitProject: vi.fn() }),
    );
    const file = new File(["v2"], "plano1-v2.pdf");

    act(() => {
      result.current.setVersionReplacement(1, file);
    });
    expect(result.current.pendingReplacementFor(1)).toBe(file);

    act(() => {
      result.current.clearVersionReplacement(1);
    });
    expect(result.current.pendingReplacementFor(1)).toBeUndefined();
  });

  it("handleSubmit arma versionReplacements con documentType inferido del documento original y lo pasa a onResubmitProject", async () => {
    const onResubmitProject = vi.fn().mockResolvedValue({ ok: true, partial: false, failedGroups: [] });
    const { result } = renderHook(() =>
      useRequestForm({ onAddProject: vi.fn(), existingProject, onResubmitProject }),
    );
    const planoFile = new File(["v2"], "plano1-v2.pdf");
    const fotoFile = new File(["v2"], "foto1-v2.png");

    act(() => {
      result.current.setTitle("Obra corregida");
      result.current.setLocation("loc");
      result.current.setDescription("desc");
      result.current.setAddedMaterials([{ name: "Cemento", quantity: 1, unit: "Saco", estimatedUnitPrice: 10, condition: "NUEVO" as const }]);
      result.current.setVersionReplacement(1, planoFile);
      result.current.setVersionReplacement(2, fotoFile);
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(onResubmitProject).toHaveBeenCalledWith(
      "PRJ-010",
      expect.objectContaining({ title: "Obra corregida" }),
      { photos: [], documents: [], plans: [] },
      existingProject.documents,
      expect.arrayContaining([
        { documentId: 1, documentType: "PLANO", file: planoFile },
        { documentId: 2, documentType: "FOTO", file: fotoFile },
      ]),
    );
  });

  it("handleSubmit exitoso resetea versionReplacements", async () => {
    const onResubmitProject = vi.fn().mockResolvedValue({ ok: true, partial: false, failedGroups: [] });
    const { result } = renderHook(() =>
      useRequestForm({ onAddProject: vi.fn(), existingProject, onResubmitProject }),
    );

    act(() => {
      result.current.setTitle("Obra corregida");
      result.current.setLocation("loc");
      result.current.setDescription("desc");
      result.current.setAddedMaterials([{ name: "Cemento", quantity: 1, unit: "Saco", estimatedUnitPrice: 10, condition: "NUEVO" as const }]);
      result.current.setVersionReplacement(1, new File(["v2"], "plano1-v2.pdf"));
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(result.current.pendingReplacementFor(1)).toBeUndefined();
  });

  it("un reemplazo apuntando a un documentId que ya no existe (ej. eliminado) se descarta silenciosamente del payload", async () => {
    const onResubmitProject = vi.fn().mockResolvedValue({ ok: true, partial: false, failedGroups: [] });
    const { result } = renderHook(() =>
      useRequestForm({ onAddProject: vi.fn(), existingProject, onResubmitProject }),
    );

    act(() => {
      result.current.setTitle("Obra corregida");
      result.current.setLocation("loc");
      result.current.setDescription("desc");
      result.current.setAddedMaterials([{ name: "Cemento", quantity: 1, unit: "Saco", estimatedUnitPrice: 10, condition: "NUEVO" as const }]);
      result.current.setVersionReplacement(999, new File(["v2"], "huerfano.pdf"));
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    const call = onResubmitProject.mock.calls[0];
    expect(call[4]).toEqual([]);
  });
});
