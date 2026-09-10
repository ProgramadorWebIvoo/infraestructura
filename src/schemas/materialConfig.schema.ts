/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Schema de validación del formulario de materiales de configuración.
 * Reemplaza los dos if() de guard en MaterialConfigPanel/index.tsx::handleSave.
 */

import { z } from "zod";

export const materialConfigSchema = z.object({
  name: z.string().trim().min(1, "Completa todos los campos obligatorios."),
  unit: z.string().trim().min(1, "Completa todos los campos obligatorios."),
  estimatedUnitPrice: z
    .union([z.literal(""), z.number()])
    .refine((v) => v !== "" && v > 0, "El precio unitario estimado debe ser mayor a 0."),
});
