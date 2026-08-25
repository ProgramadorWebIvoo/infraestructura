import { type ButtonHTMLAttributes, type ReactNode } from "react";
import Spinner from "./Spinner";
import { SEMANTIC_COLOR_MAP, type SemanticColor } from "./colorTokens";

type ColorScheme = "sky" | "emerald" | "purple" | "rose" | "indigo" | "amber" | "violet" | "slate";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  colorScheme?: ColorScheme;
  isLoading?: boolean;
  icon?: ReactNode;
}

/**
 * Vocabulario de color histórico de `colorScheme` mapeado a los 6 roles
 * semánticos de `colorTokens.ts` — mismo criterio que
 * `SectionHeader.COLOR_TO_SEMANTIC`/`Modal.ICON_COLOR_TO_SEMANTIC`.
 */
const COLOR_SCHEME_TO_SEMANTIC: Record<ColorScheme, SemanticColor> = {
  sky: "brand",
  purple: "info",
  indigo: "info",
  violet: "info",
  emerald: "success",
  amber: "warning",
  rose: "danger",
  slate: "neutral",
};

function gradientClasses(role: SemanticColor): string {
  const c = SEMANTIC_COLOR_MAP[role];
  return `bg-gradient-to-r ${c.gradientFrom} ${c.gradientTo} text-white shadow-md ${c.shadow500} ${c.gradientFromHover} ${c.gradientToHover} hover:shadow-lg ${c.shadowHover500}`;
}

function getVariantStyles(variant: string, colorScheme?: ColorScheme): string {
  if (variant === "primary") {
    return gradientClasses(colorScheme ? COLOR_SCHEME_TO_SEMANTIC[colorScheme] : "info");
  }
  if (variant === "danger") {
    // "danger" siempre es rose/danger, sin importar colorScheme — antes era
    // un Record<ColorScheme,...> con el mismo string repetido 8 veces.
    return gradientClasses("danger");
  }
  // secondary
  return "border border-border-default bg-surface text-text-secondary hover:bg-surface-raised hover:shadow-md";
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
      className={`inline-flex items-center gap-2 rounded-control font-bold transition-all ease-out active:scale-[0.94] active:duration-75 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-400/40 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${getVariantStyles(variant, colorScheme)} ${sizeStyles[size]} ${className}`}
      style={{ transitionDuration: "var(--duration-fast)" }}
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
