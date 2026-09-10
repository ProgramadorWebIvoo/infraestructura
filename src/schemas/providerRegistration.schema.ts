/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Schema de validación del registro público de proveedores. Reemplaza los
 * dos if() de guard en RegistrationForm.tsx::handleSubmit — mismos mensajes,
 * la sanitización (sanitize()) y el estado `touched` por campo se mantienen
 * en el componente porque son puramente de UI.
 */

import { z } from "zod";
import { isValidEmail } from "@/utils/validators";

export const providerRegistrationSchema = z.object({
  name: z.string().min(1),
  rifDigits: z.string().length(9),
  specialty: z.string().min(1),
  contact: z.string().min(1).refine(isValidEmail, "El correo electrónico no es válido."),
});

export type ProviderRegistrationInput = z.infer<typeof providerRegistrationSchema>;
