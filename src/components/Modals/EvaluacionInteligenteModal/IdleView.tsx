/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Estado Idle del modal de Evaluación Inteligente.
 */

import { BrainCircuit, DollarSign, TrendingUp, Clock, Zap } from "lucide-react";
import { Table, type Column } from "../../UI/Table";
import type { IdleViewProps } from "./types";

type ProposalRow = IdleViewProps["proposals"][number];

const IDLE_COLUMNS: Column<ProposalRow>[] = [
  {
    key: "contractorName",
    label: "Contratista",
    render: (p) => <span className="font-semibold text-slate-800">{p.contractorName}</span>,
  },
  {
    key: "materialCost",
    label: "Mat.",
    align: "right",
    render: (p) => <span className="font-mono">${p.materialCost.toLocaleString()}</span>,
  },
  {
    key: "laborCost",
    label: "M.O.",
    align: "right",
    render: (p) => <span className="font-mono">${p.laborCost.toLocaleString()}</span>,
  },
  {
    key: "totalCost",
    label: "Total",
    align: "right",
    render: (p) => (
      <span className="font-mono font-bold text-slate-900">
        ${p.totalCost.toLocaleString()}
      </span>
    ),
  },
  {
    key: "deliveryWeeks",
    label: "Plazo",
    align: "center",
    render: (p) => <>{p.deliveryWeeks} sem</>,
  },
  {
    key: "contractorRating",
    label: "Rating",
    align: "center",
    render: (p) => {
      const rating = p.contractorRating;
      const colorClass =
        rating == null
          ? "bg-slate-50 text-slate-400"
          : rating >= 4
            ? "bg-emerald-50 text-emerald-700"
            : rating >= 3
              ? "bg-amber-50 text-amber-700"
              : "bg-red-50 text-red-700";
      return (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${colorClass}`}
        >
          {rating?.toFixed(1) ?? "—"}
        </span>
      );
    },
  },
];

export default function IdleView({
  proposalCount,
  approvedInvestmentAmount,
  deliveryWeeksMin,
  deliveryWeeksMax,
  proposals,
  onStart,
  selectedProvider,
  onProviderChange,
}: IdleViewProps) {
  return (
    <div className="space-y-6 text-center">
      <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
        <div className="bg-amber-50 text-amber-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
          <BrainCircuit className="h-8 w-8" />
        </div>
        <h4 className="text-lg font-black text-slate-900 mb-2">Evaluación Inteligente de Ofertas</h4>
        <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          La IA analizará las {proposalCount} propuestas de este proyecto en rol de{" "}
          <strong className="text-slate-700">Ingeniero en Infraestructura</strong> con
          experiencia en finanzas y contratación, evaluando costo, plazo, riesgo y
          condiciones contractuales para recomendar la mejor opción.
        </p>
      </div>

      {/* Mini resumen del proyecto */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <DollarSign className="h-4 w-4 text-slate-400 mx-auto mb-1" />
          <div className="font-bold text-slate-800">
            ${approvedInvestmentAmount?.toLocaleString("en-US") ?? "—"}
          </div>
          <div className="text-slate-400 mt-0.5">Inversión Máx.</div>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <TrendingUp className="h-4 w-4 text-slate-400 mx-auto mb-1" />
          <div className="font-bold text-slate-800">{proposalCount}</div>
          <div className="text-slate-400 mt-0.5">Propuestas</div>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <Clock className="h-4 w-4 text-slate-400 mx-auto mb-1" />
          <div className="font-bold text-slate-800">
            {deliveryWeeksMin}–{deliveryWeeksMax} sem
          </div>
          <div className="text-slate-400 mt-0.5">Plazo Ofertado</div>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <Zap className="h-4 w-4 text-slate-400 mx-auto mb-1" />
          <div className="font-bold text-slate-800">{proposalCount} c/u</div>
          <div className="text-slate-400 mt-0.5">Anticipo 10–50%</div>
        </div>
      </div>

      {/* Tabla de propuestas */}
      {proposals.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <Table
            columns={IDLE_COLUMNS}
            data={proposals}
            rowKey={(p) => p.id}
          />
        </div>
      )}

      {/* Selector de proveedor AI */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Proveedor de IA
        </label>
        <select
          value={selectedProvider}
          onChange={(e) => onProviderChange(e.target.value as typeof selectedProvider)}
          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500 bg-white"
        >
          <option value="auto">Automático (Failover: ChatGPT → Gemini → Claude)</option>
          <option value="chatgpt">ChatGPT (OpenAI)</option>
          <option value="gemini">Gemini (Google)</option>
          <option value="claude">Claude (Anthropic)</option>
        </select>
      </div>

      <button
        id="btn-start-ai-evaluation"
        onClick={onStart}
        className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-black text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer transform hover:scale-[1.02]"
      >
        <BrainCircuit className="h-5 w-5" />
        Iniciar Evaluación con IA
      </button>
    </div>
  );
}
