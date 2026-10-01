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
import type { MaterialItem, Project, ProjectDocument } from "@/types";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import ProductLinesTable from "@/components/UI/ProductLinesTable";

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

/** Marca, modelo, garantía, especificaciones y observaciones de un material (solo lo que tenga). */
function MaterialExtras({ material }: { material: MaterialItem }) {
  const hasExtras = material.brand || material.model || material.warrantyValue || material.specifications || material.observations;
  if (!hasExtras) return null;

  return (
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
  );
}

/**
 * Materiales solicitados de una obra, con sus características, en tabla paginada con
 * buscador: la revisión técnica puede recibir ~70 materiales y la lista plana desbordaba
 * el paso del asistente.
 */
export function MaterialsReviewTable({ materials }: { materials: MaterialItem[] }) {
  return (
    <ProductLinesTable
      ariaLabel="Materiales solicitados"
      items={materials}
      rowKey={(m, i) => m.id ?? `${m.name}-${i}`}
      rowAlign="top"
      pageSize={8}
      maxHeight="22rem"
      searchText={(m) => `${m.name} ${m.brand ?? ""} ${m.model ?? ""}`}
      searchPlaceholder="Buscar material…"
      columns={[
        {
          key: "material",
          label: "Material",
          render: (m) => (
            <>
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="font-bold text-slate-700">{m.name}</span>
                <ConditionBadge condition={m.condition} />
              </div>
              <MaterialExtras material={m} />
            </>
          ),
        },
        { key: "quantity", label: "Cantidad", align: "right", className: "whitespace-nowrap font-mono font-bold text-slate-700", render: (m) => `${m.quantity} ${m.unit}` },
      ]}
    />
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
