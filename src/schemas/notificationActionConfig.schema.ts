/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Schema de validación del formulario de edición de acciones notificables.
 * No hay `key` acá a propósito — no es editable (ver
 * NotificationActionEditModal), es el identificador técnico que persiste
 * AuditLog::record() en el código.
 */

import { z } from "zod";

export const notificationActionConfigSchema = z.object({
  group: z.string().trim().min(1, "Completa todos los campos obligatorios."),
  scope: z.enum(["project", "global"]),
});
