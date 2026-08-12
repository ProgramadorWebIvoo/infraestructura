/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Paleta de colores/iconos compartida entre Toast y AlertBanner —
 * antes duplicada carácter por carácter en ambos archivos.
 */

import { CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

export type AlertType = "success" | "error" | "warning" | "info";

export const ALERT_ICONS: Record<AlertType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export const ALERT_STYLES: Record<AlertType, { bg: string; text: string; border: string }> = {
  success: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  error: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  warning: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  info: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
};
