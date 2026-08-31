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
// Los proveedores del sistema son siempre personas jurídicas (empresas) —
// el RIF venezolano de persona jurídica empieza siempre con "J". No hay
// selector de tipo: la letra es fija, el usuario solo tipea los 9 dígitos.
// Espejo de Contractor::RIF_REGEX en el backend.
const RIF_PATTERN = /^J-?\d{8}-?\d$/;

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

/**
 * El formulario solo pide los 9 dígitos — el usuario nunca tipea la letra
 * ni guiones, la "J-" es fija. Estas dos funciones traducen entre el string
 * de dígitos y el RIF completo que espera el backend ("J-12345678-9").
 */
export function joinRif(digits: string): string {
  // Construye el string parcial tal cual va tipeando el usuario — no exige
  // los 9 dígitos completos. Si exigiera el conteo exacto, cada tecla antes
  // de la novena resetearía el campo a "" (y con él, los dígitos ya
  // tipeados), porque el input se re-renderiza a partir de este valor vía
  // splitRif(). La validez completa (9 dígitos) se chequea aparte con
  // isValidRif() / la longitud de digits, no acá.
  const clean = digits.replace(/\D/g, "").slice(0, 9);
  return clean ? `J-${clean}` : "";
}

export function splitRif(rif: string): { digits: string } {
  const match = rif.trim().toUpperCase().match(/^J-?(\d{0,9})-?(\d?)$/);
  if (!match) return { digits: "" };
  return { digits: `${match[1]}${match[2]}` };
}
