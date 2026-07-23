/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cliente HTTP. Re-exporta la lógica core desde @ivoo/shared e inicializa
 * la configuración específica de web (API_BASE_URL desde VITE_API_URL).
 */

import {
  setApiBaseUrl,
  setTokenRefreshHandler,
  getApiBaseUrl,
  apiFetch,
  apiDownload,
} from "@ivoo/shared";
export type { ApiFetchOptions } from "@ivoo/shared";
export {
  setApiBaseUrl,
  setTokenRefreshHandler,
  getApiBaseUrl,
  apiFetch,
  apiDownload,
};

// ---------------------------------------------------------------------------
// Inicialización de la base URL desde variable de entorno
// ---------------------------------------------------------------------------

const API_BASE_URL = import.meta.env.VITE_API_URL;
setApiBaseUrl(API_BASE_URL);

export { API_BASE_URL };
