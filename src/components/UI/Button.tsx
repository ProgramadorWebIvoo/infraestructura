import { type ButtonHTMLAttributes, type ReactNode } from "react";
import Spinner from "./Spinner";

type ColorScheme = "sky" | "emerald" | "purple" | "rose" | "indigo" | "amber" | "violet" | "slate";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  colorScheme?: ColorScheme;
  isLoading?: boolean;
  icon?: ReactNode;
}

// ── Primary & danger gradient definitions per color scheme ─────────────
const primaryGradients: Record<ColorScheme, string> = {
  sky:     "bg-gradient-to-r from-sky-600 to-sky-500 text-white shadow-md shadow-sky-500/20 hover:from-sky-700 hover:to-sky-600 hover:shadow-lg hover:shadow-sky-500/30",
  emerald: "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:from-emerald-700 hover:to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30",
  purple:  "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md shadow-purple-500/20 hover:from-purple-700 hover:to-purple-600 hover:shadow-lg hover:shadow-purple-500/30",
  rose:    "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/20 hover:from-rose-600 hover:to-rose-700 hover:shadow-lg hover:shadow-rose-500/30",
  indigo:  "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30",
  amber:   "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700 hover:shadow-lg hover:shadow-amber-500/30",
  violet:  "bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md shadow-violet-500/20 hover:from-violet-700 hover:to-violet-600 hover:shadow-lg hover:shadow-violet-500/30",
  slate:   "bg-gradient-to-r from-slate-600 to-slate-500 text-white shadow-md shadow-slate-500/20 hover:from-slate-700 hover:to-slate-600 hover:shadow-lg hover:shadow-slate-500/30",
};

const dangerGradients: Record<ColorScheme, string> = {
  sky:     "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/20 hover:from-rose-600 hover:to-rose-700 hover:shadow-lg hover:shadow-rose-500/30",
  emerald: "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/20 hover:from-rose-600 hover:to-rose-700 hover:shadow-lg hover:shadow-rose-500/30",
  purple:  "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/20 hover:from-rose-600 hover:to-rose-700 hover:shadow-lg hover:shadow-rose-500/30",
  rose:    "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/20 hover:from-rose-600 hover:to-rose-700 hover:shadow-lg hover:shadow-rose-500/30",
  indigo:  "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/20 hover:from-rose-600 hover:to-rose-700 hover:shadow-lg hover:shadow-rose-500/30",
  amber:   "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/20 hover:from-rose-600 hover:to-rose-700 hover:shadow-lg hover:shadow-rose-500/30",
  violet:  "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/20 hover:from-rose-600 hover:to-rose-700 hover:shadow-lg hover:shadow-rose-500/30",
  slate:   "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/20 hover:from-rose-600 hover:to-rose-700 hover:shadow-lg hover:shadow-rose-500/30",
};

function getVariantStyles(variant: string, colorScheme?: ColorScheme): string {
  if (variant === "primary") {
    return colorScheme ? primaryGradients[colorScheme] : primaryGradients.indigo;
  }
  if (variant === "danger") {
    return colorScheme ? dangerGradients[colorScheme] : dangerGradients.rose;
  }
  // secondary
  return "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:shadow-md";
}

const sizeStyles: Record<string, string> = {
  sm: "px-3 py-1.5 text-[11px]",
  md: "px-4 py-2 text-xs",
};

export default function Button({
  variant = "secondary",
  size = "md",
  colorScheme,
  isLoading = false,
  icon,
  children,
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center gap-2 rounded-xl font-bold transition-all duration-200 active:scale-[0.97] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-400/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${getVariantStyles(variant, colorScheme)} ${sizeStyles[size]} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <>
          <Spinner size="sm" aria-hidden />
          {children}
        </>
      ) : (
        <>
          {icon && <span aria-hidden>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
