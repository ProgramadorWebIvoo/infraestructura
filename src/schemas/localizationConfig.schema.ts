/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Validation for the registered-location form (F2-R D12). Changing the
 * resident of an existing location requires a reason (checked by the panel,
 * which knows the previous resident).
 */

import { z } from "zod";

export const localizationConfigSchema = z.object({
  title: z.string().trim().min(1, "Completa todos los campos obligatorios."),
  city: z.string().trim().min(1, "Completa todos los campos obligatorios."),
  type: z.enum(["TIENDA", "PLANTA", "OFICINA", "OTRO"]),
  residentUserId: z.number({ error: "Selecciona el residente de la ubicación." }).int().positive("Selecciona el residente de la ubicación."),
});

/** Reason is mandatory only when an existing location changes resident (D11, audited). */
export function residentChangeReasonError(previousResidentId: number | null, nextResidentId: number | null, reason: string): string | null {
  if (previousResidentId === null || nextResidentId === previousResidentId) return null;
  return reason.trim().length >= 3 ? null : "Indica el motivo del cambio de residente.";
}
