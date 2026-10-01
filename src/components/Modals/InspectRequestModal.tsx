import { formatCurrency } from "@ivoo/shared";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de inspección de petición de obra — muestra todos los campos
 * del proyecto registrado desde Infraestructura / Mantenimiento.
 */

import { Calendar, DollarSign, FileText, MapPin, Package } from "lucide-react";
import type { Project } from "@/types";
import Modal from "@/components/UI/Modal";
import ProductLinesTable from "@/components/UI/ProductLinesTable";
import StatusBadge from "@/components/UI/StatusBadge";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import BsAmount from "@/components/UI/BsAmount";
import ClosureFollowUp from "@/views/InfraestructuraMantenimientoPanel/components/ClosureFollowUp";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InspectRequestModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function InspectRequestModal({ isOpen, project, onClose }: InspectRequestModalProps) {
  const { convert, hasRates, isLoading: ratesLoading } = useCurrencyConversion();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      badge="Expediente • Petición de Obra"
      title={project?.title ?? ""}
      infoLine={project ? `${project.id} • ${project.type === "INFRAESTRUCTURA" ? "Infraestructura" : "Mantenimiento"}` : undefined}
      maxWidth="max-w-2xl"
      icon={<FileText className="h-5 w-5" />}
      iconColor="sky"
      footer={
        <div className="flex justify-end">
          <button
            id="btn-close-request-inspect"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      }
    >
      {!project ? (
        <p className="text-sm text-slate-400 italic text-center py-8">Proyecto no disponible.</p>
      ) : (
        <div className="space-y-5">

          {/* ── Descripción general ── */}
          <section>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Descripción General
            </h4>
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2.5">
              <p className="text-xs text-slate-700 leading-relaxed">
                {project.description}
              </p>
              <div className="flex flex-wrap gap-3 pt-1.5 border-t border-slate-200/60">
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {project.location}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {project.createdDate}
                </div>
              </div>
            </div>
          </section>

          {/* ── Estado y tipo ── */}
          <section>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-2.5">
              Estado del Flujo
            </h4>
            <div className="flex items-center gap-3">
              <StatusBadge code={project.status} returnInfo={project.returnInfo} />
              <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border ${
                project.type === "INFRAESTRUCTURA"
                  ? "bg-sky-50 text-sky-700 border-sky-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}>
                {project.type === "INFRAESTRUCTURA" ? "INFRAESTRUCTURA" : "MANTENIMIENTO"}
              </span>
            </div>
          </section>

          <ClosureFollowUp project={project} />

          {/* ── Materiales ── */}
          <section>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Materiales Solicitados
              <span className="ml-auto text-[9px] font-mono font-bold text-slate-300">({project.materials.length})</span>
            </h4>
            {project.materials.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Sin materiales registrados.</p>
            ) : (
              <ProductLinesTable
                ariaLabel="Materiales solicitados"
                items={project.materials}
                rowKey={(m, i) => m.id ?? i}
                pageSize={10}
                maxHeight="22rem"
                searchText={(m) => m.name}
                searchPlaceholder="Buscar material…"
                columns={[
                  { key: "name", label: "Material", className: "font-semibold text-slate-800", render: (m) => m.name },
                  { key: "quantity", label: "Cant.", align: "center", className: "font-mono text-slate-600", render: (m) => `${m.quantity} ${m.unit}` },
                  {
                    key: "unitPrice",
                    label: "P. Unit.",
                    align: "right",
                    className: "font-mono text-slate-500",
                    render: (m) => (
                      <>
                        {formatCurrency(m.estimatedUnitPrice)}
                        <BsAmount amount={m.estimatedUnitPrice} convert={convert} hasRates={hasRates} isLoading={ratesLoading} />
                      </>
                    ),
                  },
                  {
                    key: "total",
                    label: "Total",
                    align: "right",
                    className: "font-mono font-bold text-slate-800",
                    render: (m) => (
                      <>
                        {formatCurrency(m.quantity * m.estimatedUnitPrice)}
                        <BsAmount amount={m.quantity * m.estimatedUnitPrice} convert={convert} hasRates={hasRates} isLoading={ratesLoading} />
                      </>
                    ),
                  },
                ]}
                summary={
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <DollarSign className="h-3.5 w-3.5" />
                      Total Estimado
                    </span>
                    <span className="text-right font-mono text-sm font-black text-sky-700">
                      {formatCurrency(project.estimatedTotal)}
                      <BsAmount amount={project.estimatedTotal} convert={convert} hasRates={hasRates} isLoading={ratesLoading} />
                    </span>
                  </div>
                }
              />
            )}
          </section>

        </div>
      )}
    </Modal>
  );
}
