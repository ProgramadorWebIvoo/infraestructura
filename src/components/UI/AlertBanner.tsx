/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Banner de alerta reutilizable: success, error, warning, info.
 */

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";

type AlertType = "success" | "error" | "warning" | "info";

interface AlertBannerProps {
  type: AlertType;
  message: string;
  icon?: ReactNode;
  className?: string;
}

const STYLES: Record<AlertType, { bg: string; text: string; border: string; defaultIcon: ReactNode }> = {
  success: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    defaultIcon: <CheckCircle className="h-4 w-4 shrink-0" />,
  },
  error: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    defaultIcon: <AlertCircle className="h-4 w-4 shrink-0" />,
  },
  warning: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    defaultIcon: <AlertTriangle className="h-4 w-4 shrink-0" />,
  },
  info: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    defaultIcon: <Info className="h-4 w-4 shrink-0" />,
  },
};

export default function AlertBanner({ type, message, icon, className = "" }: AlertBannerProps) {
  const s = STYLES[type];

  return (
    <div
      role={type === "error" || type === "warning" ? "alert" : "status"}
      className={`flex items-center gap-2.5 text-xs ${s.bg} ${s.text} ${s.border} p-3.5 rounded-xl font-medium border ${className}`}
    >
      {icon ?? s.defaultIcon}
      <span>{message}</span>
    </div>
  );
}
