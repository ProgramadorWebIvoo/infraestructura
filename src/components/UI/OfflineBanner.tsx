/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OfflineBanner — Banner global que alerta cuando no hay conexión.
 * Se posiciona fijo en la parte inferior y es visible en todas las vistas.
 * Diseño consistente con Toast.tsx: icon chip, borde de acento, sombra multicapa.
 */

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { SEMANTIC_COLOR_MAP } from "./colorTokens";

const d = SEMANTIC_COLOR_MAP.danger;

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          role="alert"
          aria-live="assertive"
          initial={reduceMotion ? { opacity: 1 } : { y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { y: 20, opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-99999 w-200 rounded-2xl border backdrop-blur-xl flex items-center gap-3 px-4 py-3 text-sm font-semibold ${d.bg50} ${d.text700} ${d.border200} border-l-[3px] border-l-danger-400 [box-shadow:0_1px_1px_rgba(0,0,0,0.04),0_8px_16px_-4px_rgba(0,0,0,0.08),0_24px_48px_-12px_rgba(0,0,0,0.14)]`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-100/80 ring-1 ring-danger-500/15">
            <WifiOff className="h-4 w-4 text-danger-600" />
          </span>
          <span className="leading-snug">
            Sin conexión a internet. Los cambios no podrán guardarse hasta que se restablezca la conexión.
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
