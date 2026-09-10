/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Schema de validación del formulario de usuarios (UsuariosPanel). name/email
 * son obligatorios siempre; password/password_confirmation solo se validan
 * en modo creación (en edición el backend conserva la clave existente).
 */

import { z } from "zod";

const baseUserFieldsSchema = z.object({
  name: z.string().trim().min(1, "Completa todos los campos obligatorios."),
  email: z.string().trim().min(1, "Completa todos los campos obligatorios."),
});

export function userFormSchema(mode: "create" | "edit") {
  if (mode === "edit") return baseUserFieldsSchema;

  return baseUserFieldsSchema
    .extend({
      password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
      password_confirmation: z.string(),
    })
    .superRefine((fields, ctx) => {
      if (fields.password !== fields.password_confirmation) {
        ctx.addIssue({ code: "custom", path: ["password_confirmation"], message: "Las contraseñas no coinciden." });
      }
    });
}
