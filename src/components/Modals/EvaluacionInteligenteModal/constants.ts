/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Constantes compartidas para el modal de Evaluación Inteligente.
 */

import { Bot, Sparkles, Brain, Network } from "lucide-react";
import type { AIProviderUsed } from "../../../services/aiEvaluationService";

export const PROVIDER_META: Record<
  AIProviderUsed | "auto",
  { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  auto: { label: "Automático (Failover)", color: "#f59e0b", Icon: Network },
  chatgpt: { label: "ChatGPT (OpenAI)", color: "#10a37f", Icon: Bot },
  gemini: { label: "Gemini (Google)", color: "#4285f4", Icon: Sparkles },
  claude: { label: "Claude (Anthropic)", color: "#d97706", Icon: Brain },
};
