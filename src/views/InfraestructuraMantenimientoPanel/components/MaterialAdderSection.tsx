/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 2 de Infraestructura/Mantenimiento: configuración dinámica de
 * materiales/servicios — extraída de InfraestructuraMantenimientoPanel.
 */

import { useEffect, useState } from "react";
import { AlertCircle, Package, Plus, Trash2 } from "lucide-react";
import type { MaterialItem } from "../../../types";
import Card from "../../../components/UI/Card";
import NumericInput from "../../../components/UI/NumericInput";
import { Table } from "../../../components/UI/Table";
import SelectModal from "../../../components/UI/SelectModal";
import AlertBanner from "../../../components/UI/AlertBanner";
import { useToast } from "../../../components/UI/Toast";
import { formatCurrency } from "../../../utils";
import type { Column } from "../../../components/UI/Table";
import type { SelectModalOption } from "../../../components/UI/SelectModal";

type CatalogOption = SelectModalOption<{ name: string; unit: string; estimatedUnitPrice: number; index: number }>;

// Columnas explícitas: el default de SelectModal muestra una columna "Valor"
// con `opt.value` crudo (el índice del array usado para selección interna),
// no un precio. Acá mostramos Nombre / Unidad / Precio real del catálogo.
const catalogColumns: Column<CatalogOption>[] = [
  {
    key: "label",
    label: "Nombre",
    sortable: true,
    render: (opt) => <span className="font-bold text-slate-800">{opt.label}</span>,
  },
  {
    key: "unit",
    label: "Unidad",
    align: "center",
    render: (opt) => <span className="text-[11px] font-semibold text-slate-500">{opt.raw.unit}</span>,
  },
  {
    key: "estimatedUnitPrice",
    label: "Precio Unit. (Est)",
    align: "right",
    render: (opt) => (
      <span className="font-mono font-semibold text-slate-600">{formatCurrency(opt.raw.estimatedUnitPrice)}</span>
    ),
  },
];

interface MaterialAdderSectionProps {
  materialsCatalog: { name: string; unit: string; estimatedUnitPrice: number }[];
  addedMaterials: Omit<MaterialItem, "id">[];
  onAddedMaterialsChange: (materials: Omit<MaterialItem, "id">[]) => void;
  /** Error de validación del formulario padre (submit sin materiales). */
  materialsError?: string;
}

export default function MaterialAdderSection({
  materialsCatalog,
  addedMaterials,
  onAddedMaterialsChange,
  materialsError,
}: MaterialAdderSectionProps) {
  const [selectedCatalogIndex, setSelectedCatalogIndex] = useState(0);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [materialQty, setMaterialQty] = useState<number | "">(1);
  const [customMaterialName, setCustomMaterialName] = useState("");
  const [customMaterialUnit, setCustomMaterialUnit] = useState("Unidad");
  const [customMaterialPrice, setCustomMaterialPrice] = useState<number | "">(1.0);
  const [isCustomMaterial, setIsCustomMaterial] = useState(false);
  const [adderError, setAdderError] = useState("");
  const { showToast } = useToast();

  // Si el catálogo está vacío, el agregado personalizado es la única vía útil.
  useEffect(() => {
    if (materialsCatalog.length === 0 && !isCustomMaterial) setIsCustomMaterial(true);
  }, [materialsCatalog.length, isCustomMaterial]);

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    setAdderError("");
    const qtyNum = materialQty === "" ? 1 : materialQty;

    if (isCustomMaterial) {
      const name = customMaterialName.trim();
      if (!name) {
        setAdderError("Por favor, introduce el nombre del material personalizado.");
        document.getElementById("custom-mat-name")?.focus();
        return;
      }
      const priceNum = customMaterialPrice === "" ? 0 : customMaterialPrice;
      onAddedMaterialsChange([
        ...addedMaterials,
        { name, quantity: qtyNum, unit: customMaterialUnit, estimatedUnitPrice: priceNum },
      ]);
      setCustomMaterialName("");
      showToast(`${name} agregado al requerimiento.`, "success");
    } else {
      const selectedItem = materialsCatalog[selectedCatalogIndex];
      if (!selectedItem) return;
      onAddedMaterialsChange([
        ...addedMaterials,
        { name: selectedItem.name, quantity: qtyNum, unit: selectedItem.unit, estimatedUnitPrice: selectedItem.estimatedUnitPrice },
      ]);
      showToast(`${selectedItem.name} agregado al requerimiento.`, "success");
    }
  };

  const handleRemoveMaterial = (index: number) => {
    onAddedMaterialsChange(addedMaterials.filter((_, i) => i !== index));
  };

  const materialsSubtotal = addedMaterials.reduce((sum, m) => sum + m.quantity * m.estimatedUnitPrice, 0);

  return (
    <Card className="border-l-4 border-l-emerald-400 h-full flex flex-col">
      <div className="flex items-start gap-3 border-b border-slate-100 pb-4 mb-5">
        <div className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl">
          <Package className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-slate-900 text-sm">Configurar Requerimientos de Material / Servicios</h4>
          <p className="text-[11px] text-slate-500 font-medium">Seleccione del catálogo o agregue un material personalizado</p>
        </div>
        <div className="ml-auto shrink-0 text-right">
          <span className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Insumos agregados</span>
          <span className="flex items-baseline justify-end gap-1.5 mt-0.5">
            <span className="font-mono font-black text-slate-900 text-sm">{addedMaterials.length}</span>
            <span className="text-[9px] font-bold text-slate-400">·</span>
            <span className="font-mono font-black text-emerald-700 text-sm">{formatCurrency(materialsSubtotal)}</span>
          </span>
        </div>
      </div>

      {materialsError && (
        <AlertBanner
          type="error"
          message={materialsError}
          icon={<AlertCircle className="h-4 w-4 shrink-0" />}
          className="mb-4"
        />
      )}

      {adderError && (
        <AlertBanner
          type="error"
          message={adderError}
          icon={<AlertCircle className="h-4 w-4 shrink-0" />}
          className="mb-4"
        />
      )}

      {materialsCatalog.length === 0 && (
        <AlertBanner
          type="info"
          message="El catálogo IVOO está vacío. Usa la pestaña Personalizado para cargar el material o servicio."
          icon={<Package className="h-4 w-4 shrink-0" />}
          className="mb-4"
        />
      )}

      {/* Toggle catalog / custom */}
      <div className="flex gap-1 mb-5 p-1 bg-slate-100/60 rounded-xl text-xs font-bold w-fit">
        <button
          id="tab-catalog"
          type="button"
          onClick={() => setIsCustomMaterial(false)}
          className={`px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
            !isCustomMaterial
              ? "bg-white text-emerald-700 shadow-xs border border-slate-200/80 font-black"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Catálogo IVOO
        </button>
        <button
          id="tab-custom"
          type="button"
          onClick={() => setIsCustomMaterial(true)}
          className={`px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
            isCustomMaterial
              ? "bg-white text-emerald-700 shadow-xs border border-slate-200/80 font-black"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Personalizado
        </button>
      </div>

      <form onSubmit={handleAddMaterial} className="grid grid-cols-1 md:grid-cols-4 gap-3.5 items-end bg-gradient-to-br from-emerald-50/30 to-white p-5 rounded-xl border border-emerald-100/60">
        {!isCustomMaterial ? (
          <div className="md:col-span-2">
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Seleccionar Material</label>
            <SelectModal
              isOpen={isMaterialModalOpen}
              onClose={() => setIsMaterialModalOpen(false)}
              onOpen={() => setIsMaterialModalOpen(true)}
              onSelect={(opt) => {
                setSelectedCatalogIndex(opt.raw.index);
                setIsMaterialModalOpen(false);
              }}
              options={materialsCatalog.map((mat, i) => ({
                value: i,
                label: mat.name,
                description: `${mat.estimatedUnitPrice} / ${mat.unit}`,
                raw: { ...mat, index: i },
              }))}
              columns={catalogColumns}
              selectedValue={selectedCatalogIndex}
              allowDeselect={false}
              disabled={materialsCatalog.length === 0}
              triggerLabel="Seleccionar material del catálogo..."
              title="Seleccionar Material del Catálogo"
              infoLine={`${materialsCatalog.length} materiales disponibles`}
              icon={<Package className="h-5 w-5" />}
              iconColor="emerald"
              searchPlaceholder="Buscar por nombre, unidad o precio..."
              maxWidth="max-w-2xl"
              emptyMessage="No hay materiales en el catálogo aún."
            />
          </div>
        ) : (
          <>
            <div className="md:col-span-2">
              <label htmlFor="custom-mat-name" className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Nombre del Material / Servicio
              </label>
              <input
                id="custom-mat-name"
                type="text"
                placeholder="Ej. Mano de obra soldadura de vigas"
                value={customMaterialName}
                onChange={(e) => {
                  setCustomMaterialName(e.target.value);
                  setAdderError("");
                }}
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-800"
              />
            </div>
            <div>
              <label htmlFor="custom-mat-unit" className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Unidad
              </label>
              <input
                id="custom-mat-unit"
                type="text"
                placeholder="Ej. Unidad, m³, Kg, Rollo"
                value={customMaterialUnit}
                onChange={(e) => setCustomMaterialUnit(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700"
              />
            </div>
            <div>
              <label htmlFor="custom-mat-price" className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Costo Estimado ($)
              </label>
              <NumericInput
                id="custom-mat-price"
                value={customMaterialPrice}
                onChange={setCustomMaterialPrice}
                placeholder="0.00"
                step="0.01"
                className="rounded-lg"
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="mat-qty" className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Cantidad
          </label>
          <NumericInput
            id="mat-qty"
            value={materialQty}
            onChange={setMaterialQty}
            placeholder="0"
            step="1"
            className="rounded-lg"
          />
        </div>

        <div className="md:col-span-1">
          <button
            id="btn-add-material"
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 rounded-lg transition-all duration-200 cursor-pointer hover:shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </button>
        </div>
      </form>

      <div className="mt-5 border border-slate-100 rounded-xl overflow-hidden shadow-xs bg-white">
        <Table
          columns={[
            { key: "name", label: "Material / Servicio", render: (m) => <span className="text-slate-800 font-bold">{m.name}</span> },
            { key: "quantity", label: "Cantidad", align: "center", render: (m) => <span className="text-slate-600 font-medium">{m.quantity} {m.unit}</span> },
            { key: "estimatedUnitPrice", label: "Precio Unit. (Est)", align: "right", render: (m) => <span className="font-mono text-slate-500 font-semibold">{formatCurrency(m.estimatedUnitPrice)}</span> },
            { key: "total", label: "Total (Est)", align: "right", render: (m) => <span className="font-mono font-bold text-slate-900">{formatCurrency(m.quantity * m.estimatedUnitPrice)}</span> },
            {
              key: "actions",
              label: "Remover",
              align: "center",
              render: (_m, index) => (
                <button
                  id={`btn-remove-mat-${index}`}
                  type="button"
                  onClick={() => handleRemoveMaterial(index)}
                  className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ),
            },
          ]}
          data={addedMaterials}
          rowKey={(_m, index) => index}
          emptyMessage="No se han agregado materiales. Agregue elementos arriba."
          pageSize={5}
          footer={addedMaterials.length > 0 ? (
            <tr>
              <td colSpan={3} className="py-3.5 px-4 text-right text-slate-500 uppercase tracking-wider text-[9px] font-bold">Costo Estimado Materiales:</td>
              <td className="py-3.5 px-4 text-right font-mono text-emerald-700 text-sm font-black">{formatCurrency(materialsSubtotal)}</td>
              <td />
            </tr>
          ) : undefined}
        />
      </div>
    </Card>
  );
}
