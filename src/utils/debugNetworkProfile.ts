/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Perfiles de red simulada del DEBUG-MODE. Hoja pura (sin stores ni
 * services). Solo aplican a las llamadas de la app por apiFetch/apiDownload:
 * el navegador, Pusher/Echo y los fetch/axios directos NO se ven afectados
 * (ver services/debugNetwork.ts). Solo simulan LATENCIA, no ancho de banda.
 */

export type NetworkProfileKey = "none" | "slow4g" | "3g" | "offline";

interface NetworkProfile {
  label: string;
  /** Latencia fija añadida a cada request (ms). */
  baseMs: number;
  /** Variación aleatoria ± (ms), para que no sea una cadencia artificial. */
  jitterMs: number;
}

export const NETWORK_PROFILES: Record<NetworkProfileKey, NetworkProfile> = {
  none: { label: "Red normal", baseMs: 0, jitterMs: 0 },
  slow4g: { label: "Slow 4G (~400 ms)", baseMs: 400, jitterMs: 100 },
  "3g": { label: "3G (~1,5 s)", baseMs: 1500, jitterMs: 500 },
  offline: { label: "Offline", baseMs: 0, jitterMs: 0 },
};

export const NETWORK_PROFILE_KEYS = Object.keys(NETWORK_PROFILES) as NetworkProfileKey[];

export function simulatedDelayMs(profile: NetworkProfileKey, random: () => number = Math.random): number {
  const { baseMs, jitterMs } = NETWORK_PROFILES[profile];
  if (baseMs === 0) return 0;
  return Math.max(0, Math.round(baseMs + (random() * 2 - 1) * jitterMs));
}

/**
 * Error equivalente al de un fetch sin red. A propósito NO es un ApiError:
 * igual que un corte real, deja la operación en estado "resultado
 * desconocido" y conserva la clave de idempotencia para el reintento.
 */
export function createOfflineError(): TypeError {
  return new TypeError("Failed to fetch (offline simulado por DEBUG-MODE)");
}

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

/** Espera la latencia del perfil (respetando `signal`) o rechaza si es offline. Perfil `none`: no espera. */
export async function applyNetworkProfile(
  profile: NetworkProfileKey,
  options: { signal?: AbortSignal | null; random?: () => number } = {},
): Promise<void> {
  if (profile === "none") return;
  if (profile === "offline") throw createOfflineError();

  const { signal, random } = options;
  if (signal?.aborted) throw abortError();
  const delay = simulatedDelayMs(profile, random);
  if (delay === 0) return;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delay);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Avisa a la app (OfflineBanner, useOnlineStatus) al entrar/salir del perfil offline. */
export function notifyConnectivity(prev: NetworkProfileKey, next: NetworkProfileKey): void {
  if (typeof window === "undefined") return;
  if (next === "offline" && prev !== "offline") window.dispatchEvent(new Event("offline"));
  else if (prev === "offline" && next !== "offline") window.dispatchEvent(new Event("online"));
}
