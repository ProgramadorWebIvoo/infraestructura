/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Schemas de validación de los 3 pasos del wizard de alta de petición.
 * Reemplazan a validateDatosStep/validateMaterialesStep/validateAdjuntosStep
 * en useRequestForm.ts — mismas reglas y mensajes, ahora declarativos.
 * Los paths de las issues se fuerzan a los FieldKey del wizard (ver
 * useRequestForm.ts) para que el mapeo a FieldErrors sea directo.
 */

import { z } from "zod";

export const datosStepSchema = z.object({
  title: z.string().trim().min(1, "El título de la obra o trabajo es obligatorio."),
  locationMode: z.enum(["registered", "custom"]).default("custom"),
  localizationId: z.number().nullable().default(null),
  location: z.string(),
  description: z.string().trim().min(1, "Describe el alcance del trabajo a realizar."),
}).superRefine((fields, ctx) => {
  // Exactly one location source: a registered one (id) or the free text (F2-R D10).
  if (fields.locationMode === "registered") {
    if (fields.localizationId === null) {
      ctx.addIssue({ code: "custom", path: ["location"], message: "Elige una ubicación registrada o usa una personalizada." });
    }
  } else if (fields.location.trim() === "") {
    ctx.addIssue({ code: "custom", path: ["location"], message: "La ubicación exacta es obligatoria." });
  }
});

export const materialesStepSchema = z.object({
  addedMaterials: z.array(z.unknown()),
}).superRefine((fields, ctx) => {
  if (fields.addedMaterials.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["materials"],
      message: "Agrega al menos un material o servicio a la petición.",
    });
  }
});

export const adjuntosStepSchema = z.object({
  photoFiles: z.array(z.unknown()),
  documentFiles: z.array(z.unknown()),
  planFiles: z.array(z.unknown()),
  hasExistingAttachments: z.boolean().optional(),
}).superRefine((fields, ctx) => {
  const hasAny =
    fields.hasExistingAttachments ||
    fields.photoFiles.length > 0 ||
    fields.documentFiles.length > 0 ||
    fields.planFiles.length > 0;
  if (!hasAny) {
    ctx.addIssue({
      code: "custom",
      path: ["attachments"],
      message: "Adjunta al menos un archivo (foto, documento o plano) antes de continuar.",
    });
  }
});
