/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 1 de Analistas: carga de propuestas de contratistas — extraída de
 * AnalistasPanel.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Project, Contractor, Proposal } from "../../../types";
import { FileSpreadsheet, FolderOpen, MapPin, Plus, Users } from "lucide-react";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import NumericInput from "../../../components/UI/NumericInput";
import EmptyState from "../../../components/UI/EmptyState";
import SelectModal from "../../../components/UI/SelectModal";
import Button from "../../../components/UI/Button";
import { formatNumber } from "../../../utils";

interface BidRegistrationSectionProps {
  pendingLicitacion: Project[];
  contractors: Contractor[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  activeProject: Project | undefined;
  onAddProposal: (projectId: string, proposal: Omit<Proposal, "id">) => void;
}

export default function BidRegistrationSection({
  pendingLicitacion,
  contractors,
  selectedProjectId,
  onSelectProject,
  activeProject,
  onAddProposal,
}: BidRegistrationSectionProps) {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [contractorCode, setContractorCode] = useState(contractors[0]?.code ?? "");
  const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);
  const [materialCost, setMaterialCost] = useState<number | "">(1000);
  const [laborCost, setLaborCost] = useState<number | "">(800);
  const [deliveryWeeks, setDeliveryWeeks] = useState<number | "">(2);
  const [advancePercent, setAdvancePercent] = useState(30);
  const [description, setDescription] = useState("");

  // Project options for SelectModal
  const projectOptions = pendingLicitacion.map(p => ({
    value: p.id,
    label: p.title,
    description: `${p.id} · ${p.location} · $${p.approvedInvestmentAmount?.toLocaleString("en-US") ?? "—"} Max`,
    raw: p,
  }));

  // Contractor options for SelectModal
  const contractorOptions = contractors.map(c => ({
    value: c.code,
    label: c.name,
    description: `${c.code} · ${c.specialty} · Rating: ${c.rating.toFixed(1)}`,
    raw: c,
  }));

  const newTotal = (Number(materialCost) || 0) + (Number(laborCost) || 0);

  const handleAddProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    const contractor = contractors.find(c => c.code === contractorCode);
    if (!contractor) return;

    const matCostNum = Number(materialCost || 0);
    const laborCostNum = Number(laborCost || 0);
    const delWeeksNum = Number(deliveryWeeks || 1);

    onAddProposal(selectedProjectId, {
      contractorCode: contractor.code,
      contractorName: contractor.name,
      contractorRating: contractor.rating,
      materialCost: matCostNum,
      laborCost: laborCostNum,
      totalCost: matCostNum + laborCostNum,
      deliveryWeeks: delWeeksNum,
      negotiatedAdvancePercent: advancePercent,
      description: description.trim() || `Propuesta para trabajos de ${activeProject?.title}. Incluye materiales e instalación certificada.`
    });

    setDescription("");
    setMaterialCost(1000);
    setLaborCost(800);
    setDeliveryWeeks(2);
  };

  return (
    <Card className="border-l-4 border-l-emerald-400 h-full flex flex-col">
      <SectionHeader
        icon={<FileSpreadsheet className="h-5 w-5" />}
        title="Carga de Propuestas de Contratistas"
        description="Reciba y digitalice ofertas para consolidar cuadros comparativos. Los contratistas operan bajo códigos únicos asignados."
      />

      {pendingLicitacion.length === 0 ? (
        <div className="flex-1 flex items-center">
          <EmptyState
            className="w-full"
            icon={<FolderOpen className="h-8 w-8" />}
            message="No hay expedientes en licitación activa. Vaya al panel de Procura o Cierre de Obra para avanzar flujos."
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-4">
          {/* Select Project - using SelectModal */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Seleccionar Expediente a Cotizar:</label>
            <SelectModal
              isOpen={isProjectModalOpen}
              onClose={() => setIsProjectModalOpen(false)}
              onOpen={() => setIsProjectModalOpen(true)}
              onSelect={(opt) => onSelectProject(opt.value as string)}
              onDeselect={() => onSelectProject("")}
              options={projectOptions}
              selectedValue={selectedProjectId}
              triggerLabel="Seleccionar obra..."
              title="Seleccionar Expediente"
              infoLine={`${projectOptions.length} obras en licitación`}
              icon={<FileSpreadsheet className="h-5 w-5" />}
              iconColor="emerald"
              maxWidth="max-w-2xl"
              searchPlaceholder="Buscar por título, ID, ubicación..."
            />
          </div>

          <AnimatePresence>
            {activeProject && (
              <motion.div
                key="analistas-project-detail"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-5 pt-2"
              >
                {/* Resumen del expediente seleccionado */}
                <div className="p-4 bg-gradient-to-br from-emerald-50/40 to-white rounded-xl border border-emerald-100/60 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[9px] font-bold text-emerald-600">{activeProject.id}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">{activeProject.title}</h4>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                    <MapPin className="h-3 w-3 shrink-0" /> {activeProject.location}
                  </p>
                </div>

                {/* Adder Form */}
                <form onSubmit={handleAddProposal} className="p-5 bg-gradient-to-br from-emerald-50/30 to-white rounded-xl border border-emerald-100/60 space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-emerald-100/60">
                    <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                      <Users className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800">Registrar Oferta del Proveedor</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Proveedor / Contratista</label>
                      <SelectModal
                        isOpen={isContractorModalOpen}
                        onClose={() => setIsContractorModalOpen(false)}
                        onOpen={() => setIsContractorModalOpen(true)}
                        onSelect={(opt) => setContractorCode(opt.value as string)}
                        onDeselect={() => setContractorCode("")}
                        options={contractorOptions}
                        selectedValue={contractorCode}
                        triggerLabel="Seleccionar proveedor..."
                        title="Seleccionar Proveedor"
                        infoLine={`${contractorOptions.length} proveedores disponibles`}
                        icon={<Users className="h-5 w-5" />}
                        iconColor="sky"
                        maxWidth="max-w-xl"
                        searchPlaceholder="Buscar por nombre, código, especialidad..."
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Semanas de Ejecución</label>
                      <NumericInput
                        id="analistas-weeks"
                        value={deliveryWeeks}
                        onChange={setDeliveryWeeks}
                        min={1}
                        integer
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Costo Materiales ($)</label>
                      <NumericInput
                        id="analistas-mat-cost"
                        value={materialCost}
                        onChange={setMaterialCost}
                        min={0}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Costo Mano de Obra ($)</label>
                      <NumericInput
                        id="analistas-labor-cost"
                        value={laborCost}
                        onChange={setLaborCost}
                        min={0}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Anticipo Negociado (%)</label>
                      <select
                        id="analistas-advance"
                        value={advancePercent}
                        onChange={(e) => setAdvancePercent(parseInt(e.target.value))}
                        className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-slate-700 font-bold cursor-pointer"
                      >
                        <option value="10">10%</option>
                        <option value="20">20%</option>
                        <option value="30">30%</option>
                        <option value="40">40%</option>
                        <option value="50">50%</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alcance y Condiciones de la Oferta</label>
                    <input
                      id="analistas-bid-desc"
                      type="text"
                      placeholder="Ej. Suministro total de cables, incluye garantía y flete."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-slate-700 font-medium"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-emerald-100/60">
                    <div className="text-xs font-bold text-slate-700">
                      Costo Total Oferta: <span className="font-mono text-emerald-700 text-sm font-black">${formatNumber(newTotal)}</span>
                    </div>
                    <Button
                      id="btn-analistas-add-bid"
                      type="submit"
                      variant="primary"
                      colorScheme="emerald"
                      icon={<Plus className="h-4 w-4" />}
                    >
                      Agregar al Cuadro
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}