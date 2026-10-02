/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contador de pendientes sobre el ícono de un ítem del sidebar. Se oculta con 0.
 */

interface SidebarCountBadgeProps {
  count: number;
  /** Texto para lectores de pantalla; sin él el número se lee suelto. */
  label?: string;
}

export default function SidebarCountBadge({ count, label }: SidebarCountBadgeProps) {
  if (count <= 0) return null;

  return (
    <span
      aria-label={label}
      className="absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white ring-2 ring-white"
    >
      {count}
    </span>
  );
}
