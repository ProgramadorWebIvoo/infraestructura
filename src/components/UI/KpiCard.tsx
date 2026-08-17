import { type ReactNode } from "react";
import { Search } from "lucide-react";
import { SEMANTIC_COLOR_MAP } from "./colorTokens";

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value?: string;
  sub?: string;
  children?: ReactNode;
  variant?: "light" | "dark";
  accent?: string;
  borderAccent?: string;
  /** @deprecated use borderAccent */
  color?: string;
  /** Callback opcional: si se provee, muestra un botón de inspección al hover */
  onInspect?: () => void;
}

export default function KpiCard({
  icon,
  label,
  value,
  sub,
  children,
  variant = "light",
  accent,
  borderAccent,
  color,
  onInspect,
}: KpiCardProps) {
  const dark = variant === "dark";
  const brand = SEMANTIC_COLOR_MAP.brand;
  const borderColor = borderAccent ?? color ?? (dark ? brand.borderL500 : brand.borderL400);
  const iconColor = accent ?? (dark ? brand.icon400 : "text-text-secondary");

  return (
    <div
      className={`relative group/card rounded-container p-5 border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
        dark
          ? "bg-surface-inverted text-text-inverted border-border-inverted"
          : "bg-surface border-border-default/80"
      } border-l-4 ${borderColor}`}
    >
      {onInspect && (
        <button
          type="button"
          aria-label={`Ver detalle de ${label}`}
          onClick={onInspect}
          className={`cursor-pointer absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 transition-opacity duration-200 ${
            dark
              ? "text-text-muted hover:text-text-inverted hover:bg-border-inverted"
              : "text-text-muted hover:text-text-secondary hover:bg-surface-raised"
          }`}
        >
          <Search className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={
              dark
                ? "p-2 rounded-xl bg-sky-500/10"
                : "p-2 rounded-xl bg-gradient-to-br from-surface to-surface-sunken shadow-xs ring-1 ring-border-default/60"
            }
          >
            <span className={iconColor}>{icon}</span>
          </div>
          <span
            className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
              dark ? "text-text-muted" : "text-text-tertiary"
            }`}
          >
            {label}
          </span>
        </div>
      </div>
      <div className="mt-3">
        {children ?? (
          <>
            {value !== undefined && (
              <p className="text-lg font-black text-text-primary">{value}</p>
            )}
            {/* Reserva la altura de la línea `sub` aunque no se pase — así
             * las KpiCard de una misma grilla no quedan de distinta altura
             * cuando algunas traen `sub` y otras no. */}
            <p className="text-[11px] font-medium text-text-muted min-h-[1em]">{sub ?? " "}</p>
          </>
        )}
      </div>
    </div>
  );
}
