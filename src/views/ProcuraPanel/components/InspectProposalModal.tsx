/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vista de solo lectura del detalle completo de una propuesta, para Procura
 * en el cuadro comparativo y para Analistas al revisar el cuadro que están
 * construyendo — el detalle de materiales, historial de renegociación y
 * motivos no cabe en una fila de tabla sin saturarla, así que se abre bajo
 * demanda vía el botón "Inspeccionar" en vez de agregar columnas.
 *
 * Propuestas importadas del portal de proveedores (origen PORTAL-PROV) traen
 * campos adicionales por línea (imagen, condición, garantía, notas) que la
 * carga manual de Analistas no captura — se muestran solo cuando están
 * presentes, sin dejar huecos visuales en propuestas manuales.
 */

import { useEffect, useState } from "react";
import { ArrowRight, Camera, Expand, FileSearch, Loader2, MessageSquareWarning, Package, ShieldCheck } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import SummaryStat from "../../../components/UI/SummaryStat";
import type { Project, Proposal, ProposalMaterialItem } from "../../../types";
import { apiDownload } from "../../../services/api";
import { formatCurrency } from "../../../utils";
import { formatProposalDuration } from "../../AnalistasPanel/components/RegisterProposalModal";

interface InspectProposalModalProps {
  project: Project;
  proposal: Proposal;
  authToken: string;
  onClose: () => void;
}

interface EnrichedProposalMaterialItem extends ProposalMaterialItem {
  estimatedPriceUsd?: number;
  estimatedPriceSource?: string;
  variationPercent?: number;
  variationDirection?: 'increase' | 'decrease' | 'stable';
}

const CONDITION_LABEL: Record<string, string> = {
  new: "Nuevo",
  used: "Usado",
  refurbished: "Reacondicionado",
};

const WARRANTY_UNIT_LABEL: Record<string, string> = {
  dias: "días",
  semanas: "semanas",
  meses: "meses",
};

/** Miniatura de la imagen de un material — requiere auth (Bearer), por lo
 * que no puede ser un <img src> directo: se descarga como blob (mismo patrón
 * que DocumentPreviewModal) y se libera el object URL al desmontar. Un botón
 * de lupa abre la misma imagen ya descargada en grande, sin volver a pedirla. */
function ProposalItemImage({ imagePath, authToken, alt, onExpand }: { imagePath: string; authToken: string; alt: string; onExpand: (blobUrl: string, alt: string) => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setFailed(false);

    (async () => {
      try {
        const blob = await apiDownload(`/supplier-proposal-images/${imagePath.replace(/^supplier-proposal-images\//, "")}`, { token: authToken });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imagePath, authToken]);

  if (failed) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
        <Camera className="h-4 w-4 text-slate-300" />
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50">
        <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onExpand(blobUrl, alt)}
      className="group relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-100"
      aria-label={`Ver imagen de ${alt} en grande`}
    >
      <img src={blobUrl} alt={alt} className="h-full w-full object-cover" />
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
        <Expand className="h-4 w-4 text-white" />
      </span>
    </button>
  );
}

function ItemDetailBadges({ item, authToken, onExpandImage }: { item: EnrichedProposalMaterialItem; authToken: string; onExpandImage: (blobUrl: string, alt: string) => void }) {
  const hasEnrichedData = item.conditionStatus || item.warrantyDescription || item.imagePath;
  if (!hasEnrichedData) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {item.imagePath && <ProposalItemImage imagePath={item.imagePath} authToken={authToken} alt={item.materialName} onExpand={onExpandImage} />}
      <div className="flex flex-wrap items-center gap-1.5">
        {item.conditionStatus && (
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
            {CONDITION_LABEL[item.conditionStatus] ?? item.conditionStatus}
          </span>
        )}
        {item.warrantyDescription && (
          <span className="inline-flex items-center gap-1 rounded-md border border-info-200 bg-info-50 px-1.5 py-0.5 text-[9px] font-bold text-info-700" title={item.warrantyDescription}>
            <ShieldCheck className="h-2.5 w-2.5 shrink-0" />
            {item.warrantyDescription}
            {item.warrantyValue != null && item.warrantyUnit && ` (${item.warrantyValue} ${WARRANTY_UNIT_LABEL[item.warrantyUnit] ?? item.warrantyUnit})`}
          </span>
        )}
      </div>
    </div>
  );
}

export default function InspectProposalModal({ project, proposal, authToken, onClose }: InspectProposalModalProps) {
  const materialItems = (proposal.materialItems ?? []) as EnrichedProposalMaterialItem[];
  const isRenegotiation = proposal.origen === "RENEGOCIACION";
  const currency = proposal.quoteCurrency;
  const [expandedImage, setExpandedImage] = useState<{ blobUrl: string; alt: string } | null>(null);

  return (
    <>
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="max-w-3xl"
      icon={<FileSearch className="h-5 w-5" />}
      iconColor="emerald"
      badge="Detalle de la Propuesta"
      title={`${proposal.contractorName} · ${proposal.contractorCode}`}
      infoLine={`Expediente ${project.id} — oferta ${proposal.id}`}
    >
      <div className="space-y-4">
        {/* Resumen de costos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryStat label="Materiales" value={formatCurrency(proposal.materialCost)} />
          <SummaryStat label="Mano de Obra" value={formatCurrency(proposal.laborCost)} />
          <SummaryStat label="Total" value={formatCurrency(proposal.totalCost)} emphasize />
          <SummaryStat label="Plazo" value={formatProposalDuration(proposal)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SummaryStat label="Anticipo Pactado" value={`${proposal.negotiatedAdvancePercent}%`} />
          <SummaryStat label="Fecha de la Oferta" value={proposal.fechaOferta} />
        </div>

        {currency && currency !== "USD" && (
          <p className="text-[10px] text-slate-400 font-medium">
            El proveedor cotizó esta propuesta en <span className="font-bold text-slate-600">{currency}</span> a través del portal público.
          </p>
        )}

        {/* Historial de renegociación, si aplica */}
        {isRenegotiation && (
          <div className="rounded-lg border border-warning-200 bg-warning-50/50 p-3.5 space-y-2">
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-warning-700 uppercase tracking-wider">
              <ArrowRight className="h-3 w-3" />
              Origen: Renegociación
            </span>
            <div className="grid grid-cols-3 gap-3">
              <SummaryStat label="Precio Anterior" value={proposal.precioAnterior != null ? formatCurrency(proposal.precioAnterior) : "—"} compact />
              <SummaryStat label="Precio Nuevo" value={proposal.precioNuevo != null ? formatCurrency(proposal.precioNuevo) : "—"} compact />
              <SummaryStat
                label="Diferencia"
                value={proposal.diferencia != null ? `${proposal.diferencia > 0 ? "+" : ""}${formatCurrency(proposal.diferencia)}` : "—"}
                compact
                tone={proposal.diferencia != null ? (proposal.diferencia > 0 ? "danger" : "success") : undefined}
              />
            </div>
            {proposal.motivo && (
              <div>
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Motivo de la renegociación</span>
                <p className="text-xs text-slate-700 font-medium">{proposal.motivo}</p>
              </div>
            )}
          </div>
        )}

        {proposal.motivoAnticipoExcedido && (
          <div className="rounded-lg border border-warning-200 bg-warning-50/50 p-3.5">
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-warning-700 uppercase tracking-wider mb-1">
              <MessageSquareWarning className="h-3 w-3" />
              Motivo del exceso de anticipo
            </span>
            <p className="text-xs text-slate-700 font-medium">{proposal.motivoAnticipoExcedido}</p>
          </div>
        )}

        {/* Detalle de materiales cotizados */}
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Detalle de Materiales Cotizados</span>
          </div>
          {materialItems.length === 0 ? (
            <p className="px-3.5 py-4 text-center text-[10px] text-slate-400 italic">Sin detalle línea por línea para esta propuesta.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-100 bg-white text-[8px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2 text-center">Cant.</th>
                    <th className="px-3 py-2">Unidad</th>
                    <th className="px-3 py-2 text-right">Precio unit.</th>
                    <th className="px-3 py-2 text-right">Est.</th>
                    <th className="px-3 py-2 text-center">Var.</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {materialItems.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 align-top">
                        <span className="font-semibold text-slate-700 text-[11px]">{item.materialName}</span>
                        {item.notes && <span className="block text-[9px] text-slate-400 mt-0.5">{item.notes}</span>}
                        <ItemDetailBadges item={item} authToken={authToken} onExpandImage={(blobUrl, alt) => setExpandedImage({ blobUrl, alt })} />
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-slate-600 text-[11px] align-top">{item.quantity}</td>
                      <td className="px-3 py-2 text-slate-500 font-medium text-[11px] align-top">{item.unit}</td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-600 align-top">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-500 align-top">
                        {item.estimatedPriceUsd ? formatCurrency(item.estimatedPriceUsd) : "—"}
                      </td>
                      <td className="px-3 py-2 text-center align-top">
                        {item.variationPercent != null ? (
                          <span
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap ${
                              item.variationDirection === 'increase'
                                ? 'bg-danger-100 text-danger-700'
                                : item.variationDirection === 'decrease'
                                ? 'bg-success-100 text-success-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.variationPercent > 0 ? '+' : ''}{item.variationPercent.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700 text-[11px] align-top">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td colSpan={4} className="px-3 py-2 text-right text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Total materiales:
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs font-black text-emerald-700">{formatCurrency(proposal.materialCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Descripción / alcance */}
        <div>
          <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alcance y Condiciones de la Oferta</span>
          <p className="text-xs text-slate-700 font-medium">{proposal.description || "—"}</p>
        </div>
      </div>
    </Modal>

    {expandedImage && (
      <Modal
        isOpen
        onClose={() => setExpandedImage(null)}
        maxWidth="max-w-2xl"
        icon={<Expand className="h-5 w-5" />}
        iconColor="slate"
        title={expandedImage.alt}
      >
        <img src={expandedImage.blobUrl} alt={expandedImage.alt} className="mx-auto max-h-[70vh] max-w-full rounded-lg object-contain" />
      </Modal>
    )}
    </>
  );
}
