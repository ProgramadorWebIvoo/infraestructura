/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Schema de validación del formulario de configuración IA. Valida solo los
 * campos con regla de negocio real (model, apiKey en creación) — el resto
 * del formulario (AiConfigForm en useAIConfig.ts) no requiere validación de
 * formato, por eso no se duplica el tipo completo acá.
 */

import { z } from "zod";

const baseAiConfigFieldsSchema = z.object({
  model: z.string().trim().min(1, "El nombre del modelo es obligatorio."),
  apiKey: z.string().trim(),
});

export function aiConfigFormSchema(mode: "create" | "edit") {
  return mode === "create"
    ? baseAiConfigFieldsSchema.extend({
        apiKey: z.string().trim().min(1, "La API Key es obligatoria."),
      })
    : baseAiConfigFieldsSchema;
}
