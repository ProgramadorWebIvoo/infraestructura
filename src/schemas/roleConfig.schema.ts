/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Schema de validación del formulario de roles — mismo criterio que
 * projectTypeConfig.schema.ts. `key` solo se valida en modo creación (no
 * editable después, ver RoleFormModal).
 */

import { z } from "zod";

export const roleConfigSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Completa todos los campos obligatorios.")
    .regex(/^[A-Za-z0-9_]+$/, "La clave solo admite letras, números y guion bajo."),
  label: z.string().trim().min(1, "Completa todos los campos obligatorios."),
});
