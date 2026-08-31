/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de inspección de petición de obra — muestra todos los campos
 * del proyecto registrado desde Infraestructura / Mantenimiento.
 */

import { Calendar, DollarSign, FileText, MapPin, Package } from "lucide-react";
import type { Project } from "../../types";
import Modal from "../UI/Modal";
import StatusBadge from "../UI/StatusBadge";
import { formatCurrency } from "../../utils";
import { useCurrencyConversion } from "../../hooks/useCurrencyConversion";
import BsAmount from "../UI/BsAmount";

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
              <StatusBadge code={project.status} />
              <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border ${
                project.type === "INFRAESTRUCTURA"
                  ? "bg-sky-50 text-sky-700 border-sky-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}>
                {project.type === "INFRAESTRUCTURA" ? "INFRAESTRUCTURA" : "MANTENIMIENTO"}
              </span>
            </div>
          </section>

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
              <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100/60 text-slate-500 font-bold text-[9px] uppercase tracking-wider">
                      <th className="py-2 px-3 text-left">Material</th>
                      <th className="py-2 px-3 text-center">Cant.</th>
                      <th className="py-2 px-3 text-right">P. Unit.</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.materials.map((m) => (
                      <tr key={m.id} className="bg-white">
                        <td className="py-2 px-3 font-semibold text-slate-800">{m.name}</td>
                        <td className="py-2 px-3 text-center font-mono text-slate-600">{m.quantity} {m.unit}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                          {formatCurrency(m.estimatedUnitPrice)}
                          <BsAmount amount={m.estimatedUnitPrice} convert={convert} hasRates={hasRates} isLoading={ratesLoading} />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                          {formatCurrency(m.quantity * m.estimatedUnitPrice)}
                          <BsAmount amount={m.quantity * m.estimatedUnitPrice} convert={convert} hasRates={hasRates} isLoading={ratesLoading} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50">
                      <td colSpan={3} className="py-2.5 px-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <span className="flex items-center justify-end gap-1.5">
                          <DollarSign className="h-3.5 w-3.5" />
                          Total Estimado
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-sky-700 text-sm">
                        {formatCurrency(project.estimatedTotal)}
                        <BsAmount amount={project.estimatedTotal} convert={convert} hasRates={hasRates} isLoading={ratesLoading} />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

        </div>
      )}
    </Modal>
  );
}
