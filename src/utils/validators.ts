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

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  return PHONE_PATTERN.test(trimmed) && /\d{7,}/.test(trimmed.replace(/[^\d]/g, ""));
}
