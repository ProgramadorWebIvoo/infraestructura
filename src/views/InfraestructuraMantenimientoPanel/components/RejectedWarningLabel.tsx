/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Etiqueta de advertencia compacta: alerta cuando hay peticiones rechazadas
 * pendientes de corrección. Distinto de AlertBanner (genérico, mensaje tipo
 * párrafo, sin pulso) — este es un caso muy específico de esta vista, así
 * que vive local en vez de promoverse a UI/ prematuramente.
 */

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle } from "lucide-react";

interface RejectedWarningLabelProps {
  count: number;
}

export default function RejectedWarningLabel({ count }: RejectedWarningLabelProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <div className="-my-6">
          <motion.div
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="my-2 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-danger-200 bg-danger-50 shadow-xs">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger-500" />
              </span>
              <AlertTriangle className="h-4 w-4 shrink-0 text-danger-600" />
              <p className="text-xs font-bold text-danger-700">
                {count} {count === 1 ? "petición rechazada requiere" : "peticiones rechazadas requieren"} corrección y reenvío
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
