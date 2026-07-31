/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Catálogo de modelos seleccionables por proveedor para el panel de
 * Configuración IA.
 *
 * Fuente de verdad editable a nivel de código: si un proveedor lanza un
 * modelo nuevo o deprecia uno existente, se agrega/quita aquí (y en el
 * espejo backend `AiConfigController::AVAILABLE_MODELS`) en una sola línea.
 *
 * Catálogo CURADO a propósito — no es el listado exhaustivo de cada
 * proveedor (OpenAI expone ~80 modelos), solo los que la organización
 * quiere exponer. Verificado contra la documentación oficial:
 *   - OpenAI  : https://developers.openai.com/api/docs/models
 *   - Anthropic: https://platform.claude.com/docs/en/api/messages
 *   - Gemini  : https://ai.google.dev/api/models
 */

import type { AIProvider } from "./aiProviders";

export const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  openai: [
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
    "gpt-5.4-mini",
    "gpt-5.4-nano",
    "gpt-5.2",
    "gpt-4.1",
    "gpt-4.1-mini",
    "o3",
    "o4-mini",
  ],
  anthropic: [
    "claude-opus-5",
    "claude-opus-4-8",
    "claude-sonnet-5",
    "claude-sonnet-4-6",
    "claude-haiku-4-5",
  ],
  gemini: [
    "gemini-3.6-flash",
    "gemini-3.1-pro-preview",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.0-flash",
  ],
};
