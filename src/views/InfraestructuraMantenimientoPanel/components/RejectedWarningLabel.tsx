/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Etiqueta de advertencia compacta: alerta cuando hay peticiones rechazadas
 * pendientes de corrección. Distinto de AlertBanner (genérico, mensaje tipo
 * párrafo, sin pulso) — este es un caso muy específico de esta vista, así
 * que vive local en vez de promoverse a UI/ prematuramente.
 *
 * Sin AnimatePresence propio a propósito: el montaje condicional (mostrar/
 * ocultar según count) lo controla el padre (InfraestructuraMantenimientoPanel/
 * index.tsx), envolviendo <RejectedWarningLabel> en su propio <AnimatePresence>
 * como hermano directo de las demás filas con variants={itemVariants}. Un
 * AnimatePresence propio aquí adentro rompía la herencia del contexto de
 * variants del containerVariants del panel — la card entraba de inmediato
 * en vez de esperar su turno en el stagger orquestado.
 */

import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { itemVariants } from "../../../animations";

interface RejectedWarningLabelProps {
  count: number;
}

export default function RejectedWarningLabel({ count }: RejectedWarningLabelProps) {
  return (
    <motion.div
      role="alert"
      variants={itemVariants}
      exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.2, ease: "easeIn" } }}
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-danger-200 bg-danger-50 shadow-xs"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger-500" />
      </span>
      <AlertTriangle className="h-4 w-4 shrink-0 text-danger-600" />
      <p className="text-xs font-bold text-danger-700">
        {count} {count === 1 ? "petición rechazada requiere" : "peticiones rechazadas requieren"} corrección y reenvío
      </p>
    </motion.div>
  );
}
