import { type ButtonHTMLAttributes, type ReactNode } from "react";
import Spinner from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  isLoading?: boolean;
  icon?: ReactNode;
}

const variantStyles: Record<string, string> = {
  primary:
    "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30",
  secondary:
    "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:shadow-md",
  danger:
    "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/20 hover:from-rose-600 hover:to-rose-700 hover:shadow-lg hover:shadow-rose-500/30",
};

const sizeStyles: Record<string, string> = {
  sm: "px-3 py-1.5 text-[10px]",
  md: "px-4 py-2 text-xs",
};

export default function Button({
  variant = "secondary",
  size = "md",
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
      className={`inline-flex items-center gap-2 rounded-xl font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
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
