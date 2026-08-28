/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Catálogo maestro de productos — tercera tab de Proveedores. Alimentado
 * por las propuestas de materiales de proveedores (CatalogSyncService en el
 * backend); cada fila es un producto real que al menos un proveedor cotizó.
 * Mismo vocabulario que ContractorsSection (Card+TableToolbar+Table), sin
 * toggle de grid: la info relevante por fila (categoría, precio estimado,
 * proveedores) es más legible en tabla que en tarjetas.
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Boxes, PackageSearch, Sparkles } from "lucide-react";
import { itemVariants } from "../../../animations";
import Card from "../../../components/UI/Card";
import TableToolbar from "../../../components/UI/TableToolbar";
import EmptyState from "../../../components/UI/EmptyState";
import { Table, type Column } from "../../../components/UI/Table";
import { useContainerRows } from "../../../hooks/useContainerRows";
import type { BaseCurrency, CatalogCategory, CatalogProduct } from "../../../types";
import type { SelectOption } from "../../../components/UI/FilterBar";

interface CatalogSectionProps {
  products: CatalogProduct[];
  categories: CatalogCategory[];
  isLoading: boolean;
  onOpenProduct: (product: CatalogProduct) => void;
  baseCurrency: BaseCurrency | null;
  convertFromUsd: (amountUsd: number) => number;
}

export default function CatalogSection({ products, categories, isLoading, onOpenProduct, baseCurrency, convertFromUsd }: CatalogSectionProps) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { containerRef, rows: pageSize } = useContainerRows();

  const categoryOptions: SelectOption[] = useMemo(
    () => [{ value: "all", label: "Todas las categorías" }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))],
    [categories],
  );

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.unit.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || String(p.category_id) === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [products, query, categoryFilter]);

  const columns: Column<CatalogProduct>[] = useMemo(() => [
    {
      key: "name",
      label: "Producto",
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">{p.name}</span>
          {p.is_custom_origin && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-600" title="Nació de un producto personalizado declarado por un proveedor">
              <Sparkles className="h-2.5 w-2.5" /> Personalizado
            </span>
          )}
        </div>
      ),
    },
    {
      key: "category",
      label: "Categoría",
      sortable: true,
      sortValue: (p) => p.category?.name ?? "",
      render: (p) => p.category ? (
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{p.category.name}</span>
      ) : (
        <span className="text-slate-400 italic">Sin categoría</span>
      ),
    },
    { key: "unit", label: "Unidad", width: "6rem" },
    {
      key: "estimated_unit_price",
      label: `Precio ref. (${baseCurrency?.code ?? "USD"})`,
      width: "9rem",
      align: "right",
      sortable: true,
      render: (p) => (
        <span className="font-mono font-bold text-slate-700">
          {baseCurrency?.symbol ?? "$"}{convertFromUsd(p.estimated_unit_price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "suppliers",
      label: "Proveedores",
      width: "8rem",
      align: "center",
      sortValue: (p) => p.suppliers?.length ?? 0,
      render: (p) => (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 font-mono text-[11px] font-black text-sky-600">
          <Boxes className="h-3.5 w-3.5" />
          {p.suppliers?.length ?? 0}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "Estado",
      width: "6rem",
      align: "center",
      render: (p) => (
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${p.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
          {p.is_active ? "Activo" : "Inactivo"}
        </span>
      ),
    },
  ], [baseCurrency, convertFromUsd]);

  return (
    <Card accent="info" fillHeight className="min-h-0 flex-1 p-0 overflow-hidden flex flex-col">
      <TableToolbar
        searchId="catalog-product-search"
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Buscar por nombre o unidad..."
        searchAriaLabel="Buscar productos de catálogo"
        filter={{
          id: "catalog-category-filter",
          value: categoryFilter,
          onChange: setCategoryFilter,
          ariaLabel: "Filtrar por categoría",
          options: categoryOptions,
        }}
        countIcon={<PackageSearch />}
        filteredCount={filteredProducts.length}
        totalCount={products.length}
        noun="producto"
        nounPlural="productos"
      />

      <motion.div variants={itemVariants} initial="hidden" animate="visible" ref={containerRef} className="flex-1 min-h-0 px-6 pb-6 pt-4">
        <Table
          columns={columns}
          data={filteredProducts}
          rowKey={(p) => p.id}
          isLoading={isLoading}
          pageSize={pageSize}
          fillViewport
          stickyHeader
          onRowClick={(p) => onOpenProduct(p)}
          emptyState={
            <EmptyState
              message={products.length === 0 ? "Aún no hay productos en el catálogo — se generan automáticamente al recibir propuestas de proveedores." : "No se encontraron productos con ese criterio."}
              icon={<PackageSearch className="h-8 w-8" />}
            />
          }
        />
      </motion.div>
    </Card>
  );
}
