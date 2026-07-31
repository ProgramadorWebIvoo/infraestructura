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
export function formatAiCost(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value) || value < 0.01) return "< $0.01";
  return `$${value.toFixed(2)}`;
}
