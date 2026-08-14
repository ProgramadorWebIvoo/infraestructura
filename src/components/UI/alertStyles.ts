/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Paleta de colores/iconos compartida entre Toast y AlertBanner —
 * antes duplicada carácter por carácter en ambos archivos.
 */

import { CheckCircle, AlertCircle, AlertTriangle, Info, Hand, Zap } from "lucide-react";

/**
 * Taxonomía de 6 tipos pedida por el plan de 90 días (1.1) — mismos 6
 * valores que `App\Support\NotificationType` en el backend (informacion,
 * exito, advertencia, error, accion_requerida, prioritario), traducidos al
 * inglés porque `AlertType` ya se usaba así en AlertBanner/Toast antes de
 * esta taxonomía. "action-required"/"urgent" son tipos reales del union, no
 * variantes de otro tipo — `Toast.tsx`'s `priority`/`variant` siguen siendo
 * dimensiones ortogonales independientes (duración/origen), no reemplazadas.
 */
export type AlertType = "success" | "error" | "warning" | "info" | "action-required" | "urgent";

export const ALERT_ICONS: Record<AlertType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  "action-required": Hand,
  urgent: Zap,
};

export const ALERT_STYLES: Record<AlertType, { bg: string; text: string; border: string }> = {
  success: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  error: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  warning: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  info: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  "action-required": { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  urgent: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
};

/** Mapa del `type` del backend (NotificationType) a AlertType del frontend. */
export const BACKEND_NOTIFICATION_TYPE_MAP: Record<string, AlertType> = {
  informacion: "info",
  exito: "success",
  advertencia: "warning",
  error: "error",
  accion_requerida: "action-required",
  prioritario: "urgent",
};
