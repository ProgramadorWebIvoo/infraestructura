/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Punto único donde el DEBUG-MODE degrada la red de la app: services/api.ts
 * lo invoca al inicio de apiFetch/apiDownload. Sin el modo activo o con el
 * perfil "none" retorna de inmediato (lectura síncrona de dos primitivas).
 */

import { useDebugStore, pushDebugEntry } from "@/stores/debugStore";
import { applyNetworkProfile } from "@/utils/debugNetworkProfile";

export async function applyDebugNetworkProfile(
  label: string,
  signal?: AbortSignal | null,
): Promise<void> {
  const { enabled, networkProfile } = useDebugStore.getState();
  if (!enabled || networkProfile === "none") return;

  if (networkProfile === "offline") {
    pushDebugEntry({
      kind: "http",
      level: "warn",
      label: `${label} — bloqueado (offline simulado)`,
      detail: { simulated: true, profile: networkProfile },
    });
  }
  await applyNetworkProfile(networkProfile, { signal });
}
