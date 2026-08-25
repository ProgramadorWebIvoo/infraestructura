/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tipos y paleta de color por rol organizacional, compartidos entre
 * ProjectOrganigrama.tsx y WorkflowTimeline.tsx. Los 5 roles fijos del
 * organigrama IVOO (PRESIDENCIA/CIERRE_DE_OBRA/PROCURA/ANALISTA/FINANZAS)
 * no encajan en los 6 valores de SEMANTIC_COLOR_MAP (success/warning/etc.)
 * — son identidad de departamento, no estado — así que usan su propia
 * paleta local en vez de forzar un mapeo con pérdida al esquema semántico
 * (ver colorTokens.ts: la paleta de 6 roles no reemplaza usos puntuales
 * fuera de componentes UI compartidos).
 */

export type RoleId = "PRESIDENCIA" | "CIERRE_DE_OBRA" | "PROCURA" | "ANALISTA" | "FINANZAS";

export const ROLE_STYLES: Record<RoleId, { accent: string; soft: string; solid: string; text: string }> = {
  PRESIDENCIA: { accent: "text-amber-600", soft: "bg-amber-50/80 border-amber-200", solid: "bg-amber-600 border-amber-600", text: "text-amber-700" },
  CIERRE_DE_OBRA: { accent: "text-blue-600", soft: "bg-blue-50/80 border-blue-200", solid: "bg-blue-600 border-blue-600", text: "text-blue-700" },
  PROCURA: { accent: "text-purple-600", soft: "bg-purple-50/80 border-purple-200", solid: "bg-purple-600 border-purple-600", text: "text-purple-700" },
  ANALISTA: { accent: "text-emerald-600", soft: "bg-emerald-50/80 border-emerald-200", solid: "bg-emerald-600 border-emerald-600", text: "text-emerald-700" },
  FINANZAS: { accent: "text-rose-600", soft: "bg-rose-50/80 border-rose-200", solid: "bg-rose-600 border-rose-600", text: "text-rose-700" },
};
