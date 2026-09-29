/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Selector de pestañas con panel controlado por el consumidor — distinto de
 * SegmentedControl (selector visual sin indicador deslizante ni semántica
 * de tablist/tabpanel).
 *
 * El indicador de tab activa NO usa `layoutId` de Motion (aunque sea la
 * forma "obvia" de resolver este patrón): `layoutId` hace FLIP en base al
 * bounding rect real en viewport, y ese rect se ve afectado por cosas que no
 * son "la tab se movió" — el ejemplo real que forzó este cambio es un
 * <Tabs> dentro del body scrolleable de <Modal>: al cambiar de tab a un
 * panel de otro alto, Motion computaba una traslación vertical grande y
 * espuria (cientos de px) sin que el botón activo se hubiera movido un solo
 * píxel en pantalla — el indicador se despegaba de su fila y "viajaba"
 * verticalmente antes de asentarse. Ni `layoutScroll` en el ancestro
 * scrolleable ni forzar `translateY(0)` vía `transformTemplate` lo evitan:
 * la proyección de layout de Motion escribe el transform del FLIP
 * directamente, por fuera de ese pipeline declarativo.
 *
 * La alternativa robusta: medir nosotros mismos la caja del botón activo
 * relativa al contenedor (no al viewport, así el scroll nunca entra en la
 * cuenta) y animar un único indicador con `x`/`width` explícitos. `top` y
 * `height` se fijan sin animar — todas las tabs de una fila comparten
 * alto, así que no hace falta interpolarlos, y evita que cualquier eje Y
 * se anime jamás, sea cual sea la causa.
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

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { springs } from "@/animations";
import Tooltip from "./Tooltip";

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
  ariaLabel: string;
  /** Ocupa todo el ancho disponible con tabs más grandes — barra de navegación
   * principal en vez de selector secundario. Por defecto compacto (w-fit). */
  fullWidth?: boolean;
}

interface TabButtonProps {
  tab: TabDefinition;
  isActive: boolean;
  onClick: () => void;
  fullWidth: boolean;
  buttonRef: (el: HTMLButtonElement | null) => void;
}

/**
 * Componente propio (no inline en el `.map()` de Tabs) porque necesita su
 * propio hook de truncamiento por instancia — llamar hooks dentro de un
 * callback de `.map()` es válido en React solo si la cantidad de iteraciones
 * nunca cambia entre renders, y acá `tabs` sí puede cambiar (tabs que
 * aparecen/desaparecen según rol/permisos).
 */
function TabButton({ tab, isActive, onClick, fullWidth, buttonRef }: TabButtonProps) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  // El tooltip solo debe aparecer si el texto realmente está cortado por
  // `truncate` (scrollWidth > clientWidth) — mostrarlo siempre sería
  // redundante (repite lo que ya se lee en pantalla) para cualquier tab que
  // sí entra completa. ResizeObserver en vez de un solo chequeo al montar:
  // el ancho de cada tab cambia con el viewport (fullWidth es flex-1) y con
  // cuántas tabs hay en total, así que el mismo label puede pasar de
  // truncado a completo (o viceversa) sin que el componente se remonte.
  useEffect(() => {
    const el = labelRef.current;
    if (!el) return;
    const check = () => setIsTruncated(el.scrollWidth > el.clientWidth);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [tab.label]);

  return (
    <Tooltip content={tab.label} placement="bottom" delay={300} disabled={!isTruncated}>
      <button
        ref={buttonRef}
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={onClick}
        className={`relative rounded-xl font-bold transition-colors duration-200 cursor-pointer min-w-0 ${
          fullWidth ? "flex-1 px-5 py-3 text-sm" : "px-4 py-2 text-xs"
        } ${isActive ? "text-sky-700" : "text-slate-500 hover:text-slate-700"}`}
      >
        <span className="relative flex items-center justify-center gap-2 min-w-0">
          <span ref={labelRef} className="truncate">{tab.label}</span>
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
    </Tooltip>
  );
}

interface IndicatorRect {
  x: number;
  width: number;
  top: number;
  height: number;
}

export default function Tabs({ tabs, activeKey, onChange, ariaLabel, fullWidth = false }: TabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const [rect, setRect] = useState<IndicatorRect | null>(null);

  // Mide la caja del botón activo relativa al contenedor (offsetLeft/Top,
  // no getBoundingClientRect) — offsetLeft/Top ya son relativos al
  // offsetParent, así que un scroll ancestro (p.ej. el body de un Modal)
  // nunca se cuela en la cuenta, a diferencia de coordenadas de viewport.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const activeButton = buttonRefs.current.get(activeKey);
    if (!container || !activeButton) return;

    const measure = () => {
      setRect({
        x: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
        top: activeButton.offsetTop,
        height: activeButton.offsetHeight,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    tabs.forEach((tab) => {
      const el = buttonRefs.current.get(tab.key);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [activeKey, tabs, fullWidth]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`relative flex gap-1.5 p-1.5 bg-slate-100/60 rounded-2xl ${fullWidth ? "w-full" : "w-fit"}`}
    >
      {rect && (
        <motion.div
          className="absolute bg-white rounded-xl shadow-sm border border-slate-200/80 pointer-events-none"
          style={{ top: rect.top, height: rect.height }}
          animate={{ x: rect.x, width: rect.width }}
          initial={false}
          transition={springs.gentle}
        />
      )}
      {tabs.map((tab) => (
        <TabButton
          key={tab.key}
          tab={tab}
          isActive={tab.key === activeKey}
          onClick={() => onChange(tab.key)}
          fullWidth={fullWidth}
          buttonRef={(el) => {
            if (el) buttonRefs.current.set(tab.key, el);
            else buttonRefs.current.delete(tab.key);
          }}
        />
      ))}
    </div>
  );
}
