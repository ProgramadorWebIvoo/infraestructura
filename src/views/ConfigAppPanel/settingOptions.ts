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

/** Momento en que se congelan los Bs. de la obra (ver RateFreezeService, backend). */
export const FREEZE_MOMENT_SETTING_KEY = "congelar_tasa_momento";

export const ENUM_SETTING_OPTIONS: Record<string, SegmentedOption<string>[]> = {
  [FREEZE_MOMENT_SETTING_KEY]: [
    { value: "CONTRATADO", label: "Al adjudicar", description: "Monto adjudicado" },
    { value: "PAGO_ANTICIPO", label: "Al pagar el anticipo", description: "Monto del anticipo" },
    { value: "PAGO_FINIQUITO", label: "Al pagar el finiquito", description: "Monto del finiquito" },
    { value: "NINGUNO", label: "No congelar", description: "Siempre tasa del día" },
  ],
};
