/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cliente HTTP para mobile. Usa la lógica core de apiFetch desde @ivoo/shared
 * y agrega un wrapper requestJson compatible con el código existente.
 */

import { apiFetch, setApiBaseUrl } from "../packages/shared/src/api";
import { API_BASE_URL } from "./config";

// Inicializa la base URL desde la configuración de mobile
setApiBaseUrl(API_BASE_URL);

/**
 * Wrapper compatible con el código mobile existente.
 * Misma firma que el requestJson original: (token, path, options?)
 * Delega en apiFetch que maneja refresh token, errores 503, etc.
 */
export async function requestJson<T = any>(
  token: string | null,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return apiFetch<T>(path, {
    token: token ?? undefined,
    method: options.method,
    body: options.body,
    headers: options.headers as Record<string, string> | undefined,
  });
}
