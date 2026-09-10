/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Schema de validación del formulario de login. Reemplaza a las funciones
 * validateEmail/validatePassword previas de useAuth.ts — misma UX, ahora
 * declarativa y tipada en runtime.
 */

import { z } from "zod";

// Misma regex laxa que usaba useAuth.ts antes de migrar a zod — z.email()
// rechaza TLDs de 1 char ("a@b.c") que los tests y algunos entornos de
// prueba internos usan como email válido.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Ingrese su correo electrónico.")
    .regex(EMAIL_REGEX, "El formato del correo no es válido.")
    .max(254, "El correo es demasiado largo."),
  password: z.string().min(1, "Ingrese su clave."),
});

export type LoginForm = z.infer<typeof loginSchema>;
