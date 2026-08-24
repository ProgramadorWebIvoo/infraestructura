/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sub-componentes de presentación puros, compartidos entre
 * TechnicalReviewSection, ReviewWizardModal y RejectProjectModal —
 * extraídos para que cada modal no necesite reimplementar los mismos
 * badges/filas.
 */

import { ShieldCheck, Paperclip } from "lucide-react";
import type { MaterialItem, Project, ProjectDocument } from "../../../types";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";

export const CONDITION_LABEL: Record<MaterialItem["condition"], string> = {
  NUEVO: "Nuevo",
  USADO: "Usado",
  AMBAS: "Nuevo o usado",
};

export const WARRANTY_UNIT_LABEL: Record<NonNullable<MaterialItem["warrantyUnit"]>, string> = {
  DIAS: "días",
  MESES: "meses",
  ANOS: "años",
};

export function ProjectTypeBadge({ type }: { type: Project["type"] }) {
  return (
    <span className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-lg border whitespace-nowrap ${
      type === "INFRAESTRUCTURA" ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-slate-100 text-slate-700 border-slate-200"
    }`}>
      {type === "INFRAESTRUCTURA" ? "INFRA" : "MANT"}
    </span>
  );
}

export function ConditionBadge({ condition }: { condition: MaterialItem["condition"] }) {
  const c = SEMANTIC_COLOR_MAP[condition === "NUEVO" ? "success" : condition === "USADO" ? "warning" : "info"];
  return (
    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${c.bg50} ${c.text700} shrink-0`}>
      {CONDITION_LABEL[condition]}
    </span>
  );
}

export function MaterialDetailRow({ material }: { material: MaterialItem }) {
  const hasExtras = material.brand || material.model || material.warrantyValue || material.specifications || material.observations;

  return (
    <li className="py-2.5 first:pt-0 last:pb-0 border-b border-brand-100/60 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-slate-700">{material.name}</span>
          <ConditionBadge condition={material.condition} />
        </div>
        <span className="font-mono font-bold text-slate-700 shrink-0">{material.quantity} {material.unit}</span>
      </div>
      {hasExtras && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
          {(material.brand || material.model) && (
            <span>
              {material.brand}
              {material.brand && material.model ? " · " : ""}
              {material.model}
            </span>
          )}
          {material.warrantyValue != null && material.warrantyUnit && (
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-success-500" />
              Garantía: {material.warrantyValue} {WARRANTY_UNIT_LABEL[material.warrantyUnit]}
            </span>
          )}
          {material.specifications && <span className="italic">{material.specifications}</span>}
          {material.observations && <span className="italic">{material.observations}</span>}
        </div>
      )}
    </li>
  );
}

export function AttachmentsSummary({ documents }: { documents: ProjectDocument[] }) {
  const counts = {
    FOTO: documents.filter(d => d.documentType === "FOTO").length,
    CALC: documents.filter(d => d.documentType === "CALC").length,
    PLANO: documents.filter(d => d.documentType === "PLANO").length,
  };
  const parts = [
    counts.FOTO > 0 && `${counts.FOTO} foto${counts.FOTO !== 1 ? "s" : ""}`,
    counts.CALC > 0 && `${counts.CALC} cálculo${counts.CALC !== 1 ? "s" : ""}`,
    counts.PLANO > 0 && `${counts.PLANO} plano${counts.PLANO !== 1 ? "s" : ""}`,
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
      <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      {parts.length > 0 ? parts.join(" · ") : "Sin adjuntos"}
    </div>
  );
}
