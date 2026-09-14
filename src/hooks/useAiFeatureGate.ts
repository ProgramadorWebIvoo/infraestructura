/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Proyección pura sobre aiFeatureGateStore (fetch único y compartido de
 * /ai/feature-toggles para toda la sesión) — cada punto de integración IA
 * (BidEvaluationSection, DossierEvaluationPanel, AnalistasWorkspace,
 * ContractorDetailModal) envuelve su botón/sección con
 * `isAiFeatureEnabled(department, action)` para que, al desactivarla en
 * Config IA, la integración desaparezca visualmente en vez de solo
 * deshabilitarse.
 */

import { useAiFeatureGateStore } from "@/stores/aiFeatureGateStore";

export function useAiFeatureGate() {
  const matrix = useAiFeatureGateStore(s => s.matrix);
  const isLoading = useAiFeatureGateStore(s => s.isLoading);

  const isAiFeatureEnabled = (department: string, action: string): boolean => {
    const entry = matrix[department];
    if (!entry) return true; // sin fila configurada = habilitado (fail-open)
    if (entry.master === false) return false;
    return entry.actions[action] ?? true;
  };

  return { isAiFeatureEnabled, isLoading };
}
