/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Schemas de validación del catálogo de monedas (CurrencyCard). Dos formas
 * separadas porque editar una moneda existente no pide código (es inmutable).
 */

import { z } from "zod";

export const currencyEditSchema = z.object({
  name: z.string().trim().min(1, "Nombre y símbolo no pueden quedar vacíos."),
  symbol: z.string().trim().min(1, "Nombre y símbolo no pueden quedar vacíos."),
});

export const currencyAddSchema = z.object({
  code: z.string().trim().min(1, "Completa código, nombre y símbolo."),
  name: z.string().trim().min(1, "Completa código, nombre y símbolo."),
  symbol: z.string().trim().min(1, "Completa código, nombre y símbolo."),
});
