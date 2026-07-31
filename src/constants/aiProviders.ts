/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Constantes de presentación/dominio para los proveedores de IA
 * (OpenAI/ChatGPT, Anthropic/Claude, Google Gemini).
 *
 * Fuente única de verdad: los catálogos de modelos y endpoints se validan
 * contra la documentación oficial de cada proveedor. Los labels y colores
 * viven aquí para que hook/vistas no dupliquen valores.
 */

export type AIProvider = "openai" | "anthropic" | "gemini";

export const AI_PROVIDERS: readonly AIProvider[] = ["openai", "anthropic", "gemini"];

export const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI (ChatGPT)",
  anthropic: "Anthropic (Claude)",
  gemini: "Google Gemini",
};

export interface ProviderColorSet {
  border: string;
  badge: string;
  btn: string;
  /** Color de la barra de consumo en el dashboard de uso. */
  bar: string;
}

export const PROVIDER_COLORS: Record<string, ProviderColorSet> = {
  openai: {
    border: "border-l-emerald-400",
    badge: "bg-emerald-50 text-emerald-700",
    btn: "from-emerald-600 to-emerald-500",
    bar: "bg-emerald-500",
  },
  anthropic: {
    border: "border-l-amber-400",
    badge: "bg-amber-50 text-amber-700",
    btn: "from-amber-600 to-amber-500",
    bar: "bg-amber-500",
  },
  gemini: {
    border: "border-l-blue-400",
    badge: "bg-blue-50 text-blue-700",
    btn: "from-blue-600 to-blue-500",
    bar: "bg-blue-500",
  },
};

/** Clases de color para un proveedor, con fallback determinístico a OpenAI. */
export function providerColor(provider: string): ProviderColorSet {
  return PROVIDER_COLORS[provider] ?? PROVIDER_COLORS.openai;
}
