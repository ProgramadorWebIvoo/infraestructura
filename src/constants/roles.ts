/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Etiquetas legibles por rol — la lista de valores válidos viene siempre del
 * backend (GET /api/roles o GET /notification-rules, fuente de verdad:
 * App\Support\Roles::VALID) para que un rol nuevo no requiera tocar el
 * frontend para aparecer en los selectores. Este mapa es solo cosmético
 * (compartido entre UsuariosPanel y la matriz de notificaciones de
 * CONFIG APP) — si un rol no está mapeado, se muestra tal cual.
 */

export const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Super Administrador",
  ADMIN: "Administrador",
  PRESIDENCIA: "Presidencia",
  INFRAESTRUCTURA: "Infraestructura / Mant.",
  CIERRE_DE_OBRA: "Cierre de Obra",
  PROCURA: "Procura",
  ANALISTA: "Analistas",
  FINANZAS: "Finanzas",
  CATALOGOS: "Catálogos",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
