/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Selector de secciones verticalmente agrupado — para paneles con demasiadas
 * opciones para caber en una fila de <Tabs> (ver ConfigAppPanel). A
 * diferencia de Tabs (fila horizontal, un solo nivel), SectionNav acumula
 * indefinidamente porque crece hacia abajo, no hacia los lados, y agrupa
 * los ítems relacionados bajo un encabezado — el usuario escanea por
 * categoría en vez de leer una tira larga de pills.
 *
 * En pantallas angostas (< lg) se degrada a una fila horizontal scrolleable
 * y sin agrupar (mismo criterio de "todo cabe, nada se corta" que Tabs),
 * porque una columna vertical angosta no alcanza a mostrar el label completo
 * y forzar el layout vertical ahí se come el ancho del contenido.
 *
 * El indicador de sección activa usa layoutId de Motion (mismo mecanismo que
 * Tabs) — se desliza fluidamente entre ítems al cambiar de sección, cruzando
 * grupos sin problema porque layoutId no le importa el DOM parent, solo la
 * identidad compartida entre renders.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { springs } from "@/animations";
import Tooltip from "./Tooltip";

export interface SectionNavItem {
  key: string;
  label: string;
  /** Encabezado de grupo bajo el que aparece — ítems consecutivos con el
   * mismo group se renderizan juntos; el orden de aparición del primer
   * ítem de cada group define el orden de los encabezados. */
  group: string;
  icon?: ReactNode;
  /** Punto rojo pulsante — ej. avisar de contenido pendiente en una sección no activa. */
  showDot?: boolean;
}

interface SectionNavProps {
  items: SectionNavItem[];
  activeKey: string;
  onChange: (key: string) => void;
  ariaLabel: string;
  /** Namespace del layoutId compartido — evita colisión si hay múltiples <SectionNav> en la misma página. */
  layoutId?: string;
}

/**
 * Agrupa por `group` preservando el orden de PRIMERA aparición de cada
 * grupo — no asume que los ítems de un mismo grupo vengan contiguos en
 * `items` (el orden real de MACRO_GROUPS/EXTRA_TABS en ConfigAppPanel no lo
 * garantiza), así que agregar un ítem nuevo a un grupo existente en
 * cualquier posición del array sigue agrupando bien.
 */
function groupItems(items: SectionNavItem[]): { group: string; items: SectionNavItem[] }[] {
  const order: string[] = [];
  const byGroup = new Map<string, SectionNavItem[]>();
  for (const item of items) {
    if (!byGroup.has(item.group)) {
      byGroup.set(item.group, []);
      order.push(item.group);
    }
    byGroup.get(item.group)!.push(item);
  }
  return order.map((group) => ({ group, items: byGroup.get(group)! }));
}

interface NavButtonProps {
  item: SectionNavItem;
  isActive: boolean;
  onClick: () => void;
  layoutId: string;
}

/** Componente propio (no inline en `.map()`) por el mismo motivo que Tabs.tsx:
 * el hook de truncamiento necesita una instancia estable por ítem. Un solo
 * botón por ítem (no uno por breakpoint) — la orientación vertical/horizontal
 * la resuelve CSS puro (`display: contents` en los envoltorios de grupo, ver
 * SectionNav), así los tests que consultan por rol/nombre no encuentran
 * duplicados como pasaría si hubiera dos <nav> paralelos en el DOM. */
function NavButton({ item, isActive, onClick, layoutId }: NavButtonProps) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = labelRef.current;
    if (!el) return;
    const check = () => setIsTruncated(el.scrollWidth > el.clientWidth);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [item.label]);

  return (
    <Tooltip content={item.label} placement="bottom" delay={300} disabled={!isTruncated}>
      <button
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={onClick}
        className={`relative rounded-xl font-bold transition-colors duration-200 cursor-pointer min-w-0 flex items-center gap-2.5 shrink-0 px-4 py-2.5 text-xs lg:w-full lg:px-3 lg:py-2.5 lg:text-left ${
          isActive ? "text-sky-700" : "text-slate-500 hover:text-slate-700"
        }`}
      >
        {isActive && (
          <motion.div
            layoutId={layoutId}
            className="absolute inset-0 bg-sky-50 rounded-xl border border-sky-100"
            transition={springs.gentle}
          />
        )}
        <span className="relative flex items-center gap-2.5 min-w-0">
          {item.icon && <span className={`shrink-0 ${isActive ? "text-sky-600" : "text-slate-400"}`}>{item.icon}</span>}
          <span ref={labelRef} className="truncate">{item.label}</span>
          {item.showDot && (
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

export default function SectionNav({ items, activeKey, onChange, ariaLabel, layoutId = "section-nav-indicator" }: SectionNavProps) {
  const grouped = groupItems(items);

  return (
    <nav
      role="tablist"
      aria-label={ariaLabel}
      className="flex flex-row lg:flex-col gap-1.5 lg:gap-4 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0 sidebar-scrollbar lg:w-56 lg:shrink-0"
    >
      {grouped.map(({ group, items: groupItemsList }) => (
        // `contents` en mobile: el wrapper de grupo no aporta su propia caja
        // (el header queda oculto y los botones fluyen directo en la fila
        // horizontal del <nav>) — a partir de lg pasa a `block` y recupera
        // su columna propia con encabezado, formando el agrupamiento vertical.
        <div key={group} className="contents lg:block">
          <p className="hidden lg:block px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{group}</p>
          <div className="contents lg:block lg:space-y-0.5">
            {groupItemsList.map((item) => (
              <NavButton
                key={item.key}
                item={item}
                isActive={item.key === activeKey}
                onClick={() => onChange(item.key)}
                layoutId={layoutId}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
