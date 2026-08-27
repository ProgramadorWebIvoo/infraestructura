/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cliente WebSocket (Pusher Channels) para notificaciones push instantáneas.
 * Reemplaza el polling de NotificationsProvider.
 */

import axios, { AxiosError } from "axios";
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

  try {
    const response = await axios.post(
      resolveBroadcastingAuthUrl(),
      { socket_id: socketId, channel_name: channelName },
      {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
        },
      },
    );
    return response.data;
  } catch (err) {
    const status = (err as AxiosError).response?.status;
    throw new Error(`No se pudo autorizar el canal "${channelName}" (HTTP ${status ?? "?"}).`);
  }
}

export function createEchoClient(): Echo<"pusher"> | null {
  const key = import.meta.env.VITE_PUSHER_APP_KEY;

  // En producción la key se inyecta en el build vía VITE_PUSHER_APP_KEY. Si
  // falta (p.ej. no está definida en el entorno de build del deploy) no
  // instanciamos Echo: pusher-js lanza "You must pass your app key" y rompe
  // la app. Mejor degradar sin WebSocket (solo se pierden notificaciones
  // push instantáneas) que crashear todo el árbol de React.
  //
  // IMPORTANTE: este guard debe estar en la rama desplegada a PRD, no solo
  // en el working directory — quedó sin commitear una vez (ver postmortem
  // en el historial: el crash persistió en PRD porque createEchoClient()
  // seguía siendo la versión vieja sin este chequeo) y el crash volvió
  // exactamente por eso, no porque el guard estuviera mal escrito.
  if (!key) {
    console.error(
      "[echo] VITE_PUSHER_APP_KEY no está definida: las notificaciones en " +
        "tiempo real (WebSocket) están deshabilitadas. Defínela en el build de PRD.",
    );
    return null;
  }

  // Blindaje adicional: aunque `key` esté presente, pusher-js/laravel-echo
  // pueden lanzar síncronamente por otras razones (cluster mal formado,
  // versión incompatible del navegador, etc.) — un try/catch acá evita que
  // cualquier throw de la librería tumbe el árbol de React entero, más allá
  // del caso puntual de "key faltante" que ya cubre el chequeo de arriba.
  try {
    return new Echo({
      broadcaster: "pusher",
      key,
      cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER ?? "mt1",
      forceTLS: true,
      authorizer: ((channel) => ({
        authorize(socketId, callback) {
          authorizeChannel(socketId, channel.name)
            .then((data) => callback(null, data))
            .catch((error: Error) => callback(error, null));
        },
      })) satisfies ChannelAuthorizerGenerator,
    });
  } catch (error) {
    console.error("[echo] No se pudo inicializar el cliente WebSocket — notificaciones en tiempo real deshabilitadas.", error);
    return null;
  }
}