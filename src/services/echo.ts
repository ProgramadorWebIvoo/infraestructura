/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cliente WebSocket (Laravel Reverb) para notificaciones push instantáneas —
 * reemplaza el polling de NotificationsProvider. No es un singleton de
 * módulo: se crea/destruye según el ciclo de vida de la suscripción (mismo
 * patrón que `enabled` en usePolling), ver useNotificationsSource.
 */

import Echo from "laravel-echo";
import Pusher from "pusher-js";
import type { ChannelAuthorizerGenerator } from "pusher-js/types/src/core/auth/deprecated_channel_authorizer";
import { ensureCsrfCookie, readCookie, getApiBaseUrl } from "./api";

// pusher-js espera Pusher en window (requisito histórico de la librería,
// laravel-echo lo asume presente incluso en v2).
declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}
window.Pusher = Pusher;

/**
 * /broadcasting/auth se registra vía Broadcast::routes(['middleware' =>
 * ['api']]) directo en el backend (BroadcastServiceProvider), sin pasar por
 * withRouting(api: ...) — por eso NO lleva el prefijo /api que sí llevan el
 * resto de los endpoints (ver getApiBaseUrl(), que termina en ".../api").
 */
function resolveBroadcastingAuthUrl(): string {
  const root = getApiBaseUrl().replace(/\/api\/?$/, "");
  return `${root}/broadcasting/auth`;
}

/**
 * No reusa apiFetch() a propósito: apiFetch hace `json.data ?? json`
 * internamente (convención Laravel del resto de la API), pero
 * /broadcasting/auth devuelve {auth, channel_data} sin wrapper `data` — un
 * acoplamiento frágil a un detalle interno que puede cambiar. Replica solo
 * lo necesario del flujo CSRF de Sanctum: cookie de sesión + X-XSRF-TOKEN.
 */
async function authorizeChannel(
  socketId: string,
  channelName: string,
): Promise<{ auth: string; channel_data?: string }> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("XSRF-TOKEN");

  const response = await fetch(resolveBroadcastingAuthUrl(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
    },
    body: JSON.stringify({ socket_id: socketId, channel_name: channelName }),
  });

  if (!response.ok) {
    throw new Error(`No se pudo autorizar el canal "${channelName}" (HTTP ${response.status}).`);
  }

  return response.json();
}

export function createEchoClient(): Echo<"reverb"> {
  return new Echo({
    broadcaster: "reverb",
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? "http") === "https",
    enabledTransports: ["ws", "wss"],
    authorizer: ((channel) => ({
      authorize(socketId, callback) {
        authorizeChannel(socketId, channel.name)
          .then((data) => callback(null, data))
          .catch((error: Error) => callback(error, null));
      },
    })) satisfies ChannelAuthorizerGenerator,
  });
}
