/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tipos y paleta de color por rol organizacional, compartidos entre
 * ProjectOrganigrama.tsx y WorkflowTimeline.tsx. Los 7 roles del flujo real
 * de una obra (INFRAESTRUCTURA/AUDITORIA/PROCURA/ANALISTA/PRESIDENCIA/
 * FINANZAS/RESIDENTE) no encajan en los 6 valores de SEMANTIC_COLOR_MAP
 * (success/warning/etc.) — son identidad de departamento, no estado — así
 * que usan su propia paleta local en vez de forzar un mapeo con pérdida al
 * esquema semántico (ver colorTokens.ts: la paleta de roles no reemplaza
 * usos puntuales fuera de componentes UI compartidos).
 */

export type RoleId = "INFRAESTRUCTURA" | "PRESIDENCIA" | "AUDITORIA" | "PROCURA" | "ANALISTA" | "FINANZAS" | "RESIDENTE";

export const ROLE_STYLES: Record<RoleId, { accent: string; soft: string; solid: string; text: string }> = {
  INFRAESTRUCTURA: { accent: "text-cyan-600", soft: "bg-cyan-50/80 border-cyan-200", solid: "bg-cyan-600 border-cyan-600", text: "text-cyan-700" },
  PRESIDENCIA: { accent: "text-amber-600", soft: "bg-amber-50/80 border-amber-200", solid: "bg-amber-600 border-amber-600", text: "text-amber-700" },
  AUDITORIA: { accent: "text-blue-600", soft: "bg-blue-50/80 border-blue-200", solid: "bg-blue-600 border-blue-600", text: "text-blue-700" },
  PROCURA: { accent: "text-purple-600", soft: "bg-purple-50/80 border-purple-200", solid: "bg-purple-600 border-purple-600", text: "text-purple-700" },
  ANALISTA: { accent: "text-emerald-600", soft: "bg-emerald-50/80 border-emerald-200", solid: "bg-emerald-600 border-emerald-600", text: "text-emerald-700" },
  FINANZAS: { accent: "text-rose-600", soft: "bg-rose-50/80 border-rose-200", solid: "bg-rose-600 border-rose-600", text: "text-rose-700" },
  RESIDENTE: { accent: "text-teal-600", soft: "bg-teal-50/80 border-teal-200", solid: "bg-teal-600 border-teal-600", text: "text-teal-700" },
};
