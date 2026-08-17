/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Paleta de colores/iconos compartida entre Toast y AlertBanner —
 * antes duplicada carácter por carácter en ambos archivos.
 */

import { CheckCircle, AlertCircle, AlertTriangle, Info, Hand, Zap } from "lucide-react";
import { SEMANTIC_COLOR_MAP } from "./colorTokens";

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

/**
 * 4 de los 6 `AlertType` mapean 1:1 a un rol de `SEMANTIC_COLOR_MAP`.
 * "info" usa el rol `brand` (sky) — es el uso histórico y el estándar de
 * mercado para "informativo" (no el rol `info` interno del mapa, que
 * quedó anclado a violeta por el mapeo purple/indigo de `SectionHeader`;
 * son nombres de rol, no el mismo concepto de negocio en cada componente).
 * `action-required` se queda con violeta literal, distinto de `success/
 * error/warning/brand` — perdería su distinción real si colapsara con
 * cualquiera de los 4. `urgent` es la otra excepción consciente: no
 * fuerza un rol semántico existente porque perdería la señal de negocio
 * de "más urgente que warning/error" — naranja literal, fuera del sistema
 * de 6 roles.
 */
export const ALERT_STYLES: Record<AlertType, { bg: string; text: string; border: string }> = {
  success: { bg: SEMANTIC_COLOR_MAP.success.bg50, text: SEMANTIC_COLOR_MAP.success.text700, border: SEMANTIC_COLOR_MAP.success.border200 },
  error: { bg: SEMANTIC_COLOR_MAP.danger.bg50, text: SEMANTIC_COLOR_MAP.danger.text700, border: SEMANTIC_COLOR_MAP.danger.border200 },
  warning: { bg: SEMANTIC_COLOR_MAP.warning.bg50, text: SEMANTIC_COLOR_MAP.warning.text700, border: SEMANTIC_COLOR_MAP.warning.border200 },
  info: { bg: SEMANTIC_COLOR_MAP.brand.bg50, text: SEMANTIC_COLOR_MAP.brand.text700, border: SEMANTIC_COLOR_MAP.brand.border200 },
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
