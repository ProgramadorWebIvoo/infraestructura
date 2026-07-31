/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Factories de clases compartidas entre SidebarNav y ConfigDropdown.
 * Centralizar aquí evita duplicar los mismos strings en dos componentes.
 */

export const navLinkClass = (activeBg: string, borderColor: string, isCollapsed: boolean) =>
  ({ isActive }: { isActive: boolean }) =>
    `group relative flex items-center rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border-l-2 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60
    ${isCollapsed ? "gap-0 px-0 py-2.5 justify-center" : "gap-3 px-3 py-2.5"}
    ${isActive
        ? `${activeBg} text-white ${borderColor} shadow-md ring-1 ring-inset ring-white/10 font-black`
        : `border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-white ${isCollapsed ? "" : "hover:translate-x-0.5"}`
    }`;

export const sidebarIconClass = (isActive: boolean, activeClass = "!text-white") =>
  `h-[18px] w-[18px] shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:rotate-[3deg] ${
    isActive
      ? `${activeClass} drop-shadow-[0_0_5px_rgba(255,255,255,0.35)]`
      : "text-slate-400 group-hover:text-white"
  }`;

/**
 * Etiqueta del sidebar. `max-width` y `width` se aplican instantáneamente
 * (snap) y solo `opacity` anima: animar max-width con texto recortado
 * (overflow-hidden + nowrap) produce un borde de recorte oscuro que barre el
 * espacio durante el colapso ("línea negra" momentánea). `grow` se usa en el
 * botón de Configuración, donde la etiqueta debe empujar el chevron al borde
 * derecho (flex-1 + sin tope de max-width).
 *
 * Direccionalidad del fade: al expandir la etiqueta entra con `delay-100`
 * (espera a que el ancho del rail abra espacio) y al colapsar sale con
 * `duration-150` y sin delay (desaparece antes de que el ancho cierre).
 * `visibility` (no animada) evita que la etiqueta oculta siga recibiendo
 * foco/clic sin reintroducir el artefacto de recorte.
 */
export const sidebarTextClass = (isCollapsed: boolean, grow = false) =>
  `overflow-hidden whitespace-nowrap transition-opacity ${
    isCollapsed
      ? "max-w-0 opacity-0 invisible duration-150"
      : grow
        ? "max-w-none opacity-100 visible flex-1 duration-300 delay-100"
        : "max-w-40 opacity-100 visible duration-300 delay-100"
  }`;
