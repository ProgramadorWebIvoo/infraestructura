/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Infraestructura / Mantenimiento: creación de peticiones de obra.
 */

import { useState, useEffect, useRef } from "react";
import { Project, MaterialItem } from "../types";
import {
  Plus,
  Trash2,
  Send,
  CheckCircle,
  AlertCircle,
  FilePlus2,
  Package,
  DollarSign,
  MapPin,
} from "lucide-react";
import { SkeletonCard, SkeletonBlock } from "../components/SkeletonLoader";
import Card from "../components/UI/Card";
import SectionHeader from "../components/UI/SectionHeader";
import NumericInput from "../components/UI/NumericInput";
import AlertBanner from "../components/UI/AlertBanner";
import { Table, type Column } from "../components/UI/Table";

interface InfraestructuraMantenimientoPanelProps {
  onAddProject: (project: Omit<Project, "id" | "createdDate" | "status">) => void;
  projects: Project[];
  materialsCatalog: { name: string; unit: string; estimatedUnitPrice: number }[];
  isLoading?: boolean;
}

export default function InfraestructuraMantenimientoPanel({
  onAddProject,
  projects,
  materialsCatalog,
  isLoading = false,
}: InfraestructuraMantenimientoPanelProps) {
  if (isLoading) return <InfraestructuraSkeleton />;

  // Form states
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"INFRAESTRUCTURA" | "MANTENIMIENTO">("INFRAESTRUCTURA");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  // Material adder states
  const [selectedCatalogIndex, setSelectedCatalogIndex] = useState(0);
  const [materialQty, setMaterialQty] = useState<number | "">(1);
  const [customMaterialName, setCustomMaterialName] = useState("");
  const [customMaterialUnit, setCustomMaterialUnit] = useState("Unidad");
  const [customMaterialPrice, setCustomMaterialPrice] = useState<number | "">(1.0);
  const [isCustomMaterial, setIsCustomMaterial] = useState(false);

  // Added materials state
  const [addedMaterials, setAddedMaterials] = useState<Omit<MaterialItem, "id">[]>([]);

  // Validation messages
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-clear success message after 4s
  const successTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    if (successMsg) {
      successTimerRef.current = setTimeout(() => setSuccessMsg(""), 4000);
      return () => {
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
      };
    }
  }, [successMsg]);

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = materialQty === "" ? 1 : materialQty;

    if (isCustomMaterial) {
      if (!customMaterialName.trim()) {
        setErrorMsg("Por favor, introduce el nombre del material personalizado.");
        return;
      }
      const priceNum = customMaterialPrice === "" ? 0 : customMaterialPrice;
      setAddedMaterials([
        ...addedMaterials,
        { name: customMaterialName, quantity: qtyNum, unit: customMaterialUnit, estimatedUnitPrice: priceNum },
      ]);
      setCustomMaterialName("");
    } else {
      const selectedItem = materialsCatalog[selectedCatalogIndex];
      if (!selectedItem) return;
      setAddedMaterials([
        ...addedMaterials,
        { name: selectedItem.name, quantity: qtyNum, unit: selectedItem.unit, estimatedUnitPrice: selectedItem.estimatedUnitPrice },
      ]);
    }
    setErrorMsg("");
  };

  const handleRemoveMaterial = (index: number) => {
    setAddedMaterials(addedMaterials.filter((_, i) => i !== index));
  };

  const materialsSubtotal = addedMaterials.reduce((sum, m) => sum + m.quantity * m.estimatedUnitPrice, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setErrorMsg("El título del proyecto o trabajo es obligatorio."); return; }
    if (!location.trim()) { setErrorMsg("La ubicación exacta es obligatoria."); return; }
    if (!description.trim()) { setErrorMsg("Por favor, proporciona una descripción del trabajo."); return; }
    if (addedMaterials.length === 0) { setErrorMsg("Debes agregar al menos un material o servicio a la petición."); return; }

    onAddProject({
      title, type, description, location,
      materials: addedMaterials.map((m, index) => ({ id: `m-new-${index}-${Date.now()}`, ...m })),
      estimatedTotal: materialsSubtotal,
    });

    setTitle(""); setDescription(""); setLocation("");
    setAddedMaterials([]);
    setSuccessMsg("Petición de Infraestructura registrada con éxito y enviada a Cierre de Obra.");
    setErrorMsg("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Left 2 Columns: Creation Form */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <SectionHeader
            icon={<FilePlus2 className="h-5 w-5" />}
            title="Crear Nueva Petición de Obra / Trabajo"
            description="Formule su requerimiento y defina los materiales necesarios para iniciar el flujo de aprobación."
          />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Título de la Obra</label>
                <input
                  id="req-title"
                  type="text"
                  placeholder="Ej. Remodelación Oficinas Administrativas Piso 2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 bg-white font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ubicación / Tienda / CD</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    id="req-location"
                    type="text"
                    placeholder="Ej. Tienda IVOO Chacao / CD Central"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10 w-full text-xs px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 bg-white font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tipo de Requerimiento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="type-infra"
                    type="button"
                    onClick={() => setType("INFRAESTRUCTURA")}
                    className={`p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      type === "INFRAESTRUCTURA"
                        ? "border-sky-500 bg-sky-50/50 text-sky-700 font-black shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold"
                    }`}
                  >
                    Obras / Infraestructura
                  </button>
                  <button
                    id="type-mant"
                    type="button"
                    onClick={() => setType("MANTENIMIENTO")}
                    className={`p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      type === "MANTENIMIENTO"
                        ? "border-slate-800 bg-slate-900 text-white font-black shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold"
                    }`}
                  >
                    Mantenimiento
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Descripción del Trabajo</label>
                <textarea
                  id="req-description"
                  placeholder="Detallar detalladamente el alcance físico, áreas a intervenir, especificaciones de la instalación..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 bg-white font-medium text-slate-700"
                />
              </div>
            </div>

            {errorMsg && <AlertBanner type="error" message={errorMsg} icon={<AlertCircle className="h-4 w-4 shrink-0" />} />}
            {successMsg && <AlertBanner type="success" message={successMsg} icon={<CheckCircle className="h-4 w-4 shrink-0" />} />}

            <div className="flex justify-end pt-2">
              <button
                id="btn-submit-project"
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-3 text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-md shadow-sky-500/10 transition-all cursor-pointer transform hover:scale-[1.01]"
              >
                <Send className="h-4 w-4" />
                Enviar Petición a Cierre de Obra
              </button>
            </div>
          </form>
        </Card>

        {/* Dynamic Material Adder */}
        <Card>
          <h4 className="font-sans font-bold text-slate-900 text-sm mb-5 flex items-center gap-2">
            <Package className="h-4 w-4 text-sky-500" />
            Configurar Requerimientos de Material / Servicios
          </h4>

          {/* Toggle catalog / custom */}
          <div className="flex border-b border-slate-100 mb-5 text-xs font-bold">
            <button
              id="tab-catalog"
              type="button"
              onClick={() => setIsCustomMaterial(false)}
              className={`pb-2 px-4 transition-all cursor-pointer ${!isCustomMaterial ? "border-b-2 border-sky-500 text-sky-600 font-black" : "text-slate-400 hover:text-slate-600"}`}
            >
              Catálogo Predefinido IVOO
            </button>
            <button
              id="tab-custom"
              type="button"
              onClick={() => setIsCustomMaterial(true)}
              className={`pb-2 px-4 transition-all cursor-pointer ${isCustomMaterial ? "border-b-2 border-sky-500 text-sky-600 font-black" : "text-slate-400 hover:text-slate-600"}`}
            >
              Material o Servicio Personalizado
            </button>
          </div>

          <form onSubmit={handleAddMaterial} className="grid grid-cols-1 md:grid-cols-4 gap-3.5 items-end bg-slate-50/50 p-4.5 rounded-xl border border-slate-100">
            {!isCustomMaterial ? (
              <div className="md:col-span-2">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Seleccionar Material</label>
                <select
                  id="select-material"
                  value={selectedCatalogIndex}
                  onChange={(e) => setSelectedCatalogIndex(Number(e.target.value))}
                  className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700"
                >
                  {materialsCatalog.map((mat, i) => (
                    <option key={i} value={i}>{mat.name} (${mat.estimatedUnitPrice} / {mat.unit})</option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre del Material / Servicio</label>
                  <input
                    id="custom-mat-name"
                    type="text"
                    placeholder="Ej. Mano de obra soldadura de vigas"
                    value={customMaterialName}
                    onChange={(e) => setCustomMaterialName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Unidad</label>
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
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Costo Estimado ($)</label>
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
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cantidad</label>
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
                className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-sky-700 bg-sky-50 border border-sky-100 hover:bg-sky-100 rounded-lg transition-all cursor-pointer"
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
                { key: "estimatedUnitPrice", label: "Precio Unit. (Est)", align: "right", render: (m) => <span className="font-mono text-slate-500 font-semibold">${m.estimatedUnitPrice.toFixed(2)}</span> },
                { key: "total", label: "Total (Est)", align: "right", render: (m) => <span className="font-mono font-bold text-slate-900">${(m.quantity * m.estimatedUnitPrice).toFixed(2)}</span> },
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
              pageSize={10}
              footer={addedMaterials.length > 0 ? (
                <tr>
                  <td colSpan={3} className="py-3.5 px-4 text-right text-slate-500 uppercase tracking-wider text-[9px]">Costo Estimado Materiales:</td>
                  <td className="py-3.5 px-4 text-right font-mono text-sky-700 text-sm font-black">${materialsSubtotal.toFixed(2)}</td>
                  <td />
                </tr>
              ) : undefined}
            />
          </div>
        </Card>
      </div>

      {/* Right Column: Info + Existing Requests */}
      <div className="space-y-6">
        <div className="bg-slate-900 text-slate-300 rounded-2xl p-6 border border-slate-800 shadow-md">
          <h4 className="font-sans font-bold text-white text-sm mb-3 uppercase tracking-wider font-mono text-[10px] text-sky-400">
            Gestión de Inversiones e Insumos
          </h4>
          <p className="text-xs leading-relaxed text-slate-400 font-medium">
            Al registrar una obra, la base de datos almacena el requerimiento técnico inicial de materiales.
          </p>
          <div className="mt-4 border-t border-slate-800 pt-4 space-y-3.5 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="font-mono text-sky-400 font-bold">1.</span>
              <span className="text-slate-400 font-medium">El departamento técnico define los metros cúbicos, sacos o lámparas estimadas.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="font-mono text-sky-400 font-bold">2.</span>
              <span className="text-slate-400 font-medium"><strong>Cierre de Obra</strong> verificará el volumen, los planos y la viabilidad física de la instalación.</span>
            </div>
          </div>
        </div>

        {/* Existing Requests sidebar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-300">
          <h4 className="font-sans font-bold text-slate-400 text-[10px] uppercase tracking-wider font-mono mb-4">
            Peticiones del Departamento
          </h4>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {projects.map((p) => (
              <div key={p.id} className="p-3.5 border border-slate-100 bg-slate-50/50 rounded-xl space-y-2 hover:border-slate-200 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-sky-600">{p.id}</span>
                    <h5 className="text-xs font-bold text-slate-800 line-clamp-1">{p.title}</h5>
                  </div>
                  <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-lg border ${
                    p.type === "INFRAESTRUCTURA" ? "bg-sky-50 text-sky-800 border-sky-100" : "bg-slate-200/60 text-slate-800 border-slate-300/60"
                  }`}>
                    {p.type.substring(0, 5)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1 font-mono font-bold text-slate-700">
                    <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                    {p.estimatedTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-mono font-bold">{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

/* ─── Skeleton Loader ─── */
function InfraestructuraSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="space-y-6">
        <div className="bg-slate-900 rounded-2xl p-6 space-y-3">
          <SkeletonBlock className="h-4 w-48 bg-slate-700" />
          <SkeletonBlock className="h-3 w-full bg-slate-700" />
          <SkeletonBlock className="h-3 w-5/6 bg-slate-700" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <SkeletonBlock className="h-3 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-3 border border-slate-100 rounded-xl space-y-2">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-4 w-3/4" />
              <SkeletonBlock className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
