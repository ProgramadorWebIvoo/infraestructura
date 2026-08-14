/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Banner de alerta reutilizable: success, error, warning, info.
 */

import type { ReactNode } from "react";
import { ALERT_ICONS, ALERT_STYLES, type AlertType } from "./alertStyles";

interface AlertBannerProps {
  type: AlertType;
  message: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export default function AlertBanner({ type, message, icon, className = "" }: AlertBannerProps) {
  const s = ALERT_STYLES[type];
  const Icon = ALERT_ICONS[type];

  return (
    <div
      role={type === "error" || type === "warning" ? "alert" : "status"}
      className={`flex items-start gap-2.5 text-xs ${s.bg} ${s.text} ${s.border} p-3.5 rounded-xl font-medium border ${className}`}
    >
      {icon ?? <Icon className="h-4 w-4 shrink-0 mt-0.5" />}
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}
