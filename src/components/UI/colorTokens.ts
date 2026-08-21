/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fuente única de verdad de color semántico para componentes de UI/.
 * Reemplaza gradualmente los mapas de color paralelos que hoy define
 * cada componente por separado (SectionHeader.COLOR_MAP, Modal.ICON_COLORS,
 * Button.primaryGradients/dangerGradients, alertStyles.ALERT_STYLES,
 * el color hardcoded de KpiCard) — ver docs/COMPONENTES_UI.md → "Design
 * Tokens" para la lista de tokens CSS (`--color-*`) definidos en
 * src/index.css que este archivo referencia por nombre de clase Tailwind.
 *
 * Los 6 roles semánticos no reemplazan la paleta de acentos "crudos" de
 * Tailwind (sky, purple, violet, etc.) para usos puntuales fuera de
 * componentes UI — solo son el vocabulario que los componentes
 * compartidos deben consumir para no divergir entre sí.
 */

export type SemanticColor = "brand" | "success" | "danger" | "warning" | "info" | "neutral";

export interface SemanticColorClasses {
  bg50: string;
  bg100: string;
  border100: string;
  /** Borde completo a 200, usado por alertas (AlertBanner/Toast) — más contraste que border100. */
  border200: string;
  /** Borde izquierdo de acento (4px), usado por tarjetas tipo KpiCard/ConfigDropdown. */
  borderL400: string;
  borderL500: string;
  text600: string;
  text700: string;
  icon400: string;
  icon500: string;
  /** Fondo translúcido a 400/20%, para chips de ícono sobre superficies oscuras (ej. header de Modal). */
  bgAlpha400: string;
  gradientFrom: string;
  gradientTo: string;
  /** Variantes hover del gradiente (Button variant="primary"/"danger"), un tono más oscuro que gradientFrom/To. */
  gradientFromHover: string;
  gradientToHover: string;
  /** Sombra de color a 500/20%, acompaña el gradiente de Button. */
  shadow500: string;
  shadowHover500: string;
}

/** Clases de foco (borde+ring) por rol — fuente única para NumericInput/TextField, evita copias divergentes. */
export const FOCUS_RING_CLASSES: Record<SemanticColor, string> = {
  brand: "focus:border-brand-400 focus:ring-brand-100",
  success: "focus:border-success-400 focus:ring-success-100",
  danger: "focus:border-danger-400 focus:ring-danger-100",
  warning: "focus:border-warning-400 focus:ring-warning-100",
  info: "focus:border-info-400 focus:ring-info-100",
  neutral: "focus:border-neutral-400 focus:ring-neutral-100",
};

export const SEMANTIC_COLOR_MAP: Record<SemanticColor, SemanticColorClasses> = {
  brand: {
    bg50: "bg-brand-50",
    bg100: "bg-brand-100",
    border100: "border-brand-100",
    border200: "border-brand-200",
    borderL400: "border-l-brand-400",
    borderL500: "border-l-brand-500",
    text600: "text-brand-600",
    text700: "text-brand-700",
    icon400: "text-brand-400",
    icon500: "text-brand-500",
    bgAlpha400: "bg-brand-400/20",
    gradientFrom: "from-brand-500",
    gradientTo: "to-brand-600",
    gradientFromHover: "hover:from-brand-600",
    gradientToHover: "hover:to-brand-700",
    shadow500: "shadow-brand-500/20",
    shadowHover500: "hover:shadow-brand-500/30",
  },
  success: {
    bg50: "bg-success-50",
    bg100: "bg-success-100",
    border100: "border-success-100",
    border200: "border-success-200",
    borderL400: "border-l-success-400",
    borderL500: "border-l-success-500",
    text600: "text-success-600",
    text700: "text-success-700",
    icon400: "text-success-400",
    icon500: "text-success-500",
    bgAlpha400: "bg-success-400/20",
    gradientFrom: "from-success-500",
    gradientTo: "to-success-600",
    gradientFromHover: "hover:from-success-600",
    gradientToHover: "hover:to-success-700",
    shadow500: "shadow-success-500/20",
    shadowHover500: "hover:shadow-success-500/30",
  },
  danger: {
    bg50: "bg-danger-50",
    bg100: "bg-danger-100",
    border100: "border-danger-100",
    border200: "border-danger-200",
    borderL400: "border-l-danger-400",
    borderL500: "border-l-danger-500",
    text600: "text-danger-600",
    text700: "text-danger-700",
    icon400: "text-danger-400",
    icon500: "text-danger-500",
    bgAlpha400: "bg-danger-400/20",
    gradientFrom: "from-danger-500",
    gradientTo: "to-danger-600",
    gradientFromHover: "hover:from-danger-600",
    gradientToHover: "hover:to-danger-700",
    shadow500: "shadow-danger-500/20",
    shadowHover500: "hover:shadow-danger-500/30",
  },
  warning: {
    bg50: "bg-warning-50",
    bg100: "bg-warning-100",
    border100: "border-warning-100",
    border200: "border-warning-200",
    borderL400: "border-l-warning-400",
    borderL500: "border-l-warning-500",
    text600: "text-warning-600",
    text700: "text-warning-700",
    icon400: "text-warning-400",
    icon500: "text-warning-500",
    bgAlpha400: "bg-warning-400/20",
    gradientFrom: "from-warning-500",
    gradientTo: "to-warning-600",
    gradientFromHover: "hover:from-warning-600",
    gradientToHover: "hover:to-warning-700",
    shadow500: "shadow-warning-500/20",
    shadowHover500: "hover:shadow-warning-500/30",
  },
  info: {
    bg50: "bg-info-50",
    bg100: "bg-info-100",
    border100: "border-info-100",
    border200: "border-info-200",
    borderL400: "border-l-info-400",
    borderL500: "border-l-info-500",
    text600: "text-info-600",
    text700: "text-info-700",
    icon400: "text-info-400",
    icon500: "text-info-500",
    bgAlpha400: "bg-info-400/20",
    gradientFrom: "from-info-500",
    gradientTo: "to-info-600",
    gradientFromHover: "hover:from-info-600",
    gradientToHover: "hover:to-info-700",
    shadow500: "shadow-info-500/20",
    shadowHover500: "hover:shadow-info-500/30",
  },
  neutral: {
    bg50: "bg-neutral-50",
    bg100: "bg-neutral-100",
    border100: "border-neutral-100",
    border200: "border-neutral-200",
    borderL400: "border-l-neutral-400",
    borderL500: "border-l-neutral-500",
    text600: "text-neutral-600",
    text700: "text-neutral-700",
    icon400: "text-neutral-400",
    icon500: "text-neutral-500",
    bgAlpha400: "bg-neutral-400/20",
    gradientFrom: "from-neutral-500",
    gradientTo: "to-neutral-600",
    gradientFromHover: "hover:from-neutral-600",
    gradientToHover: "hover:to-neutral-700",
    shadow500: "shadow-neutral-500/20",
    shadowHover500: "hover:shadow-neutral-500/30",
  },
};
