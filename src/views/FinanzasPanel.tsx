/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Finanzas: liberación de anticipos + liquidaciones finales + libro diario.
 */

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { DollarSign, CheckCircle, CreditCard, ArrowUpRight, Coins, Search } from "lucide-react";
import { Project, ProjectStatus } from "../types";
import { SkeletonCard, SkeletonTable } from "../components/SkeletonLoader";
import Card from "../components/UI/Card";
import SectionHeader from "../components/UI/SectionHeader";
import EmptyState from "../components/UI/EmptyState";
import ConfirmDialog from "../components/UI/ConfirmDialog";
import { Table, type Column } from "../components/UI/Table";
import { formatNumber } from "../utils";
import { containerVariants, itemVariants } from "../animations";
import { useDebounce } from "../hooks/useDebounce";

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
  // ── Confirm dialogs state ──
  const [confirmPayAdvance, setConfirmPayAdvance] = useState<{ projectId: string; amount: number; title: string } | null>(null);
  const [confirmPayFinal, setConfirmPayFinal] = useState<{ projectId: string; amount: number; title: string } | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  // ── Ledger search ──
  const [ledgerSearch, setLedgerSearch] = useState("");
  const debouncedLedgerSearch = useDebounce(ledgerSearch, 300);

  if (isLoading) return <FinanzasSkeleton />;

  const pendingAdvances = projects.filter(p => p.status === ProjectStatus.CONTRATADO);
  const pendingFinalPayments = projects.filter(p => p.status === ProjectStatus.LISTO_PAGO_FINAL);

  // Completed transactions ledger
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
        voucher: `VCH-${1000 + idx}A`,
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
        voucher: `VCH-${1000 + idx}F`,
      });
    }
  });
  paidLedger.sort((a, b) => b.date.localeCompare(a.date));

  // Filter ledger by search
  const filteredLedger = useMemo(() => {
    if (!debouncedLedgerSearch) return paidLedger;
    const q = debouncedLedgerSearch.toLowerCase();
    return paidLedger.filter(
      (tx) =>
        tx.title.toLowerCase().includes(q) ||
        tx.contractorCode.toLowerCase().includes(q) ||
        tx.projectId.toLowerCase().includes(q) ||
        tx.voucher.toLowerCase().includes(q) ||
        tx.type.toLowerCase().includes(q),
    );
  }, [paidLedger, debouncedLedgerSearch]);

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">

      {/* 2 Column Operations */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Card: Pending Advance payments */}
        <Card className="border-l-4 border-l-rose-400 max-h-115 overflow-y-auto scroll-smooth">
          <SectionHeader
            icon={<Coins className="h-5 w-5" />}
            title="Liberación de Anticipos Pactados (Inicio Obra)"
            description="Autorice el primer desembolso de fondos acordado para que el contratista inicie los trabajos de campo."
            color="rose"
          />

          {pendingAdvances.length === 0 ? (
            <EmptyState
              message="No hay anticipos pendientes por liberar."
              icon={<CheckCircle className="h-8 w-8 text-slate-300" />}
            />
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
                      <span className="text-[9px] font-mono bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg font-bold">
                        Anticipo Pendiente
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gradient-to-br from-rose-50/40 to-white border border-rose-100/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Contratista adjudicado:</span>
                        <span className="font-bold text-slate-800">{winner.contractorName}</span>
                        <span className="font-mono text-[9px] text-sky-600 font-bold block mt-0.5">({winner.contractorCode})</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Porcentaje Anticipo:</span>
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
                        <span className="font-mono font-black text-slate-900 text-base">${formatNumber(advAmount)}</span>
                      </div>
                    </div>

                    <button
                      id={`btn-pay-advance-${p.id}`}
                      onClick={() => setConfirmPayAdvance({ projectId: p.id, amount: advAmount, title: p.title })}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white rounded-xl shadow-md shadow-rose-500/20 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-rose-500/30 hover:-translate-y-0.5"
                    >
                      <CreditCard className="h-4 w-4" />
                      Liberar Desembolso de Anticipo Bancario
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right Card: Final Settlements */}
        <Card className="border-l-4 border-l-sky-400 max-h-115 overflow-y-auto scroll-smooth">
          <SectionHeader
            icon={<DollarSign className="h-5 w-5" />}
            title="Finiquitos y Liquidaciones de Cierre (100%)"
            description="Cierre el ciclo financiero de la obra pagando el saldo restante, previa certificación de calidad por Cierre de Obra."
            color="sky"
          />

          {pendingFinalPayments.length === 0 ? (
            <EmptyState
              message="No hay liquidaciones pendientes."
              icon={<CheckCircle className="h-8 w-8 text-slate-300" />}
            />
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
                      <span className="text-[9px] font-mono bg-gradient-to-br from-sky-50 to-sky-100/50 text-sky-800 border border-sky-200 px-2.5 py-1 rounded-lg font-bold">
                        Aprobación de Calidad OK
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gradient-to-br from-sky-50/40 to-white border border-sky-100/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Contratista ejecutor:</span>
                        <span className="font-bold text-slate-800">{winner.contractorName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Anticipo ya pagado:</span>
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
                        <span className="font-mono font-black text-slate-900 text-base">${formatNumber(balanceDue)}</span>
                      </div>
                    </div>

                    <button
                      id={`btn-pay-final-${p.id}`}
                      onClick={() => setConfirmPayFinal({ projectId: p.id, amount: balanceDue, title: p.title })}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white rounded-xl shadow-md shadow-sky-500/20 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-sky-500/30 hover:-translate-y-0.5"
                    >
                      <CreditCard className="h-4 w-4" />
                      Aprobar y Transferir Finiquito de Obra
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

      </motion.div>

      {/* Financial ledger */}
      <motion.div variants={itemVariants}>
      <Card className="border-l-4 border-l-slate-400">
        <SectionHeader
          icon={<ArrowUpRight className="h-5 w-5" />}
          title="Libro Diario de Egresos y Transferencias"
          description="Historial detallado de desembolsos bancarios directos realizados por el sistema."
          color="slate"
        />

        {/* Ledger search */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por obra, proveedor, ID, voucher..."
            value={ledgerSearch}
            onChange={(e) => setLedgerSearch(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-400 bg-white font-medium"
            aria-label="Buscar en libro diario"
          />
        </div>

        <div className="max-h-96 overflow-y-auto scroll-smooth">
          <Table
            columns={[
              { key: "voucher", label: "ID Voucher", render: (tx) => <span className="font-mono font-bold text-sky-600 inline-flex items-center gap-1"><ArrowUpRight className="h-4 w-4 text-slate-400 shrink-0" />{tx.voucher}</span> },
              { key: "title", label: "Ref. Obra", render: (tx) => <><div className="font-bold text-slate-800 line-clamp-1">{tx.title}</div><span className="font-mono text-[9px] text-slate-400">ID: {tx.projectId}</span></> },
              { key: "type", label: "Tipo Egreso", render: (tx) => <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold ${tx.type === "ANTICIPO" ? "bg-gradient-to-br from-rose-50 to-rose-100/50 text-rose-700 border border-rose-100" : "bg-gradient-to-br from-sky-50 to-sky-100/50 text-sky-700 border border-sky-100"}`}>{tx.type}</span> },
              { key: "contractorCode", label: "Proveedor (Código)", render: (tx) => <span className="font-mono font-bold text-slate-600">{tx.contractorCode}</span> },
              { key: "date", label: "Fecha Pago", render: (tx) => <span className="font-mono text-slate-500 font-medium">{tx.date}</span> },
              { key: "amount", label: "Monto Desembolsado", align: "right", render: (tx) => <span className="font-mono font-bold text-slate-900 text-sm">${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span> },
            ]}
            data={filteredLedger}
            rowKey={(tx) => tx.id}
            emptyMessage="Ninguna transferencia financiera ha sido efectuada aún."
            isLoading={false}
            pageSize={20}
          />
        </div>
      </Card>
      </motion.div>

      {/* ── Confirm Dialogs ── */}
      <ConfirmDialog
        isOpen={!!confirmPayAdvance}
        onClose={() => setConfirmPayAdvance(null)}
        onConfirm={async () => {
          if (!confirmPayAdvance) return;
          setIsPaying(true);
          try {
            await onPayAdvance(confirmPayAdvance.projectId, confirmPayAdvance.amount);
            setConfirmPayAdvance(null);
          } finally {
            setIsPaying(false);
          }
        }}
        title="Liberar Anticipo"
        message={`¿Estás seguro de liberar el anticipo de $${formatNumber(confirmPayAdvance?.amount ?? 0)} para la obra "${confirmPayAdvance?.title ?? ""}"? Esta acción registrará el pago en el libro diario y cambiará el estado del proyecto a "En ejecución".`}
        variant="warning"
        confirmLabel="Liberar anticipo"
        isLoading={isPaying}
      />

      <ConfirmDialog
        isOpen={!!confirmPayFinal}
        onClose={() => setConfirmPayFinal(null)}
        onConfirm={async () => {
          if (!confirmPayFinal) return;
          setIsPaying(true);
          try {
            await onPayFinal(confirmPayFinal.projectId, confirmPayFinal.amount);
            setConfirmPayFinal(null);
          } finally {
            setIsPaying(false);
          }
        }}
        title="Aprobar Pago Final"
        message={`¿Estás seguro de aprobar el finiquito de $${formatNumber(confirmPayFinal?.amount ?? 0)} para la obra "${confirmPayFinal?.title ?? ""}"? Esta acción cerrará el ciclo financiero del proyecto.`}
        variant="warning"
        confirmLabel="Aprobar finiquito"
        isLoading={isPaying}
      />
    </motion.div>
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
