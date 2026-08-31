/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Validadores de formato para campos de contacto libres (no ligados a un
 * componente puntual). No son validación de negocio ni de servidor —
 * solo determinan si un string tiene forma de email/teléfono para dar
 * feedback visual inmediato (ej. RequiredMark).
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+()\-.\s\d]{7,}$/;
// Letra de tipo de contribuyente (V/E/J/P/G) + 8 dígitos + verificador, con
// o sin guiones — espejo de Contractor::RIF_REGEX en el backend. Solo forma,
// no valida el dígito verificador matemáticamente.
const RIF_PATTERN = /^[VEJPGvejpg]-?\d{8}-?\d$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  return PHONE_PATTERN.test(trimmed) && /\d{7,}/.test(trimmed.replace(/[^\d]/g, ""));
}

export function isValidRif(value: string): boolean {
  return RIF_PATTERN.test(value.trim());
}

export const RIF_TYPES = ["J", "V", "E", "P", "G"] as const;
export type RifType = (typeof RIF_TYPES)[number];

/**
 * El formulario solo pide la letra (selector) y los 9 dígitos (input
 * numérico) — el usuario nunca tipea guiones. Estas dos funciones traducen
 * entre esa representación partida y el string completo que espera el
 * backend ("J-12345678-9"), en ambos sentidos.
 */
export function joinRif(type: RifType, digits: string): string {
  // Construye el string parcial tal cual va tipeando el usuario — no exige
  // los 9 dígitos completos. Si exigiera el conteo exacto, cada tecla antes
  // de la novena resetearía el campo a "" (y con él, los dígitos ya
  // tipeados), porque el input se re-renderiza a partir de este valor vía
  // splitRif(). La validez completa (9 dígitos) se chequea aparte con
  // isValidRif() / la longitud de digits, no acá.
  const clean = digits.replace(/\D/g, "").slice(0, 9);
  return clean ? `${type}-${clean}` : type;
}

export function splitRif(rif: string): { type: RifType; digits: string } {
  const match = rif.trim().toUpperCase().match(/^([VEJPG])-?(\d{0,9})-?(\d?)$/);
  if (!match) return { type: "J", digits: "" };
  return { type: match[1] as RifType, digits: `${match[2]}${match[3]}` };
}
