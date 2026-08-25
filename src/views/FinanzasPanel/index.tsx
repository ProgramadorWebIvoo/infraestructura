/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Finanzas: liberación de anticipos + liquidaciones finales + diario de egresos.
 */

import { useMemo } from "react";
import { motion } from "motion/react";
import { Banknote, CircleCheckBig, Coins, HandCoins, Wallet, Hourglass } from "lucide-react";
import { ProjectStatus } from "../../types";
import type { Project } from "../../types";
import { SkeletonCard, SkeletonTable, SkeletonBlock, SkeletonStats } from "../../components/SkeletonLoader";
import { containerVariants, itemVariants } from "../../animations";
import KpiCard from "../../components/UI/KpiCard";
import FinancialSummarySection from "./components/FinancialSummarySection";
import AdvancesSection from "./components/AdvancesSection";
import FinalSettlementsSection from "./components/FinalSettlementsSection";
import LedgerSection from "./components/LedgerSection";

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

  const pendingAdvances = useMemo(
    () => projects.filter(p => p.status === ProjectStatus.CONTRATADO),
    [projects],
  );
  const pendingFinalPayments = useMemo(
    () => projects.filter(p => p.status === ProjectStatus.LISTO_PAGO_FINAL),
    [projects],
  );

  const kpis = useMemo(
    () => ({
      pendingAdvances: pendingAdvances.length,
      pendingFinal: pendingFinalPayments.length,
      inExecution: projects.filter(
        p => p.status === ProjectStatus.EN_EJECUCION || p.status === ProjectStatus.VERIFICANDO_FINALIZACION,
      ).length,
      completed: projects.filter(p => p.status === ProjectStatus.COMPLETADO_PAGADO).length,
    }),
    [projects, pendingAdvances, pendingFinalPayments],
  );

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

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <h1 className="sr-only">Finanzas</h1>

      {/* Header del departamento */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl shadow-sm">
            <Banknote className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="font-brand text-xl font-black tracking-tight text-slate-900">Gerencia de Finanzas</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Libere anticipos, liquide finiquitos y controle el flujo de desembolsos del portafolio.
            </p>
          </div>
        </div>
      </motion.div>

      {/* KPIs operativos del departamento — stagger propio (containerVariants
          en el grid, itemVariants por tarjeta) para que las 4 entren en
          secuencia en vez de todas a la vez. */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <KpiCard icon={<HandCoins className="h-5 w-5" />} label="Anticipos por Liberar" accent="text-rose-600" borderAccent="border-l-rose-400">
            <span className="text-2xl font-black font-mono bg-gradient-to-r from-rose-700 to-rose-500 bg-clip-text text-transparent">{kpis.pendingAdvances}</span>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Inicio de obra pendiente</p>
          </KpiCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <KpiCard icon={<Wallet className="h-5 w-5" />} label="Finiquitos por Liquidar" accent="text-sky-600" borderAccent="border-l-sky-400">
            <span className="text-2xl font-black font-mono bg-gradient-to-r from-sky-700 to-sky-500 bg-clip-text text-transparent">{kpis.pendingFinal}</span>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Cierre financiero pendiente</p>
          </KpiCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <KpiCard icon={<Hourglass className="h-5 w-5" />} label="En Ejecución" accent="text-amber-600" borderAccent="border-l-amber-400">
            <span className="text-2xl font-black font-mono bg-gradient-to-r from-amber-700 to-amber-500 bg-clip-text text-transparent">{kpis.inExecution}</span>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Obras con fondos activos</p>
          </KpiCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <KpiCard icon={<CircleCheckBig className="h-5 w-5" />} label="Obras Completadas" accent="text-emerald-600" borderAccent="border-l-emerald-400">
            <span className="text-2xl font-black font-mono bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent">{kpis.completed}</span>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Ciclo financiero cerrado</p>
          </KpiCard>
        </motion.div>
      </motion.div>

      {/* Ejecución financiera del portafolio */}
      <FinancialSummarySection projects={projects} />

      {/* Operaciones: anticipos (izq) + liquidaciones (der) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdvancesSection pendingAdvances={pendingAdvances} onPayAdvance={onPayAdvance} />
        <FinalSettlementsSection pendingFinalPayments={pendingFinalPayments} onPayFinal={onPayFinal} />
      </motion.div>

      {/* Diario de egresos */}
      <motion.div variants={itemVariants}>
        <LedgerSection paidLedger={paidLedger} />
      </motion.div>
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function FinanzasSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <SkeletonBlock className="h-12 w-12 rounded-2xl bg-slate-200" />
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-56" />
          <SkeletonBlock className="h-3 w-96" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStats key={i} />
        ))}
      </div>
      <SkeletonCard />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonTable rows={4} columns={6} />
    </div>
  );
}