/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para useRequestWizard — navegación por pasos del wizard,
 * gateada por la validación de cada paso (delegada en useRequestForm).
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRequestForm } from "@/hooks/useRequestForm";
import { useRequestWizard } from "@/hooks/useRequestWizard";

function setup() {
  const onAddProject = vi.fn().mockResolvedValue({ ok: true, partial: false, failedGroups: [] });
  return renderHook(() => {
    const form = useRequestForm({ onAddProject });
    const wizard = useRequestWizard({ form });
    return { form, wizard };
  });
}

describe("useRequestWizard", () => {
  it("no avanza del paso 1 sin validar (título/ubicación/descripción vacíos)", () => {
    const { result } = setup();

    act(() => result.current.wizard.goNext());

    expect(result.current.wizard.currentIndex).toBe(0);
    expect(result.current.wizard.stepErrors.title).toBeTruthy();
  });

  it("avanza del paso 1 al 2 cuando los datos son válidos", () => {
    const { result } = setup();

    act(() => {
      result.current.form.setTitle("Reparación");
      result.current.form.setLocation("CD Central");
      result.current.form.setDescription("Descripción");
    });
    act(() => result.current.wizard.goNext());

    expect(result.current.wizard.currentIndex).toBe(1);
    expect(result.current.wizard.furthestVisitedIndex).toBe(1);
  });

  it("no avanza del paso 2 al 3 sin al menos un material", () => {
    const { result } = setup();

    act(() => {
      result.current.form.setTitle("Reparación");
      result.current.form.setLocation("CD Central");
      result.current.form.setDescription("Descripción");
    });
    act(() => result.current.wizard.goNext());
    act(() => result.current.wizard.goNext());

    expect(result.current.wizard.currentIndex).toBe(1);
    expect(result.current.wizard.stepErrors.materials).toBeTruthy();
  });

  it("el paso más lejano visitado no retrocede al ir hacia atrás", () => {
    const { result } = setup();

    act(() => {
      result.current.form.setTitle("Reparación");
      result.current.form.setLocation("CD Central");
      result.current.form.setDescription("Descripción");
    });
    act(() => result.current.wizard.goNext());
    act(() => result.current.wizard.goBack());

    expect(result.current.wizard.currentIndex).toBe(0);
    expect(result.current.wizard.furthestVisitedIndex).toBe(1);
  });

  it("goToStep solo navega a pasos ya visitados", () => {
    const { result } = setup();

    act(() => result.current.wizard.goToStep(2));
    expect(result.current.wizard.currentIndex).toBe(0);
  });

  it("el submit final sigue exigiendo materiales (validación completa de useRequestForm)", async () => {
    const { result } = setup();

    act(() => {
      result.current.form.setTitle("Reparación");
      result.current.form.setLocation("CD Central");
      result.current.form.setDescription("Descripción");
    });

    await act(async () => {
      await result.current.form.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(result.current.form.fieldErrors.materials).toBeTruthy();
  });
});
