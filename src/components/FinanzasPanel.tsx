/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Project, ProjectStatus } from "../types";
import { 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  CreditCard, 
  ArrowUpRight, 
  TrendingUp, 
  Coins, 
  HelpCircle,
  FileSpreadsheet
} from "lucide-react";
import { SkeletonCard, SkeletonBlock, SkeletonTable } from "./SkeletonLoader";

interface FinanzasPanelProps {
  projects: Project[];
  onPayAdvance: (projectId: string, amount: number) => void;
  onPayFinal: (projectId: string, amount: number) => void;
  isLoading?: boolean;
}

export default function FinanzasPanel({
  projects,
  onPayAdvance,
  onPayFinal,
  isLoading = false,
}: FinanzasPanelProps) {
  if (isLoading) return <FinanzasSkeleton />;
  
  // Lists
  const pendingAdvances = projects.filter(p => p.status === ProjectStatus.CONTRATADO);
  const pendingFinalPayments = projects.filter(p => p.status === ProjectStatus.LISTO_PAGO_FINAL);

  // Completed transactions list (computed from paid amounts)
  const paidLedger: {
    id: string;
    projectId: string;
    title: string;
    contractorCode: string;
    type: "ANTICIPO" | "LIQUIDACIÓN_FINAL";
    amount: number;
    date: string;
    voucher: string;
  }[] = [];

  projects.forEach((p, idx) => {
    const winner = p.proposals?.find(pr => pr.contractorCode === p.selectedContractorCode);
    const contractor = winner ? winner.contractorCode : "CON-301";

    if (p.advancePaidAmount && p.advancePaidDate) {
      paidLedger.push({
        id: `TXN-ADV-${idx}-${p.id}`,
        projectId: p.id,
        title: p.title,
        contractorCode: contractor,
        type: "ANTICIPO",
        amount: p.advancePaidAmount,
        date: p.advancePaidDate,
        voucher: `VCH-${1000 + idx}A`
      });
    }
    if (p.finalPaidAmount && p.finalPaidDate) {
      paidLedger.push({
        id: `TXN-FIN-${idx}-${p.id}`,
        projectId: p.id,
        title: p.title,
        contractorCode: contractor,
        type: "LIQUIDACIÓN_FINAL",
        amount: p.finalPaidAmount,
        date: p.finalPaidDate,
        voucher: `VCH-${1000 + idx}F`
      });
    }
  });

  // Sort ledger by date descending
  paidLedger.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      
      {/* 2 Column Operations: Left (Advances), Right (Final Settlements) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Card: Pending Advance payments */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-all duration-300 grid grid-cols-1 pr-2 -mr-2 scrool-smooth overflow-y-auto max-h-115">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5 mb-5">
            <div className="bg-rose-50 text-rose-600 p-2.5 rounded-xl border border-rose-100">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-slate-900 text-sm">Liberación de Anticipos Pactados (Inicio Obra)</h3>
              <p className="text-xs text-slate-500 font-medium">Autorice el primer desembolso de fondos acordado para que el contratista inicie los trabajos de campo.</p>
            </div>
          </div>

          {pendingAdvances.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CheckCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">No hay anticipos pendientes por liberar.</p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Adjudique un contratista en el panel de <strong className="text-slate-600">Procura</strong> para activar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingAdvances.map((p) => {
                const winner = p.proposals?.find(prop => prop.contractorCode === p.selectedContractorCode);
                if (!winner) return null;
                const advAmount = winner.totalCost * (winner.negotiatedAdvancePercent / 100);

                return (
                  <div key={p.id} className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[9px] font-mono font-bold text-slate-400">{p.id}</span>
                        <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{p.title}</h4>
                      </div>
                      <span className="text-[9px] font-mono bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg font-bold">
                        Anticipo Pendiente
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Contratista adjudicado:</span>
                        <span className="font-bold text-slate-800">{winner.contractorName}</span>
                        <span className="font-mono text-[9px] text-sky-600 font-bold block mt-0.5">({winner.contractorCode})</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Porcentaje Anticipo:</span>
                        <span className="font-mono font-black text-emerald-600 text-sm">{winner.negotiatedAdvancePercent}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Monto total de obra:</span>
                        <span className="font-mono font-bold text-slate-600">${winner.totalCost.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase font-mono tracking-wider text-rose-500 mb-0.5">Monto Anticipo a Pagar:</span>
                        <span className="font-mono font-black text-slate-900 text-base">${advAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <button
                      id={`btn-pay-advance-${p.id}`}
                      onClick={() => onPayAdvance(p.id, advAmount)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-md shadow-rose-500/10 transition-colors cursor-pointer"
                    >
                      <CreditCard className="h-4 w-4" />
                      Liberar Desembolso de Anticipo Bancario
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Card: Final Settlements (Liquidaciones) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-all duration-300 grid grid-cols-1 pr-2 -mr-2 scrool-smooth overflow-y-auto max-h-115">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5 mb-5">
            <div className="bg-sky-50 text-sky-600 p-2.5 rounded-xl border border-sky-100">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-slate-900 text-sm">Finiquitos y Liquidaciones de Cierre (100%)</h3>
              <p className="text-xs text-slate-500 font-medium">Cierre el ciclo financiero de la obra pagando el saldo restante, previa certificación de calidad por Cierre de Obra.</p>
            </div>
          </div>

          {pendingFinalPayments.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CheckCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">No hay liquidaciones pendientes.</p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">El departamento de <strong className="text-slate-600">Cierre de Obra</strong> debe verificar la calidad final primero.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingFinalPayments.map((p) => {
                const winner = p.proposals?.find(prop => prop.contractorCode === p.selectedContractorCode);
                if (!winner) return null;
                const paidAdvance = p.advancePaidAmount || 0;
                const balanceDue = winner.totalCost - paidAdvance;

                return (
                  <div key={p.id} className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[9px] font-mono font-bold text-slate-400">{p.id}</span>
                        <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{p.title}</h4>
                      </div>
                      <span className="text-[9px] font-mono bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-1 rounded-lg font-bold">
                        Aprobación de Calidad OK
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Contratista ejecutor:</span>
                        <span className="font-bold text-slate-800">{winner.contractorName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Anticipo ya pagado:</span>
                        <span className="font-mono font-bold text-slate-600">${paidAdvance.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Monto total de obra:</span>
                        <span className="font-mono font-bold text-slate-600">${winner.totalCost.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase font-mono tracking-wider text-sky-600 mb-0.5">Saldo Pendiente a Liquidar:</span>
                        <span className="font-mono font-black text-slate-900 text-base">${balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <button
                      id={`btn-pay-final-${p.id}`}
                      onClick={() => onPayFinal(p.id, balanceDue)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-md shadow-sky-500/10 transition-colors cursor-pointer"
                    >
                      <CreditCard className="h-4 w-4" />
                      Aprobar y Transferir Finiquito de Obra
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Financial ledger transaction ledger list */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 grid grid-cols-1 pr-2 -mr-2 scrool-smooth overflow-y-auto max-h-115">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-sans font-bold text-slate-900 text-sm">Libro Diario de Egresos y Transferencias</h3>
            <p className="text-xs text-slate-500 font-medium">Historial detallado de desembolsos bancarios directos realizados por el sistema.</p>
          </div>
          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase">
            Libro Banco ({paidLedger.length} TXS)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="py-3 px-5 uppercase tracking-wider text-[9px]">ID Voucher</th>
                <th className="py-3 px-4 uppercase tracking-wider text-[9px]">Ref. Obra</th>
                <th className="py-3 px-4 uppercase tracking-wider text-[9px]">Tipo Egreso</th>
                <th className="py-3 px-4 uppercase tracking-wider text-[9px]">Proveedor (Código)</th>
                <th className="py-3 px-4 uppercase tracking-wider text-[9px]">Fecha Pago</th>
                <th className="py-3 px-5 text-right uppercase tracking-wider text-[9px]">Monto Desembolsado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paidLedger.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-5 font-mono font-bold text-sky-600 flex items-center gap-1">
                    <ArrowUpRight className="h-4 w-4 text-rose-500" />
                    {tx.voucher}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-800 line-clamp-1">{tx.title}</div>
                    <span className="font-mono text-[9px] text-slate-400">ID: {tx.projectId}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                      tx.type === "ANTICIPO" ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-sky-50 text-sky-700 border border-sky-100"
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-600">
                    {tx.contractorCode}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 font-medium">
                    {tx.date}
                  </td>
                  <td className="py-3 px-5 text-right font-mono font-bold text-slate-900 text-sm">
                    ${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {paidLedger.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium italic">
                    Ninguna transferencia financiera ha sido efectuada aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

/* ─── Skeleton Loader ─── */
function FinanzasSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonTable rows={4} columns={6} />
    </div>
  );
}
