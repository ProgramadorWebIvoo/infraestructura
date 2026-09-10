/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lógica pura del formulario de configuración IA: validación y construcción
 * de payloads. Al vivir fuera del componente se puede testear sin renderizar
 * y se mantiene una única fuente de verdad para reglas de negocio.
 */

import type { AiConfigForm, AiConfigUpdatePayload } from "../../hooks/useAIConfig";
import { aiConfigFormSchema } from "../../schemas/aiConfig.schema";

/** Valor por defecto de max_tokens cuando el campo queda vacío. */
export const DEFAULT_MAX_TOKENS = 4096;

/**
 * Valida el formulario antes de guardar. Devuelve el mensaje de error, o null
 * si es válido.
 */
export function validateConfigForm(
  form: AiConfigForm,
  mode: "create" | "edit",
): string | null {
  const result = aiConfigFormSchema(mode).safeParse(form);
  return result.success ? null : result.error.issues[0].message;
}

/**
 * Construye el payload para actualizar una configuración. Solo incluye la API
 * key si el usuario escribió una nueva (vacío = mantener la actual en edición)
 * y normaliza maxTokens/baseUrl a lo que el backend espera.
 */
export function buildUpdatePayload(form: AiConfigForm): AiConfigUpdatePayload {
  const payload: AiConfigUpdatePayload = { model: form.model };

  if (form.apiKey.trim()) payload.apiKey = form.apiKey;
  payload.baseUrl = form.baseUrl || null;
  payload.maxTokens = form.maxTokens === "" ? DEFAULT_MAX_TOKENS : form.maxTokens;
  payload.isActive = form.isActive;
  payload.isFallback = form.isFallback;
  payload.sortOrder = form.sortOrder;

  return payload;
}
