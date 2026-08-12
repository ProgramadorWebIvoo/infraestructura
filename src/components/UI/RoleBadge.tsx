/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Badge compacto del rol activo ("Terminal: {rol}"), reutilizado en la
 * navbar mobile y en el sidebar desktop — antes vivía embebido en la card
 * "Base de datos unificada" de AuthenticatedLayout.
 */

interface RoleBadgeProps {
  role: string;
  /** "dark" para topbars oscuras (mobile), "light" para superficies claras (desktop). */
  variant?: "dark" | "light";
  /** true: solo el nombre del rol, sin el prefijo "Terminal:" — para espacios muy angostos (topbar mobile). */
  compact?: boolean;
  className?: string;
}

export default function RoleBadge({ role, variant = "light", compact = false, className = "" }: RoleBadgeProps) {
  const styles =
    variant === "dark"
      ? "bg-slate-800/60 text-slate-300 border-slate-700/80"
      : "bg-gradient-to-r from-slate-100 to-slate-50 text-slate-600 border-slate-200";

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-3 py-1.5 rounded-full border shadow-xs ${styles} ${className}`}
    >
      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-xs shadow-emerald-500/40 shrink-0" />
      {compact ? role : `Terminal: ${role}`}
    </div>
  );
}
