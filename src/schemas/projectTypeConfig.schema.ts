/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Schema de validación del formulario de tipos de proyecto — mismo criterio
 * que materialConfig.schema.ts. `key` solo se valida en modo creación (no
 * editable después, ver ProjectTypeFormModal).
 */

import { z } from "zod";

export const projectTypeConfigSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Completa todos los campos obligatorios.")
    .regex(/^[A-Za-z0-9_]+$/, "La clave solo admite letras, números y guion bajo."),
  label: z.string().trim().min(1, "Completa todos los campos obligatorios."),
});
