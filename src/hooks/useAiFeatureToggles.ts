/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Matriz configurable departamento × acción de IA — "Control por
 * Departamento" en Config IA. A diferencia de useNotificationRules (que
 * guarda vía la barra "Guardar todo" de CONFIG APP), este panel guarda
 * inmediato por toggle, igual criterio que handleToggleActive en
 * AIConfigTable — no hay borrador local que perder.
 */

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";
import { useAiFeatureGateStore } from "@/stores/aiFeatureGateStore";
import type { AiFeatureMatrix } from "@/stores/aiFeatureGateStore";

export interface AiFeatureActionOption {
  value: string;
  label: string;
  department: string;
  description: string;
}

interface AiFeatureTogglesResponse {
  departments: string[];
  actions: AiFeatureActionOption[];
  matrix: AiFeatureMatrix;
}

export function useAiFeatureToggles(authToken: string, enabled: boolean) {
  const [departments, setDepartments] = useState<string[]>([]);
  const [actions, setActions] = useState<AiFeatureActionOption[]>([]);
  const [matrix, setMatrix] = useState<AiFeatureMatrix>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authToken || !enabled) return;
    setIsLoading(true);
    try {
      const data = await apiFetch<AiFeatureTogglesResponse>("/ai/feature-toggles", { token: authToken });
      setDepartments(data.departments ?? []);
      setActions(data.actions ?? []);
      setMatrix(data.matrix ?? {});
    } catch (err) {
      logError("useAiFeatureToggles.load", err);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [authToken, enabled]);

  useEffect(() => {
    if (enabled && !hasLoaded) load();
  }, [enabled, hasLoaded, load]);

  const setToggle = useCallback(
    async (department: string, action: string | null, isEnabled: boolean): Promise<void> => {
      const key = `${department}:${action ?? "__master__"}`;
      setPendingKey(key);
      try {
        const updated = await apiFetch<{ matrix: AiFeatureMatrix }>("/ai/feature-toggles", {
          method: "PUT",
          body: JSON.stringify({ department, action, enabled: isEnabled }),
          token: authToken,
        });
        setMatrix(updated.matrix ?? {});
        // Refleja el cambio de inmediato en el store compartido (session-wide
        // gate) sin esperar a que otra pestaña/vista vuelva a fetchear.
        useAiFeatureGateStore.setState({ matrix: updated.matrix ?? {} });
      } finally {
        setPendingKey(null);
      }
    },
    [authToken],
  );

  return { departments, actions, matrix, isLoading, pendingKey, setToggle, reload: load };
}
