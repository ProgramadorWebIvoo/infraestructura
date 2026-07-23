/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Infraestructura / Mantenimiento: creación de peticiones de obra.
 */

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
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
  Eye,
  Search,
} from "lucide-react";
import { containerVariants, itemVariants } from "../animations";
import { SkeletonCard, SkeletonBlock } from "../components/SkeletonLoader";
import Card from "../components/UI/Card";
import SectionHeader from "../components/UI/SectionHeader";
import NumericInput from "../components/UI/NumericInput";
import AlertBanner from "../components/UI/AlertBanner";
import { Table, type Column } from "../components/UI/Table";
import InspectRequestModal from "../components/Modals/InspectRequestModal";
import SelectModal from "../components/UI/SelectModal";

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
  // Form states
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"INFRAESTRUCTURA" | "MANTENIMIENTO">("INFRAESTRUCTURA");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  // Material adder states
  const [selectedCatalogIndex, setSelectedCatalogIndex] = useState(0);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
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
  const [inspectedRequest, setInspectedRequest] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  if (isLoading) return <InfraestructuraSkeleton />;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!title.trim()) { setErrorMsg("El título del proyecto o trabajo es obligatorio."); return; }
    if (!location.trim()) { setErrorMsg("La ubicación exacta es obligatoria."); return; }
    if (!description.trim()) { setErrorMsg("Por favor, proporciona una descripción del trabajo."); return; }
    if (addedMaterials.length === 0) { setErrorMsg("Debes agregar al menos un material o servicio a la petición."); return; }

    setIsSubmitting(true);
    try {
      onAddProject({
        title, type, description, location,
        materials: addedMaterials.map((m, index) => ({ id: `m-new-${index}-${Date.now()}`, ...m })),
        estimatedTotal: materialsSubtotal,
      });

      setTitle(""); setDescription(""); setLocation("");
      setAddedMaterials([]);
      setSuccessMsg("Petición de Infraestructura registrada con éxito y enviada a Cierre de Obra.");
      setErrorMsg("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-6" variants={containerVariants} initial="hidden" animate="visible">

      {/* Left 2 Columns: Creation Form */}
      <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
        <h1 className="sr-only">Infraestructura / Mantenimiento</h1>
        <Card className="border-l-4 border-l-sky-400">
          <SectionHeader
            icon={<FilePlus2 className="h-5 w-5" />}
            title="Crear Nueva Petición de Obra / Trabajo"
            description="Formule su requerimiento y defina los materiales necesarios para iniciar el flujo de aprobación."
          />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Título de la Obra</label>
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
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Ubicación / Tienda / CD</label>
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
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Requerimiento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="type-infra"
                    type="button"
                    onClick={() => setType("INFRAESTRUCTURA")}
                    className={`p-3 rounded-xl border text-xs font-bold text-center transition-all duration-200 cursor-pointer ${
                      type === "INFRAESTRUCTURA"
                        ? "border-sky-500 bg-gradient-to-br from-sky-50 to-sky-100/50 text-sky-700 font-black shadow-sm shadow-sky-200/50"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-semibold"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span>Obras /</span>
                      <span>Infraestructura</span>
                    </div>
                  </button>
                  <button
                    id="type-mant"
                    type="button"
                    onClick={() => setType("MANTENIMIENTO")}
                    className={`p-3 rounded-xl border text-xs font-bold text-center transition-all duration-200 cursor-pointer ${
                      type === "MANTENIMIENTO"
                        ? "border-slate-800 bg-gradient-to-br from-slate-800 to-slate-900 text-white font-black shadow-md shadow-slate-900/20"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-semibold"
                    }`}
                  >
                    Mantenimiento
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Descripción del Trabajo</label>
                <textarea
                  id="req-description"
                  placeholder="Detallar detalladamente el alcance físico, áreas a intervenir, especificaciones de la instalación..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 bg-white font-medium text-slate-700"
                />
                <span className="text-[9px] text-slate-400 font-mono mt-1 block text-right">{description.length}/2000</span>
              </div>
            </div>

            {errorMsg && <AlertBanner type="error" message={errorMsg} icon={<AlertCircle className="h-4 w-4 shrink-0" />} />}
            {successMsg && <AlertBanner type="success" message={successMsg} icon={<CheckCircle className="h-4 w-4 shrink-0" />} />}

            <div className="flex justify-end pt-2">
              <button
                id="btn-submit-project"
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-3 text-xs font-bold bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white rounded-xl shadow-md shadow-sky-500/20 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-sky-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isSubmitting ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isSubmitting ? "Enviando..." : "Enviar Petición a Cierre de Obra"}
              </button>
            </div>
          </form>
        </Card>

        {/* Dynamic Material Adder */}
        <Card className="border-l-4 border-l-emerald-400">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Configurar Requerimientos de Material / Servicios</h4>
              <p className="text-[11px] text-slate-500 font-medium">Seleccione del catálogo o agregue un material personalizado</p>
            </div>
          </div>

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
                  selectedValue={selectedCatalogIndex}
                  triggerLabel="Seleccionar material del catálogo..."
                  title="Seleccionar Material del Catálogo"
                  infoLine={`${materialsCatalog.length} materiales disponibles`}
                  icon={<Package className="h-5 w-5" />}
                  iconColor="emerald"
                  searchPlaceholder="Buscar por nombre, unidad o precio..."
                  maxWidth="max-w-2xl"
                />
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
              pageSize={5}
              footer={addedMaterials.length > 0 ? (
                <tr>
                  <td colSpan={3} className="py-3.5 px-4 text-right text-slate-500 uppercase tracking-wider text-[9px] font-bold">Costo Estimado Materiales:</td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-700 text-sm font-black">${materialsSubtotal.toFixed(2)}</td>
                  <td />
                </tr>
              ) : undefined}
            />
          </div>
        </Card>
      </motion.div>

      {/* Right Column: Info + Existing Requests */}
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="bg-slate-900 text-slate-300 rounded-2xl p-6 border border-slate-800 shadow-md border-l-4 border-l-sky-400">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-sky-500/10 rounded-xl">
              <DollarSign className="h-4 w-4 text-sky-400" />
            </div>
            <div>
              <h4 className="font-mono font-bold text-[10px] uppercase tracking-widest text-sky-400">
                Gestión de Inversiones e Insumos
              </h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Al registrar una obra, la base de datos almacena el requerimiento técnico inicial de materiales.
              </p>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-800 pt-4 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-sky-500/10 text-sky-400 font-mono text-[10px] font-black shrink-0">1</span>
              <span className="text-slate-400 font-medium leading-relaxed">El departamento técnico define los metros cúbicos, sacos o lámparas estimadas.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-sky-500/10 text-sky-400 font-mono text-[10px] font-black shrink-0">2</span>
              <span className="text-slate-400 font-medium leading-relaxed"><strong className="text-slate-300">Cierre de Obra</strong> verificará el volumen, los planos y la viabilidad física de la instalación.</span>
            </div>
          </div>
        </div>

        <div>
          <Card className="min-h-139 border-l-4 border-l-slate-400">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-4">
              <div className="p-2 bg-slate-100 rounded-xl">
                <FilePlus2 className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Peticiones del Departamento</h4>
                <p className="text-[10px] text-slate-400 font-medium">{projects.length} registradas</p>
              </div>
            </div>
            <div
              className="space-y-3 overflow-y-auto pr-1 max-h-[420px]"
              style={{ willChange: "scroll-position" }}
            >
              {projects.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">No hay peticiones registradas aún.</p>
              ) : (
                projects.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 border border-slate-100 bg-white rounded-xl space-y-2.5 hover:border-slate-200 hover:shadow-sm transition-all duration-200"
                    style={{ contentVisibility: "auto", contain: "layout style paint" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[9px] font-mono font-bold text-sky-600">{p.id}</span>
                        <h5 className="text-xs font-bold text-slate-800 line-clamp-1 mt-0.5">{p.title}</h5>
                      </div>
                      <span className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-lg border shrink-0 ${
                        p.type === "INFRAESTRUCTURA" ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        {p.type === "INFRAESTRUCTURA" ? "INFRA" : "MANT"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 font-mono font-bold text-slate-700">
                        <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                        {p.estimatedTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          id={`btn-inspect-request-${p.id}`}
                          onClick={() => setInspectedRequest(p)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-sky-700 bg-sky-50 border border-sky-100 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          Inspeccionar
                        </button>
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-mono font-bold">{p.status}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </motion.div>

      <InspectRequestModal
        isOpen={!!inspectedRequest}
        project={inspectedRequest}
        onClose={() => setInspectedRequest(null)}
      />
    </motion.div>
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
