/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Constantes de presentación/dominio para los proveedores de IA
 * (OpenAI/ChatGPT, Anthropic/Claude, Google Gemini).
 *
 * Fuente única de verdad: los catálogos de modelos y endpoints se validan
 * contra la documentación oficial de cada proveedor. Los labels viven aquí
 * para que hook/vistas no dupliquen valores; el color de cada proveedor se
 * resuelve como rol semántico (`SEMANTIC_COLOR_MAP`) en vez de mantener un
 * segundo mapa de clases Tailwind crudas en paralelo.
 */

import { SEMANTIC_COLOR_MAP, type SemanticColor } from "../components/UI/colorTokens";

export type AIProvider = "openai" | "anthropic" | "gemini";

export const AI_PROVIDERS: readonly AIProvider[] = ["openai", "anthropic", "gemini"];

export const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI (ChatGPT)",
  anthropic: "Anthropic (Claude)",
  gemini: "Google Gemini",
};

const PROVIDER_ROLE: Record<string, SemanticColor> = {
  openai: "success",
  anthropic: "warning",
  gemini: "info",
};

/** Rol semántico de un proveedor, con fallback determinístico a OpenAI. */
export function providerRole(provider: string): SemanticColor {
  return PROVIDER_ROLE[provider] ?? PROVIDER_ROLE.openai;
}

/** Clases de color (`SEMANTIC_COLOR_MAP`) para un proveedor, con fallback determinístico a OpenAI. */
export function providerColor(provider: string) {
  return SEMANTIC_COLOR_MAP[providerRole(provider)];
}
