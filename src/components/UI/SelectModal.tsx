/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SelectModal: Botón que abre un modal con tabla buscable para seleccionar un registro.
 * Reemplaza <select> nativos cuando hay muchos registros (proveedores, materiales, obras, etc.).
 * Usa Modal genérico + Table genérico.
 */

import { useState, useMemo, useCallback } from "react";
import { Search, X, Check } from "lucide-react";
import Modal from "./Modal";
import { Table, type Column } from "./Table";

export interface SelectModalOption<T> {
  /** Valor único que se devuelve al seleccionar */
  value: string | number;
  /** Texto principal mostrado en la tabla y en el botón */
  label: string;
  /** Texto secundario (descripción, código, etc.) */
  description?: string;
  /** Datos originales completos para uso avanzado */
  raw: T;
}

interface SelectModalProps<T> {
  /** Abierto/cerrado */
  isOpen: boolean;
  /** Callback al cerrar (click backdrop, X, ESC) */
  onClose: () => void;
  /** Callback al abrir (click en botón trigger) */
  onOpen: () => void;
  /** Callback al confirmar selección */
  onSelect: (option: SelectModalOption<T>) => void;
  /** Opciones disponibles */
  options: SelectModalOption<T>[];
  /** Valor actualmente seleccionado (para marcar fila) */
  selectedValue?: string | number;
  /** Texto del botón disparador */
  triggerLabel: string;
  /** Placeholder del buscador */
  searchPlaceholder?: string;
  /** Título del modal */
  title: string;
  /** Subtítulo / info line */
  infoLine?: string;
  /** Icono del header (lucide) */
  icon?: React.ReactNode;
  /** Color del icono (tailwind color name) */
  iconColor?: "sky" | "amber" | "emerald" | "purple" | "rose" | "slate" | "indigo";
  /** Ancho máximo del modal */
  maxWidth?: "max-w-sm" | "max-w-md" | "max-w-lg" | "max-w-xl" | "max-w-2xl" | "max-w-3xl" | "max-w-4xl";
  /** Columnas personalizadas de la tabla (opcional, usa default si no se pasa) */
  columns?: Column<SelectModalOption<T>>[];
  /** Mensaje cuando no hay resultados */
  emptyMessage?: string;
  /** Deshabilitado */
  disabled?: boolean;
  /** Clase extra para el botón trigger */
  triggerClassName?: string;
  /** Mostrar badge con contador de seleccionados (para multi-select futuro) */
  showCount?: boolean;
  /** Texto del botón de cancelar en footer */
  cancelText?: string;
  /** Texto del botón de confirmar en footer */
  confirmText?: string;
  /** Si true, permite cerrar sin seleccionar (comportamiento por defecto) */
  allowDeselect?: boolean;
  /** Callback al deseleccionar (click en X del badge) */
  onDeselect?: () => void;
}

const DEFAULT_EMPTY_MESSAGE = "No se encontraron coincidencias.";

export default function SelectModal<T>({
  isOpen,
  onClose,
  onOpen,
  onSelect,
  options,
  selectedValue,
  triggerLabel,
  searchPlaceholder = "Buscar...",
  title,
  infoLine,
  icon,
  iconColor = "sky",
  maxWidth = "max-w-2xl",
  columns,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  disabled = false,
  triggerClassName = "",
  showCount = false,
  cancelText = "Cancelar",
  confirmText = "Seleccionar",
  allowDeselect = true,
  onDeselect,
}: SelectModalProps<T>) {
  const [search, setSearch] = useState("");
  const [confirmedSelection, setConfirmedSelection] = useState<SelectModalOption<T> | null>(null);

  // Filtrado en cliente (rápido para < 5k registros)
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q) ||
        String(o.value).toLowerCase().includes(q),
    );
  }, [options, search]);

  // Columnas por defecto
  const defaultColumns = useMemo<Column<SelectModalOption<T>>[]>(() => [
    {
      key: "label",
      label: "Nombre",
      sortable: true,
      render: (opt) => (
        <div className="min-w-0">
          <div className="font-bold text-slate-800 truncate">{opt.label}</div>
          {opt.description && (
            <div className="text-[11px] text-slate-400 truncate font-medium">{opt.description}</div>
          )}
        </div>
      ),
    },
    {
      key: "value",
      label: "Valor",
      width: "8rem",
      align: "center",
      render: (opt) => (
        <span className="rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
          {opt.value}
        </span>
      ),
    },
  ], []);

  const tableColumns = columns ?? defaultColumns;

  const handleRowClick = (opt: SelectModalOption<T>) => {
    setConfirmedSelection(opt);
  };

  const handleConfirm = () => {
    if (confirmedSelection) {
      onSelect(confirmedSelection);
      onClose();
    }
  };

  const handleDeselect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (allowDeselect && onDeselect) {
      onDeselect();
    }
  };

  const isSelected = (opt: SelectModalOption<T>) => opt.value === selectedValue;
  const isConfirmed = (opt: SelectModalOption<T>) => confirmedSelection?.value === opt.value;

  const selectedOption = useMemo(
    () => options.find((o) => o.value === selectedValue),
    [options, selectedValue],
  );

  return (
    <div className="inline-flex items-center gap-2">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setSearch("");
            setConfirmedSelection(null);
            onOpen();
          }
        }}
        disabled={disabled}
        className={`
          inline-flex items-center justify-between gap-2 w-full min-w-[200px] max-w-[320px]
          rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold
          transition-all duration-200
          ${disabled
            ? "border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
            : "border-slate-200 text-slate-700 hover:border-sky-400 hover:bg-sky-50/50 hover:shadow-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"}
          ${triggerClassName}
        `}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="truncate text-left">
          {selectedOption ? selectedOption.label : triggerLabel}
        </span>
        <Search className={`h-4 w-4 shrink-0 ${disabled ? "text-slate-300" : "text-slate-400"}`} />
      </button>

      {/* Deselect — sibling del trigger para evitar nested interactive */}
      {selectedOption && allowDeselect && (
        <button
          type="button"
          onClick={handleDeselect}
          className="shrink-0 rounded-lg p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors border border-slate-200"
          aria-label="Deseleccionar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        infoLine={infoLine}
        icon={icon}
        iconColor={iconColor}
        maxWidth={maxWidth}
        hideCloseButton={false}
        closeDisabled={false}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:shadow-md"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!confirmedSelection}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 px-4 py-2 text-xs font-black text-white shadow-md shadow-sky-500/20 transition-all duration-200 hover:from-sky-700 hover:to-sky-600 hover:shadow-lg hover:shadow-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-sky-600 disabled:hover:to-sky-500"
            >
              <Check className="h-3.5 w-3.5" />
              {confirmText}
            </button>
          </div>
        }
      >
        {/* Search input */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && confirmedSelection) handleConfirm();
            }}
            autoFocus
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Results count */}
        <div className="mb-3 text-[11px] font-medium text-slate-500">
          {filteredOptions.length} de {options.length} opciones
          {search && <span className="text-sky-600 ml-1">(filtrado)</span>}
        </div>

        {/* Table */}
        <Table
          columns={tableColumns}
          data={filteredOptions}
          rowKey={(opt) => opt.value}
          isLoading={false}
          emptyMessage={emptyMessage}
          emptyState={
            <div className="py-12 text-center text-slate-400 font-medium italic">
              {emptyMessage}
            </div>
          }
          pageSize={15}
          maxHeight="45rem"
          rowHoverClass="hover:bg-sky-50/50 transition-colors cursor-pointer"
          alternating={false}
          onRowClick={handleRowClick}
          onRowDoubleClick={handleRowClick}
          selectedRowKey={confirmedSelection?.value}
          selectedRowClass="bg-sky-100 border-l-4 border-l-sky-500"
        />
      </Modal>
    </div>
  );
}