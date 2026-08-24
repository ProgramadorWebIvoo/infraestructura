/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenedor animado para el contenido de una tab activa — pareja natural
 * de Tabs.tsx (selector), pero deliberadamente separado: Tabs no sabe qué
 * contenido corresponde a cada tab, eso lo decide el consumidor (patrón
 * estándar de "controlled tabs", igual que Modal separado de su contenido).
 *
 * Encapsula la transición ya afinada para que la próxima vista con tabs no
 * la reescriba a mano y repita los mismos ajustes:
 * - Sin mode="wait": esperar a que la tab saliente termine su exit antes de
 *   montar la entrante duplica el tiempo total percibido — se sentía lento.
 * - Sin animación de exit: combinada con lo anterior, un exit con
 *   position:"absolute" dentro de un padre flex pierde el alto calculado
 *   por flex durante la transición — más simple y más rápido no exitear.
 * - Duración corta fija (no spring): para un cambio de tab, un spring de
 *   ~300-400ms se siente con inercia de más; 120ms lineal-ish se siente
 *   instantáneo sin dejar de notarse.
 */

import { motion } from "motion/react";
import type { ReactNode } from "react";

interface TabPanelProps {
  /** Tab activa — cambia el key interno, dispara la transición de entrada. */
  activeKey: string;
  children: ReactNode;
  className?: string;
}

export default function TabPanel({ activeKey, children, className = "" }: TabPanelProps) {
  return (
    <motion.div
      key={activeKey}
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className={`min-h-0 flex flex-col flex-1 ${className}`}
    >
      {children}
    </motion.div>
  );
}
