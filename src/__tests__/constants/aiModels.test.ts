/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sanity del catálogo de modelos por proveedor — la fuente editable a nivel
 * de código para alta/baja de modelos IA.
 */

import { describe, it, expect } from "vitest";
import { AI_PROVIDERS } from "@/constants/aiProviders";
import { PROVIDER_MODELS } from "@/constants/aiModels";

describe("PROVIDER_MODELS", () => {
  it("tiene una entrada por cada proveedor soportado", () => {
    for (const provider of AI_PROVIDERS) {
      expect(Array.isArray(PROVIDER_MODELS[provider])).toBe(true);
      expect(PROVIDER_MODELS[provider].length).toBeGreaterThan(0);
    }
  });

  it("no contiene duplicados por proveedor", () => {
    for (const provider of AI_PROVIDERS) {
      const models = PROVIDER_MODELS[provider];
      expect(new Set(models).size).toBe(models.length);
    }
  });

  it("incluye los modelos actuales de cada proveedor (verificados con las docs)", () => {
    expect(PROVIDER_MODELS.openai).toContain("gpt-5.6-sol");
    expect(PROVIDER_MODELS.anthropic).toContain("claude-opus-4-8");
    expect(PROVIDER_MODELS.gemini).toContain("gemini-3.6-flash");
  });
});
