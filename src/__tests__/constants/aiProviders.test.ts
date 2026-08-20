/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from "vitest";
import { providerRole, providerColor, PROVIDER_LABELS, AI_PROVIDERS } from "@/constants/aiProviders";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";

describe("aiProviders", () => {
  it("expone los 3 proveedores soportados", () => {
    expect(AI_PROVIDERS).toEqual(["openai", "anthropic", "gemini"]);
  });

  it("mapea cada proveedor conocido a un rol semántico fijo", () => {
    expect(providerRole("openai")).toBe("success");
    expect(providerRole("anthropic")).toBe("warning");
    expect(providerRole("gemini")).toBe("info");
  });

  it("cae a OpenAI (success) para un proveedor desconocido", () => {
    expect(providerRole("unknown-provider")).toBe("success");
  });

  it("providerColor resuelve directamente contra SEMANTIC_COLOR_MAP", () => {
    expect(providerColor("openai")).toBe(SEMANTIC_COLOR_MAP.success);
    expect(providerColor("anthropic")).toBe(SEMANTIC_COLOR_MAP.warning);
    expect(providerColor("gemini")).toBe(SEMANTIC_COLOR_MAP.info);
  });

  it("providerColor no depende de un segundo mapa de clases crudas: expone los campos reales del token", () => {
    const color = providerColor("openai");
    expect(color).toHaveProperty("bg50");
    expect(color).toHaveProperty("text700");
    expect(color).toHaveProperty("gradientFrom");
    expect(color).toHaveProperty("gradientTo");
  });

  it("tiene labels legibles para los 3 proveedores", () => {
    expect(PROVIDER_LABELS.openai).toBe("OpenAI (ChatGPT)");
    expect(PROVIDER_LABELS.anthropic).toBe("Anthropic (Claude)");
    expect(PROVIDER_LABELS.gemini).toBe("Google Gemini");
  });
});
