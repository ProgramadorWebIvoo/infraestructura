/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas de la lógica pura del formulario de configuración IA
 * (validación + payload de actualización).
 */

import { describe, it, expect } from "vitest";
import {
  validateConfigForm,
  buildUpdatePayload,
  DEFAULT_MAX_TOKENS,
} from "@/views/AIConfigPanel/aiConfigForm";
import type { AiConfigForm } from "@/hooks/useAIConfig";

const BASE_FORM: AiConfigForm = {
  provider: "openai",
  model: "gpt-5.6-sol",
  apiKey: "sk-test",
  baseUrl: "",
  maxTokens: 4096,
  isActive: true,
  isFallback: false,
  sortOrder: 0,
};

describe("validateConfigForm", () => {
  it("devuelve null para un formulario válido", () => {
    expect(validateConfigForm(BASE_FORM, "create")).toBeNull();
    expect(validateConfigForm(BASE_FORM, "edit")).toBeNull();
  });

  it("exige modelo en ambos modos", () => {
    const noModel = { ...BASE_FORM, model: "   " };
    expect(validateConfigForm(noModel, "create")).toBe("El nombre del modelo es obligatorio.");
    expect(validateConfigForm(noModel, "edit")).toBe("El nombre del modelo es obligatorio.");
  });

  it("exige API key solo en modo create", () => {
    const noKey = { ...BASE_FORM, apiKey: "" };
    expect(validateConfigForm(noKey, "create")).toBe("La API Key es obligatoria.");
    // En edición, API key vacía = mantener la actual (válido)
    expect(validateConfigForm(noKey, "edit")).toBeNull();
  });
});

describe("buildUpdatePayload", () => {
  it("omite apiKey cuando está vacía (mantener la actual)", () => {
    const payload = buildUpdatePayload({ ...BASE_FORM, apiKey: "" });
    expect("apiKey" in payload).toBe(false);
  });

  it("incluye apiKey cuando el usuario escribe una nueva", () => {
    const payload = buildUpdatePayload({ ...BASE_FORM, apiKey: "sk-nueva" });
    expect(payload.apiKey).toBe("sk-nueva");
  });

  it("normaliza baseUrl vacía a null", () => {
    expect(buildUpdatePayload(BASE_FORM).baseUrl).toBeNull();
  });

  it("normaliza maxTokens vacío al default", () => {
    const payload = buildUpdatePayload({ ...BASE_FORM, maxTokens: "" });
    expect(payload.maxTokens).toBe(DEFAULT_MAX_TOKENS);
    expect(payload.maxTokens).toBe(4096);
  });

  it("propaga los flags y el sortOrder", () => {
    const payload = buildUpdatePayload({
      ...BASE_FORM,
      apiKey: "",
      isActive: false,
      isFallback: true,
      sortOrder: 7,
      baseUrl: "https://api.openai.com/v1",
      maxTokens: 8192,
    });
    expect(payload).toEqual({
      model: "gpt-5.6-sol",
      baseUrl: "https://api.openai.com/v1",
      maxTokens: 8192,
      isActive: false,
      isFallback: true,
      sortOrder: 7,
    });
  });
});
