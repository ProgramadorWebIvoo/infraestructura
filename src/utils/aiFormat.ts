/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Helpers de formato para el módulo de Configuración IA.
 * Funciones puras — fáciles de testear y reutilizar entre vistas.
 */

/**
 * Formatea un costo estimado de uso de IA. Valores nulos/cero/negativos o
 * menores a $0.01 se muestran como "< $0.01" (los proveedores facturan por
 * milésimas de centavo; redondear a $0.00 sería engañoso).
 */
export function formatAiCost(value: number | string | null | undefined): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (numeric == null || Number.isNaN(numeric) || numeric < 0.01) return "< $0.01";
  return `$${numeric.toFixed(2)}`;
}
