/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas de AIConfigFormModal — campos, reset de modelo al cambiar provider,
 * toggle de visibilidad de API key y acciones.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AIConfigFormModal from "@/components/Modals/AIConfigFormModal";
import { EMPTY_CONFIG_FORM, type AiConfigForm } from "@/hooks/useAIConfig";

describe("AIConfigFormModal", () => {
  const onClose = vi.fn();
  const onSave = vi.fn();
  const onFormChange = vi.fn();
  const onShowApiKeyChange = vi.fn();

  const AVAILABLE = ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-4.1", "claude-sonnet-5", "gemini-3.6-flash"];

  function renderModal(overrides: Partial<Parameters<typeof AIConfigFormModal>[0]> = {}) {
    return render(
      <AIConfigFormModal
        isOpen
        mode="create"
        editingId={null}
        form={EMPTY_CONFIG_FORM}
        isSaving={false}
        showApiKey={false}
        availableModels={AVAILABLE}
        onClose={onClose}
        onSave={onSave}
        onFormChange={onFormChange}
        onShowApiKeyChange={onShowApiKeyChange}
        {...overrides}
      />
    );
  }

  it("renderiza título de creación y sus campos", () => {
    renderModal();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Nueva configuración de IA")).toBeInTheDocument();
    expect(screen.getByText("Proveedor")).toBeInTheDocument();
    expect(screen.getByText("Modelo")).toBeInTheDocument();
    expect(screen.getByText("API Key")).toBeInTheDocument();
    expect(screen.getByText("Base URL")).toBeInTheDocument();
    expect(screen.getByText("Max Tokens")).toBeInTheDocument();
  });

  it("lista los modelos disponibles según el provider", () => {
    renderModal();
    const modelSelect = screen.getByLabelText("Modelo") as HTMLSelectElement;
    const options = Array.from(modelSelect.options).map((o) => o.value);
    expect(options).toEqual(["", ...AVAILABLE]);
  });

  it("cambiar de proveedor resetea el modelo seleccionado", () => {
    renderModal();
    fireEvent.change(screen.getByLabelText("Proveedor"), { target: { value: "anthropic" } });
    expect(onFormChange).toHaveBeenCalledWith({
      ...EMPTY_CONFIG_FORM,
      provider: "anthropic",
      model: "",
    });
  });

  it("alterna la visibilidad de la API key", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar API Key" }));
    expect(onShowApiKeyChange).toHaveBeenCalledWith(true);
  });

  it("guarda con el botón Crear", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("cancela con el botón Cancelar", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("en modo edit: título, badge con id y placeholder de mantener clave", () => {
    renderModal({ mode: "edit", editingId: 42 });
    expect(screen.getByText("Editar configuración")).toBeInTheDocument();
    expect(screen.getByText("Editando #42")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Dejar vacío para mantener la actual")).toBeInTheDocument();
  });

  it("alterna flags de Estado y Respaldo", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Activo" }));
    expect(onFormChange).toHaveBeenCalledWith({ ...EMPTY_CONFIG_FORM, isActive: false });

    fireEvent.click(screen.getByRole("button", { name: "Principal" }));
    expect(onFormChange).toHaveBeenCalledWith({ ...EMPTY_CONFIG_FORM, isFallback: true });
  });

  it("mantiene isSaving deshabilitado", () => {
    renderModal({ isSaving: true });
    expect(screen.getByRole("button", { name: "Crear" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });
});
