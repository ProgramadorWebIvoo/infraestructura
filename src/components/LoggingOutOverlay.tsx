/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pantalla de despedida durante el logout. Antes handleLogout() era
 * instantáneo — la app saltaba de golpe al login en cuanto resolvía la
 * llamada a /logout, sin ningún acuse de que la acción se había registrado.
 * Se monta apenas se hace click en "Cerrar Sesión" (antes de que la llamada
 * a red siquiera empiece) para que el feedback sea inmediato, y permanece un
 * beat mínimo (ver MIN_DISPLAY_MS en App.tsx) para que no sea un flash
 * ilegible en conexiones rápidas.
 *
 * Extraído de App.tsx a su propio chunk lazy-loaded: es el único lugar de
 * App.tsx que necesita `motion/react` (45KB gzip), y solo se renderiza
 * DESPUÉS de que el usuario ya está autenticado y hace logout — nunca en la
 * carga inicial (login, portal público). Importarlo de forma síncrona en
 * App.tsx forzaba a cualquier visitante anónimo a descargar y ejecutar
 * Framer Motion antes de poder pintar el login, inflando el LCP/FCP medido
 * en producción (ver PERFORMANCE-AUDIT-2026-09-15.md, sesión 3).
 */

import { AnimatePresence, motion } from "motion/react";
import Spinner from "./UI/Spinner";

export default function LoggingOutOverlay() {
  return (
    <AnimatePresence>
      <motion.div
        key="logging-out"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-100 flex items-center justify-center bg-[#F8FAFC]"
      >
        <div className="flex flex-col items-center gap-3">
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-5xl font-black tracking-tight text-slate-300 select-none"
          >
            IVOO
          </motion.span>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className="flex items-center gap-2 text-slate-400"
          >
            <Spinner size="sm" />
            <span className="text-sm font-medium">Cerrando sesión…</span>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
