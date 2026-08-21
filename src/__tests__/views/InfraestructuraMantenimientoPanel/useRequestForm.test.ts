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
