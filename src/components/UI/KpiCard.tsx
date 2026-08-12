import { type ReactNode } from "react";
import { Search } from "lucide-react";

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
  const borderColor = borderAccent ?? color ?? (dark ? "border-l-sky-500" : "border-l-sky-400");
  const iconColor = accent ?? (dark ? "text-sky-400" : "text-slate-600");

  return (
    <div
      className={`relative group/card rounded-2xl p-5 border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
        dark
          ? "bg-slate-900 text-white border-slate-800"
          : "bg-white border-slate-200/80"
      } border-l-4 ${borderColor}`}
    >
      {onInspect && (
        <button
          type="button"
          aria-label={`Ver detalle de ${label}`}
          onClick={onInspect}
          className={`cursor-pointer absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 transition-opacity duration-200 ${
            dark
              ? "text-slate-400 hover:text-white hover:bg-slate-800"
              : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
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
                : "p-2 rounded-xl bg-gradient-to-br from-white to-slate-50 shadow-xs ring-1 ring-slate-200/60"
            }
          >
            <span className={iconColor}>{icon}</span>
          </div>
          <span
            className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
              dark ? "text-slate-400" : "text-slate-500"
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
              <p className="text-lg font-black text-slate-900">{value}</p>
            )}
            {sub !== undefined && (
              <p className="text-[11px] font-medium text-slate-400">{sub}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
