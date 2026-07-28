/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lista colapsable de propuestas de materiales de proveedores — extraída
 * de ProveedoresRegistrados.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronUp, Clock, HandCoins, Loader2, Mail, Package, Search } from "lucide-react";
import { itemVariants } from "../../animations";
import { Table } from "../../components/UI/Table";
import type { SupplierMaterialProposal } from "../../types";

interface SupplierProposalsListProps {
  proposals: SupplierMaterialProposal[];
  isLoading: boolean;
}

const proposalTotal = (p: SupplierMaterialProposal) =>
  p.items.reduce((sum, i) => sum + i.totalPrice, 0);

export default function SupplierProposalsList({ proposals, isLoading }: SupplierProposalsListProps) {
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  const [proposalSearch, setProposalSearch] = useState("");

  const filteredProposals = useMemo(
    () =>
      proposals.filter(
        (p) =>
          p.supplierName.toLowerCase().includes(proposalSearch.toLowerCase()) ||
          (p.supplierCompany ?? "").toLowerCase().includes(proposalSearch.toLowerCase()) ||
          p.projectTitleSnapshot.toLowerCase().includes(proposalSearch.toLowerCase()) ||
          p.id.toLowerCase().includes(proposalSearch.toLowerCase())
      ),
    [proposals, proposalSearch],
  );

  return (
    <motion.div variants={itemVariants} className="overflow-hidden rounded-2xl border border-slate-200/80 border-l-4 border-l-indigo-400 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Package className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Propuestas de materiales recibidas</h3>
            <p className="text-[11px] font-medium text-slate-500">
              Cotizaciones enviadas por proveedores desde el portal publico.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por proveedor u obra..."
              value={proposalSearch}
              onChange={(e) => setProposalSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="shrink-0 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-2.5 text-xs font-bold text-slate-600">
            Total: <span className="text-slate-950">{proposals.length}</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando propuestas...
        </div>
      ) : (
        <div className="divide-y divide-slate-100 grid grid-cols-1 pr-2 scroll-smooth overflow-y-auto max-h-115">
          {filteredProposals.length === 0 ? (
            <p className="py-12 text-center text-sm font-medium italic text-slate-400">
              {proposals.length === 0
                ? "Aun no se han recibido propuestas de materiales."
                : "No se encontraron propuestas con ese criterio."}
            </p>
          ) : (
            filteredProposals.map((proposal) => {
              const isExpanded = expandedProposal === proposal.id;
              const total = proposalTotal(proposal);
              return (
                <div key={proposal.id} className="transition hover:bg-slate-50/40">
                  <button
                    type="button"
                    onClick={() => setExpandedProposal(isExpanded ? null : proposal.id)}
                    className="w-full text-left px-5 py-4"
                    aria-expanded={isExpanded}
                    aria-controls={`proposal-detail-${proposal.id}`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100/50 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-600">
                        {proposal.id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-xs font-black text-slate-800">{proposal.supplierName}</span>
                          {proposal.supplierCompany && (
                            <span className="text-[11px] font-semibold text-slate-500">{proposal.supplierCompany}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-0.5 text-[11px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {proposal.supplierContact}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="truncate max-w-xs">{proposal.projectTitleSnapshot}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-[10px] font-bold uppercase text-slate-400">Total oferta</div>
                          <div className="font-mono text-sm font-black text-indigo-700">
                            ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <div className="text-[10px] font-bold uppercase text-slate-400">Materiales</div>
                          <div className="font-mono text-xs font-black text-slate-600">{proposal.items.length}</div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <div className="text-[10px] font-bold uppercase text-slate-400">Fecha</div>
                          <div className="text-[11px] font-semibold text-slate-500">{proposal.submittedAt}</div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                    <motion.div
                      id={`proposal-detail-${proposal.id}`}
                      key={`proposal-${proposal.id}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                    <div className="px-5 pb-5 space-y-3">
                      <div className="rounded-xl bg-gradient-to-br from-indigo-50/40 to-white border border-indigo-100/60 p-3 text-xs">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <div className="text-[10px] font-bold uppercase text-indigo-500">Obra</div>
                            <div className="font-semibold text-slate-700 mt-0.5">{proposal.projectTitleSnapshot}</div>
                            <div className="font-mono text-[10px] text-indigo-600">{proposal.projectId}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase text-indigo-500">Proveedor</div>
                            <div className="font-semibold text-slate-700 mt-0.5">{proposal.supplierName}</div>
                            {proposal.supplierCompany && (
                              <div className="text-[11px] text-slate-500">{proposal.supplierCompany}</div>
                            )}
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase text-indigo-500">Contacto</div>
                            <div className="font-semibold text-slate-700 mt-0.5 flex items-center gap-1">
                              <Mail className="h-3 w-3 text-slate-400" />
                              {proposal.supplierContact}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase text-indigo-500">Enviado</div>
                            <div className="font-semibold text-slate-700 mt-0.5">{proposal.submittedAt}</div>
                          </div>
                        </div>
                        {(proposal.estimatedDays != null || proposal.advancePercent != null) && (
                          <div className="mt-3 pt-3 border-t border-indigo-100 flex flex-wrap items-center gap-x-6 gap-y-2">
                            {proposal.estimatedDays != null && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                <div className="text-[10px] font-bold uppercase text-indigo-500">Tiempo estimado:</div>
                                <div className="font-black text-slate-700 text-xs">
                                  {proposal.estimatedDays} {proposal.durationUnit ?? "dias"}
                                </div>
                              </div>
                            )}
                            {proposal.advancePercent != null && (
                              <div className="flex items-center gap-2">
                                <HandCoins className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                <div className="text-[10px] font-bold uppercase text-indigo-500">Anticipo solicitado:</div>
                                <div className="font-black text-slate-700 text-xs">{proposal.advancePercent}%</div>
                              </div>
                            )}
                          </div>
                        )}
                        {proposal.generalNotes && (
                          <div className="mt-3 pt-3 border-t border-indigo-100">
                            <div className="text-[10px] font-bold uppercase text-indigo-500 mb-1">Observaciones generales</div>
                            <p className="text-slate-600">{proposal.generalNotes}</p>
                          </div>
                        )}
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <Table
                          columns={[
                            { key: "materialName", label: "Material", render: (item) => <span className="font-semibold text-slate-800">{item.materialName}</span> },
                            { key: "quantity", label: "Cantidad", align: "center", render: (item) => <span className="font-mono font-bold text-slate-600">{item.quantity}</span> },
                            { key: "unit", label: "Unidad", render: (item) => <span className="text-slate-500">{item.unit}</span> },
                            { key: "unitPrice", label: "Precio unit.", align: "right", render: (item) => <span className="font-mono font-bold text-slate-700">${item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span> },
                            { key: "totalPrice", label: "Total", align: "right", render: (item) => <span className="font-mono font-black text-indigo-700">${item.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span> },
                            { key: "notes", label: "Notas", render: (item) => <span className="text-slate-400 italic">{item.notes || "—"}</span> },
                          ]}
                          data={proposal.items}
                          rowKey={(item) => `${item.materialName}-${item.unit}`}
                          pageSize={10}
                          footer={
                            <tr className="border-t-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white">
                              <td colSpan={4} className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-600">Total propuesta:</td>
                              <td className="px-4 py-3 text-right font-mono text-sm font-black text-indigo-700">${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                              <td />
                            </tr>
                          }
                        />
                      </div>
                    </div>
                    </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      )}
    </motion.div>
  );
}
