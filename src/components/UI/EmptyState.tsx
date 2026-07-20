/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Estado vacío reutilizable con icono y mensaje.
 */

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  message: string;
  icon?: ReactNode;
  className?: string;
}

export default function EmptyState({ message, icon, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl ${className}`}
    >
      <div className="text-slate-300 flex justify-center mb-2">
        {icon ?? <Inbox className="h-8 w-8" />}
      </div>
      <p className="text-xs text-slate-500 font-medium italic">{message}</p>
    </div>
  );
}
