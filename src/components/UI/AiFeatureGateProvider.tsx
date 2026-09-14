/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dispara el fetch único de /ai/feature-toggles al montar (mismo criterio
 * que PublicSettingsProvider) — el estado en sí vive en aiFeatureGateStore
 * (Zustand), consumido vía useAiFeatureGate() por cualquier componente sin
 * pasar por Context.
 */

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAiFeatureGateStore } from "@/stores/aiFeatureGateStore";

export function AiFeatureGateProvider({ children }: { children: ReactNode }) {
  const { authToken } = useAuth();
  const load = useAiFeatureGateStore(s => s.load);

  useEffect(() => {
    if (authToken) load(authToken);
  }, [authToken, load]);

  return <>{children}</>;
}
