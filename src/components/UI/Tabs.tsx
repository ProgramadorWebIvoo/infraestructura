/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Selector de pestañas con panel controlado por el consumidor — distinto de
 * SegmentedControl (selector visual sin indicador deslizante ni semántica
 * de tablist/tabpanel). El indicador de tab activa usa layoutId de Motion
 * para animarse fluidamente entre posiciones al cambiar de pestaña.
 *
 * ── Cómo usar un sistema de tabs completo en una vista ──
 * Tabs (este componente) es solo el selector — nunca decide qué contenido
 * corresponde a cada tab (patrón estándar de "controlled tabs", igual que
 * Modal separado de su contenido). El consumidor arma 3 piezas:
 *
 *   1. <Tabs> — el selector, con `activeKey`/`onChange` controlados por
 *      useState del padre.
 *   2. <TabPanel activeKey={activeTab}> — envuelve el contenido de la tab
 *      activa (ver TabPanel.tsx) y resuelve la animación de transición ya
 *      afinada. Úsalo siempre en vez de reescribir un motion.div a mano:
 *      evita que la próxima vista repita los mismos ajustes por prueba y
 *      error (ver el docblock de TabPanel para el detalle de cada uno).
 *   3. El ancestro que contiene todo esto necesita una altura REAL
 *      (`height`, no `maxHeight`) si alguna tab usa `<Table fillViewport>`
 *      — fillViewport necesita `h-full`/`flex-1 min-h-0` en cascada desde
 *      un ancestro con altura computable de verdad; con `maxHeight` el
 *      contenedor colapsa a "auto" y la tabla pierde su scroll interno.
 *      No agregues `overflow-y-auto` en ese ancestro "por si acaso": en
 *      ciertos niveles de zoom el contenido calza casi exacto al alto
 *      disponible y el navegador oscila mostrando/ocultando la scrollbar.
 *      Cada tabla ya maneja su propio scroll vía `fillViewport` — dejar
 *      que la columna entera también scrollee duplica el mecanismo y
 *      causa ese parpadeo.
 *
 * Ver InfraestructuraMantenimientoPanel/index.tsx para un ejemplo completo
 * de las 3 piezas juntas (tabs Crear/Tabla/Rechazadas).
 */

import { motion } from "motion/react";
import { springs } from "../../animations";

export interface TabDefinition {
  key: string;
  label: string;
  count?: number;
  /** Punto rojo pulsante — ej. avisar de contenido pendiente en una tab no activa. */
  showDot?: boolean;
}

interface TabsProps {
  tabs: TabDefinition[];
  activeKey: string;
  onChange: (key: string) => void;
  /** Namespace del layoutId compartido — evita colisión si hay múltiples <Tabs> en la misma página. */
  layoutId?: string;
  ariaLabel: string;
  /** Ocupa todo el ancho disponible con tabs más grandes — barra de navegación
   * principal en vez de selector secundario. Por defecto compacto (w-fit). */
  fullWidth?: boolean;
}

export default function Tabs({ tabs, activeKey, onChange, layoutId = "tabs-indicator", ariaLabel, fullWidth = false }: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex gap-1.5 p-1.5 bg-slate-100/60 rounded-2xl ${fullWidth ? "w-full" : "w-fit"}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`relative rounded-xl font-bold transition-colors duration-200 cursor-pointer ${
              fullWidth ? "flex-1 px-5 py-3 text-sm" : "px-4 py-2 text-xs"
            } ${isActive ? "text-sky-700" : "text-slate-500 hover:text-slate-700"}`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/80"
                transition={springs.gentle}
              />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`font-mono rounded-full ${fullWidth ? "text-[11px] px-2 py-0.5" : "text-[10px] px-1.5 py-0.5"} ${
                    isActive ? "bg-sky-50 text-sky-600" : "bg-slate-200/70 text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {tab.showDot && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-danger-500" />
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
