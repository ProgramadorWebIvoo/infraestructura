/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Checklist de materiales del catálogo: permite tildar varios de una vez,
 * asignarles cantidad por fila, y confirmar en lote — reemplaza el flujo
 * "elegir uno → cantidad → Agregar → repetir" que forzaba una interacción
 * completa por material.
 *
 * No extiende `SelectModal` (selección única por diseño, usado por otros
 * módulos) para no arriesgar sus consumidores existentes — este componente
 * vive junto a `MaterialAdderSection.tsx` porque depende de conceptos
 * específicos de este dominio (catálogo con unidad/precio). Si aparece un
 * segundo caso de uso real en otro módulo, ahí se generaliza.
 */

import { useState, useMemo } from "react";
import { Search, Check, Package } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import { Table, type Column } from "../../../components/UI/Table";
import Button from "../../../components/UI/Button";
import NumericInput from "../../../components/UI/NumericInput";
import FieldError from "../../../components/UI/FieldError";
import { formatCurrency } from "../../../utils";
import { useCurrencyConversion, formatBs } from "../../../hooks/useCurrencyConversion";

interface CatalogMaterial {
  name: string;
  unit: string;
  estimatedUnitPrice: number;
}

interface MaterialChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (items: { catalogIndex: number; quantity: number }[]) => void;
  materialsCatalog: CatalogMaterial[];
}

export default function MaterialChecklistModal({
  isOpen,
  onClose,
  onConfirm,
  materialsCatalog,
}: MaterialChecklistModalProps) {
  const [selections, setSelections] = useState<Map<number, number | "">>(new Map());
  const [search, setSearch] = useState("");
  const [touchedInvalid, setTouchedInvalid] = useState<Set<number>>(new Set());
  const { convert, hasRates, isLoading: ratesLoading } = useCurrencyConversion();

  const filtered = useMemo(() => {
    const items = materialsCatalog.map((mat, index) => ({ ...mat, index }));
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((m) => m.name.toLowerCase().includes(q) || m.unit.toLowerCase().includes(q));
  }, [materialsCatalog, search]);

  const isRowInvalid = (index: number) => {
    const qty = selections.get(index);
    if (qty === undefined) return false;
    return qty === "" || qty <= 0;
  };

  const hasInvalidSelection = Array.from(selections.keys()).some(isRowInvalid);
  const canConfirm = selections.size > 0 && !hasInvalidSelection;

  const toggleRow = (index: number) => {
    setSelections((prev) => {
      const next = new Map(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.set(index, 1);
      }
      return next;
    });
    setTouchedInvalid((prev) => {
      if (!prev.has(index)) return prev;
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleQtyChange = (index: number, qty: number | "") => {
    setSelections((prev) => new Map(prev).set(index, qty));
    setTouchedInvalid((prev) => new Set(prev).add(index));
  };

  const handleClose = () => {
    setSelections(new Map());
    setSearch("");
    setTouchedInvalid(new Set());
    onClose();
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    const items = Array.from(selections.entries()).map(([catalogIndex, quantity]) => ({
      catalogIndex,
      quantity: quantity as number,
    }));
    onConfirm(items);
    handleClose();
  };

  const columns: Column<CatalogMaterial & { index: number }>[] = [
    {
      key: "check",
      label: "",
      width: "2.5rem",
      render: (m) => (
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors duration-150 ${
            selections.has(m.index)
              ? "border-emerald-500 bg-emerald-500"
              : "border-slate-300 bg-white"
          }`}
        >
          {selections.has(m.index) && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
          <input
            type="checkbox"
            checked={selections.has(m.index)}
            onChange={() => toggleRow(m.index)}
            onClick={(e) => e.stopPropagation()}
            className="sr-only"
            aria-label={`Seleccionar ${m.name}`}
          />
        </div>
      ),
    },
    {
      key: "label",
      label: "Nombre",
      sortable: true,
      render: (m) => (
        <div className="min-w-0">
          <div className="font-bold text-slate-800 truncate">{m.name}</div>
          <div className="text-[11px] text-slate-400 truncate font-medium">
            {m.unit} · {formatCurrency(m.estimatedUnitPrice)}
            {ratesLoading && !hasRates && <span className="inline-block ml-1.5 h-2.5 w-12 rounded skeleton-shimmer align-middle" />}
            {hasRates && <span className="text-slate-500 font-semibold"> · Bs. {formatBs(convert(m.estimatedUnitPrice, "USD"))}</span>}
          </div>
        </div>
      ),
    },
    {
      key: "qty",
      label: "Cantidad",
      width: "9rem",
      align: "center",
      render: (m) =>
        selections.has(m.index) ? (
          <div onClick={(e) => e.stopPropagation()}>
            <NumericInput
              value={selections.get(m.index)!}
              onChange={(v) => handleQtyChange(m.index, v)}
              step="1"
              className="rounded-lg"
            />
            {touchedInvalid.has(m.index) && isRowInvalid(m.index) && (
              <FieldError message="Cantidad requerida" className="text-[10px]" />
            )}
          </div>
        ) : (
          <span className="text-slate-300 font-mono text-[11px]">{m.unit}</span>
        ),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Elegir Materiales del Catálogo"
      infoLine={`${materialsCatalog.length} materiales disponibles`}
      icon={<Package className="h-5 w-5" />}
      iconColor="emerald"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex flex-col items-end gap-1.5">
          {selections.size > 0 && !canConfirm && (
            <span className="text-[11px] font-semibold text-danger-600">
              Completá la cantidad de todas las filas tildadas.
            </span>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              colorScheme="emerald"
              onClick={handleConfirm}
              disabled={!canConfirm}
              icon={<Check className="h-3.5 w-3.5" />}
            >
              {selections.size > 0
                ? `Agregar ${selections.size} material${selections.size > 1 ? "es" : ""}`
                : "Agregar materiales"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o unidad..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <div className="mb-3 text-[11px] font-medium text-slate-500">
        {filtered.length} de {materialsCatalog.length} materiales
        {search && <span className="text-emerald-600 ml-1">(filtrado)</span>}
      </div>

      <Table
        columns={columns}
        data={filtered}
        rowKey={(m) => m.index}
        isLoading={false}
        emptyMessage="No hay materiales en el catálogo aún."
        pageSize={15}
        maxHeight="45rem"
        rowHoverClass="hover:bg-emerald-50/50 transition-colors cursor-pointer"
        alternating={false}
        onRowClick={(m) => toggleRow(m.index)}
      />
    </Modal>
  );
}
