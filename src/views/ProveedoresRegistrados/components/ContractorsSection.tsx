/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tabla de proveedores registrados con búsqueda — extraída de ProveedoresRegistrados.
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link2, Mail, Pencil, Search, Star } from "lucide-react";
import { itemVariants } from "../../../animations";
import { Table, type Column } from "../../../components/UI/Table";
import type { Contractor } from "../../../types";

interface ContractorsSectionProps {
  contractors: Contractor[];
  isLoading: boolean;
  onOpenEdit: (contractor: Contractor) => void;
  onOpenInvite: (contractor: Contractor) => void;
}

export default function ContractorsSection({
  contractors,
  isLoading,
  onOpenEdit,
  onOpenInvite,
}: ContractorsSectionProps) {
  const [search, setSearch] = useState("");

  const filteredContractors = useMemo(
    () =>
      contractors.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.specialty.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase())
      ),
    [contractors, search],
  );

  const contractorColumns: Column<Contractor>[] = useMemo(() => [
    { key: "code", label: "Codigo", render: (c) => <span className="rounded-lg border border-sky-100 bg-sky-50/80 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-600">{c.code}</span> },
    { key: "name", label: "Empresa", render: (c) => <span className="font-bold text-slate-800">{c.name}</span> },
    { key: "specialty", label: "Especialidad", render: (c) => <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{c.specialty}</span> },
    { key: "email", label: "Contacto", render: (c) => <div className="flex items-center gap-2 font-mono font-semibold text-slate-500"><Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />{c.email}</div> },
    {
      key: "actions",
      label: "Acciones",
      align: "center",
      render: (c) => (
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 px-2.5 py-1 font-mono text-[11px] font-black text-amber-600">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            {c.rating.toFixed(1)}
          </div>
          <button aria-label="Actualizar evaluación" onClick={() => onOpenEdit(c)} className="cursor-pointer rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition-all duration-200 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 hover:shadow-md hover:-translate-y-0.5" title="Actualizar evaluacion"><Pencil className="h-3 w-3" /></button>
          <button aria-label="Generar enlace de propuesta de materiales" onClick={() => onOpenInvite(c)} className="cursor-pointer rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-md hover:-translate-y-0.5" title="Generar enlace de propuesta de materiales"><Link2 className="h-3 w-3" /></button>
        </div>
      ),
    },
  ], [onOpenEdit, onOpenInvite]);

  return (
    <motion.div variants={itemVariants} className="overflow-hidden rounded-2xl border border-slate-200/80 border-l-4 border-l-indigo-400 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 p-5 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            id="registered-provider-search"
            type="text"
            placeholder="Buscar por nombre, codigo, correo o especialidad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-2.5 text-xs font-bold text-slate-600">
          Total: <span className="text-slate-950">{contractors.length}</span>
        </div>
      </div>

      <Table
        columns={contractorColumns}
        data={filteredContractors}
        rowKey={(c) => c.code}
        isLoading={isLoading}
        emptyMessage="No se encontraron proveedores con ese criterio."
        maxHeight="29rem"
        containerClassName="pr-2"
        pageSize={20}
      />
    </motion.div>
  );
}

