/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Settings de CONFIG APP que son UNA opción entre varias (radio), no un texto
 * libre ni un booleano. `SettingRow` los muestra con un radiogroup accesible
 * en vez de un input de texto: así solo se puede elegir un valor válido y no
 * hay forma de dejar el setting en un estado que el backend rechazaría.
 */

import type { SegmentedOption } from "@/components/UI/SegmentedControl";
import type { SelectOption } from "@/components/UI/Select";

/** Momento en que se congelan los Bs. de la obra (ver RateFreezeService, backend). */
export const FREEZE_MOMENT_SETTING_KEY = "congelar_tasa_momento";

export const ENUM_SETTING_OPTIONS: Record<string, SegmentedOption<string>[]> = {
  [FREEZE_MOMENT_SETTING_KEY]: [
    { value: "CONTRATADO", label: "Al solicitar el anticipo", description: "Procura envía a Finanzas" },
    { value: "PAGO_ANTICIPO", label: "Al pagar el anticipo", description: "Monto del anticipo" },
    { value: "PAGO_FINIQUITO", label: "Al pagar el finiquito", description: "Monto del finiquito" },
  ],
};

/** Modo de las claves de idempotencia (IdempotencyService, backend). */
export const IDEMPOTENCY_MODE_SETTING_KEY = "idempotencia_modo";

/**
 * Settings de opción única con muchas opciones o sin descripción por opción:
 * se muestran con el Select de la app en vez de texto libre.
 */
export const SELECT_SETTING_OPTIONS: Record<string, SelectOption[]> = {
  [IDEMPOTENCY_MODE_SETTING_KEY]: [
    { value: "off", label: "Off" },
    { value: "log", label: "Log" },
    { value: "enforce", label: "Enforce" },
  ],
};
