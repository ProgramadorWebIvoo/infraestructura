/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Estado Loading del modal de Evaluación Inteligente.
 * Muestra animación del proveedor activo + failover log en tiempo real.
 */

import { motion } from "motion/react";
import type { LoadingViewProps } from "./types";

export default function LoadingView({
  providerLabel,
  providerColor,
  Icon,
  failoverLog,
  isAutoMode,
  logEndRef,
}: LoadingViewProps) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center gap-4 py-6">
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-20 h-20 rounded-2xl flex items-center justify-center border-2"
          style={{
            backgroundColor: `${providerColor}15`,
            borderColor: `${providerColor}30`,
            color: providerColor,
          }}
        >
          <Icon className="h-10 w-10" />
        </motion.div>
        <div>
          <p className="text-sm font-bold text-slate-700">
            Analizando propuestas con{" "}
            <span style={{ color: providerColor }}>{providerLabel}</span>
          </p>
          {isAutoMode && (
            <p className="text-[11px] text-slate-400 mt-1">
              Failover automático: ChatGPT → Gemini → Claude
            </p>
          )}
        </div>

        {/* Barra de progreso indeterminada */}
        <div className="w-full max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: providerColor }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Failover log */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 max-h-32 overflow-y-auto text-left">
        {failoverLog.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Preparando análisis...</p>
        ) : (
          failoverLog.map((entry, i) => (
            <p key={i} className="text-[11px] font-mono text-slate-600 leading-relaxed">
              {entry}
            </p>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
