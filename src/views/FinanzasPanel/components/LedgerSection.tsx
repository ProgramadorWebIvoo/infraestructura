/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 3 de Finanzas: diario de egresos y transferencias — extraída de FinanzasPanel.
 */

import { useMemo, useState } from "react";
import { ArrowUpRight, FileSpreadsheet, FileText, Search, Wallet, HandCoins, ReceiptText } from "lucide-react";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import { Table } from "../../../components/UI/Table";
import ExportButton, { type ExportColumn, type ExportRow } from "../../../components/UI/ExportButton";
import { useDebounce } from "../../../hooks/useDebounce";

interface LedgerEntry {
  id: string;
  projectId: string;
  title: string;
  contractorCode: string;
  type: "ANTICIPO" | "LIQUIDACIÓN_FINAL";
  amount: number;
  date: string;
  voucher: string;
}

interface LedgerSectionProps {
  paidLedger: LedgerEntry[];
}

type TypeFilter = "TODOS" | "ANTICIPO" | "LIQUIDACIÓN_FINAL";

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "TODOS", label: "Todos" },
  { key: "ANTICIPO", label: "Anticipos" },
  { key: "LIQUIDACIÓN_FINAL", label: "Liquidaciones" },
];

export default function LedgerSection({ paidLedger }: LedgerSectionProps) {
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("TODOS");
  const debouncedLedgerSearch = useDebounce(ledgerSearch, 300);

  const filteredLedger = useMemo(() => {
    const q = debouncedLedgerSearch.toLowerCase();
    return paidLedger.filter((tx) => {
      if (typeFilter !== "TODOS" && tx.type !== typeFilter) return false;
      if (!q) return true;
      return (
        tx.title.toLowerCase().includes(q) ||
        tx.contractorCode.toLowerCase().includes(q) ||
        tx.projectId.toLowerCase().includes(q) ||
        tx.voucher.toLowerCase().includes(q) ||
        tx.type.toLowerCase().includes(q)
      );
    });
  }, [paidLedger, debouncedLedgerSearch, typeFilter]);

  const stats = useMemo(() => {
    const total = paidLedger.reduce((sum, tx) => sum + tx.amount, 0);
    const advances = paidLedger.filter((tx) => tx.type === "ANTICIPO");
    const finals = paidLedger.filter((tx) => tx.type === "LIQUIDACIÓN_FINAL");
    return {
      total,
      count: paidLedger.length,
      advancesTotal: advances.reduce((s, tx) => s + tx.amount, 0),
      advancesCount: advances.length,
      finalsTotal: finals.reduce((s, tx) => s + tx.amount, 0),
      finalsCount: finals.length,
    };
  }, [paidLedger]);

  const exportRows = useMemo<ExportRow[]>(
    () =>
      filteredLedger.map((tx) => [
        tx.voucher,
        tx.title,
        tx.projectId,
        tx.type,
        tx.contractorCode,
        tx.date,
        tx.amount,
      ]),
    [filteredLedger]
  );

  const exportColumns: ExportColumn[] = [
    { width: 14 },
    { width: 44 },
    { width: 14 },
    { width: 20, align: "center" },
    { width: 16 },
    { width: 13, align: "center" },
    { width: 18, align: "right", money: true },
  ];

  const exportProps = {
    filename: `diario-egresos-${new Date().toISOString().slice(0, 10)}`,
    headers: ["ID Voucher", "Ref. Obra", "ID Proyecto", "Tipo Egreso", "Proveedor", "Fecha Pago", "Monto Desembolsado"],
    rows: exportRows,
    columns: exportColumns,
    title: "Diario de Egresos y Transferencias",
    subtitle: `Generado el ${new Date().toLocaleString("es-ES", { dateStyle: "long" })} — ${filteredLedger.length} movimiento(s) de desembolsos bancarios.`,
    footer: {
      label: "TOTAL DESEMBOLSADO",
      value: filteredLedger.reduce((sum, tx) => sum + tx.amount, 0),
    },
    disabled: filteredLedger.length === 0,
  };

  return (
    <Card className="border-l-4 border-l-slate-400">
      <SectionHeader
        icon={<ArrowUpRight className="h-5 w-5" />}
        title="Diario de Egresos y Transferencias"
        description="Historial detallado de desembolsos bancarios directos realizados por el sistema."
        color="slate"
        actions={
          <>
            <ExportButton
              format="excel"
              {...exportProps}
              icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
              aria-label="Exportar diario a Excel"
              className="px-3 py-2 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100"
            >
              Exportar Excel
            </ExportButton>
            <ExportButton
              format="pdf"
              {...exportProps}
              icon={<FileText className="h-3.5 w-3.5" />}
              aria-label="Exportar diario a PDF"
              className="px-3 py-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100"
            >
              Exportar PDF
            </ExportButton>
          </>
        }
      />

      {/* Mini-stats del diario */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-1.5">
            <Wallet className="h-4 w-4 text-slate-500" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Total Desembolsado</span>
          </div>
          <p className="text-lg font-black font-mono text-slate-800">${fmtMoney(stats.total)}</p>
          <p className="text-[10px] text-slate-400 font-medium">{stats.count} movimiento(s)</p>
        </div>
        <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/40">
          <div className="flex items-center gap-2 mb-1.5">
            <HandCoins className="h-4 w-4 text-rose-500" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-rose-400">Anticipos Liberados</span>
          </div>
          <p className="text-lg font-black font-mono text-rose-700">${fmtMoney(stats.advancesTotal)}</p>
          <p className="text-[10px] text-rose-400/80 font-medium">{stats.advancesCount} desembolso(s)</p>
        </div>
        <div className="p-3.5 rounded-xl border border-sky-100 bg-sky-50/40">
          <div className="flex items-center gap-2 mb-1.5">
            <ReceiptText className="h-4 w-4 text-sky-500" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-sky-400">Finiquitos Liquidados</span>
          </div>
          <p className="text-lg font-black font-mono text-sky-700">${fmtMoney(stats.finalsTotal)}</p>
          <p className="text-[10px] text-sky-400/80 font-medium">{stats.finalsCount} liquidación(es)</p>
        </div>
      </div>

      {/* Filtros + búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por obra, proveedor, ID, voucher..."
            value={ledgerSearch}
            onChange={(e) => setLedgerSearch(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-400 bg-white font-medium"
            aria-label="Buscar en diario de egresos"
          />
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label="Filtrar por tipo de egreso">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setTypeFilter(f.key)}
              className={`px-3 py-2 rounded-lg border text-[10px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                typeFilter === f.key
                  ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto scroll-smooth">
        <Table
          columns={[
            { key: "voucher", label: "ID Voucher", sortable: true, render: (tx) => <span className="font-mono font-bold text-sky-600 inline-flex items-center gap-1"><ArrowUpRight className="h-4 w-4 text-slate-400 shrink-0" />{tx.voucher}</span> },
            { key: "title", label: "Ref. Obra", sortable: true, render: (tx) => <><div className="font-bold text-slate-800 line-clamp-1">{tx.title}</div><span className="font-mono text-[9px] text-slate-400">ID: {tx.projectId}</span></> },
            { key: "type", label: "Tipo Egreso", sortable: true, render: (tx) => <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold ${tx.type === "ANTICIPO" ? "bg-gradient-to-br from-rose-50 to-rose-100/50 text-rose-700 border border-rose-100" : "bg-gradient-to-br from-sky-50 to-sky-100/50 text-sky-700 border border-sky-100"}`}>{tx.type}</span> },
            { key: "contractorCode", label: "Proveedor (Código)", sortable: true, render: (tx) => <span className="font-mono font-bold text-slate-600">{tx.contractorCode}</span> },
            { key: "date", label: "Fecha Pago", sortable: true, render: (tx) => <span className="font-mono text-slate-500 font-medium">{tx.date}</span> },
            { key: "amount", label: "Monto Desembolsado", align: "right", sortable: true, render: (tx) => <span className="font-mono font-bold text-slate-900 text-sm">${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span> },
          ]}
          data={filteredLedger}
          rowKey={(tx) => tx.id}
          emptyMessage="Ninguna transferencia financiera ha sido efectuada aún."
          isLoading={false}
          pageSize={20}
          footer={
            <tr>
              <td colSpan={5} className="py-3 px-4 text-[11px] uppercase tracking-wider text-slate-500">
                Total desembolsado ({filteredLedger.length} movimientos)
              </td>
              <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                ${fmtMoney(filteredLedger.reduce((sum, tx) => sum + tx.amount, 0))}
              </td>
            </tr>
          }
        />
      </div>
    </Card>
  );
}