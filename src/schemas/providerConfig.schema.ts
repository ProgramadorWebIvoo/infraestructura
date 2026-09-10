/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Schema de validación del formulario de proveedores (ProveedoresConfigPanel).
 * Reemplaza la cadena de if() de guard en index.tsx::handleSave, mismo orden
 * de prioridad y mensajes: campos obligatorios → formato RIF → al menos un
 * contacto → formato de ese contacto.
 */

import { z } from "zod";
import { isValidEmail, isValidPhone, isValidRif } from "../utils/validators";

export const providerConfigSchema = z
  .object({
    name: z.string().trim().min(1, "Completa todos los campos obligatorios."),
    rif: z
      .string()
      .trim()
      .min(1, "Completa todos los campos obligatorios.")
      .refine(isValidRif, "Ingresa un RIF válido (ej: J-12345678-9)."),
    specialty: z.string().trim().min(1, "Completa todos los campos obligatorios."),
    email: z.string(),
    phone: z.string(),
  })
  .superRefine((fields, ctx) => {
    const hasEmail = fields.email.trim() !== "";
    const hasPhone = fields.phone.trim() !== "";

    if (!hasEmail && !hasPhone) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Ingresa al menos un email o teléfono de contacto." });
      return;
    }
    if (hasEmail && !isValidEmail(fields.email)) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Ingresa un email válido." });
      return;
    }
    if (hasPhone && !isValidPhone(fields.phone)) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Ingresa un teléfono válido." });
    }
  });
