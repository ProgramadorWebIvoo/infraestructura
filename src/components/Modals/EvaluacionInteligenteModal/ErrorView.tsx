/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Estado Error del modal de Evaluación Inteligente.
 */

import { AlertTriangle, RefreshCw } from "lucide-react";
import type { ErrorViewProps } from "./types";

export default function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="bg-red-50 text-red-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-800 mb-1">Error en la evaluación</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">{message}</p>
      </div>
      <button
        id="btn-retry-ai-evaluation"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md transition-all cursor-pointer"
      >
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </button>
    </div>
  );
}
