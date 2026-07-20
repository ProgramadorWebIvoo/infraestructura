/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Contractor, Project, ProjectStatus, SupplierMaterialProposal } from "../types";
import { useToast } from "../components/UI/Toast";
import {
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Link2,
  Loader2,
  Mail,
  Package,
  Pencil,
  RotateCcw,
  Search,
  Star,
  Users,
  X,
} from "lucide-react";
import { SkeletonBlock, SkeletonTable } from "../components/SkeletonLoader";
import { Table, type Column } from "../components/UI/Table";
import { apiFetch } from "../services/api";

interface ProveedoresRegistradosProps {
  contractors: Contractor[];
  projects: Project[];
  authToken: string;
  onUpdateContractorRating: (code: string, rating: number) => Promise<void>;
  isLoading?: boolean;
}

export default function ProveedoresRegistrados({
  contractors,
  projects,
  authToken,
  onUpdateContractorRating,
  isLoading = false,
}: ProveedoresRegistradosProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");

  // Rating modal state
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [editRating, setEditRating] = useState<number | "">(0);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Invite modal state
  const [inviteModalContractor, setInviteModalContractor] = useState<Contractor | null>(null);
  const [inviteProjectId, setInviteProjectId] = useState("");
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [generatedToken, setGeneratedToken] = useState("");
  const [generatedProjectTitle, setGeneratedProjectTitle] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  // Proposals state
  const [proposals, setProposals] = useState<SupplierMaterialProposal[]>([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState(true);
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  const [proposalSearch, setProposalSearch] = useState("");

  useEffect(() => {
    if (!authToken) return;
    const load = async () => {
      try {
        const data = await apiFetch<SupplierMaterialProposal[]>("/supplier-material-proposals", { token: authToken });
        setProposals(data);
      } catch {
        // silently ignore
      } finally {
        setIsLoadingProposals(false);
      }
    };
    load();
  }, [authToken]);

  const activeProjects = projects.filter((p) => p.status !== ProjectStatus.COMPLETADO_PAGADO);

  const filteredContractors = contractors.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.specialty.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProposals = proposals.filter(
    (p) =>
      p.supplierName.toLowerCase().includes(proposalSearch.toLowerCase()) ||
      (p.supplierCompany ?? "").toLowerCase().includes(proposalSearch.toLowerCase()) ||
      p.projectTitleSnapshot.toLowerCase().includes(proposalSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(proposalSearch.toLowerCase())
  );

  // --- Rating modal handlers ---
  const handleOpenEdit = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setEditRating(contractor.rating);
    setHoveredStar(null);
  };

  const handleCloseEdit = () => {
    setEditingContractor(null);
    setHoveredStar(null);
  };

  const handleSave = async () => {
    if (!editingContractor) return;
    setIsSaving(true);
    try {
      await onUpdateContractorRating(editingContractor.code, editRating === "" ? 0 : editRating);
      handleCloseEdit();
    } catch {
      showToast("No se pudo guardar la evaluación.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Invite modal handlers ---
  const handleOpenInviteModal = (contractor: Contractor) => {
    setInviteModalContractor(contractor);
    setInviteProjectId("");
    setGeneratedToken("");
    setGeneratedProjectTitle("");
    setLinkCopied(false);
  };

  const handleCloseInviteModal = () => {
    setInviteModalContractor(null);
    setGeneratedToken("");
    setLinkCopied(false);
  };

  const handleResetInviteProject = () => {
    setInviteProjectId("");
    setGeneratedToken("");
    setGeneratedProjectTitle("");
    setLinkCopied(false);
  };

  const handleGenerateInvite = async () => {
    if (!inviteProjectId || !inviteModalContractor) return;
    setIsCreatingInvite(true);
    try {
      const data = await apiFetch<{ token: string; projectTitle: string }>("/supplier-invitations", {
        method: "POST",
        token: authToken,
        body: JSON.stringify({
          project_id: inviteProjectId,
          supplierName: inviteModalContractor.name,
          supplierCompany: null,
          supplierContact: inviteModalContractor.contact,
        }),
      });
      setGeneratedToken(data.token);
      setGeneratedProjectTitle(data.projectTitle);
      setLinkCopied(false);
    } catch {
      showToast("No se pudo generar el enlace. Intenta nuevamente.", "error");
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const inviteUrl = generatedToken
    ? `${window.location.origin}/propuesta-materiales/${generatedToken}`
    : "";

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  };

  const displayStars = hoveredStar ?? Math.round(editRating === "" ? 0 : editRating);
  const proposalTotal = (p: SupplierMaterialProposal) =>
    p.items.reduce((sum, i) => sum + i.totalPrice, 0);

  return (
    <>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-sky-700">
              <Users className="h-3.5 w-3.5" />
              Base de proveedores
            </div>
            <h2 className="font-sans text-lg font-black tracking-tight text-slate-900">Proveedores registrados</h2>
            <p className="text-xs font-medium text-slate-500">
              Consulte las empresas recibidas desde el portal publico de registro.
            </p>
          </div>
          <Link
            id="link-open-public-provider-registration"
            to="/registro-proveedores"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/10 transition hover:bg-sky-600"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir registro publico
          </Link>
        </div>

        {/* Contractor table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
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
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600">
              Total: <span className="text-slate-950">{contractors.length}</span>
            </div>
          </div>

          <Table
            columns={[
              { key: "code", label: "Codigo", render: (c) => <span className="rounded-lg border border-sky-100 bg-sky-50/80 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-600">{c.code}</span> },
              { key: "name", label: "Empresa", render: (c) => <span className="font-bold text-slate-800">{c.name}</span> },
              { key: "specialty", label: "Especialidad", render: (c) => <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{c.specialty}</span> },
              { key: "contact", label: "Contacto", render: (c) => <div className="flex items-center gap-2 font-mono font-semibold text-slate-500"><Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />{c.contact}</div> },
              {
                key: "actions",
                label: "Acciones",
                align: "center",
                render: (c) => (
                  <div className="flex items-center justify-center gap-2">
                    <div className="flex items-center gap-1 rounded-lg border border-amber-100/70 bg-amber-50 px-2.5 py-1 font-mono text-[11px] font-black text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                      {c.rating.toFixed(1)}
                    </div>
                    <button aria-label="Actualizar evaluación" onClick={() => handleOpenEdit(c)} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600" title="Actualizar evaluacion"><Pencil className="h-3 w-3" /></button>
                    <button aria-label="Generar enlace de propuesta de materiales" onClick={() => handleOpenInviteModal(c)} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600" title="Generar enlace de propuesta de materiales"><Link2 className="h-3 w-3" /></button>
                  </div>
                ),
              },
            ]}
            data={filteredContractors}
            rowKey={(c) => c.code}
            isLoading={isLoading}
            emptyMessage="No se encontraron proveedores con ese criterio."
            maxHeight="29rem"
            containerClassName="pr-2"
            pageSize={20}
          />
        </div>

        {/* Supplier material proposals table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Package className="h-[18px] w-[18px]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Propuestas de materiales recibidas</h3>
                <p className="text-[11px] font-medium text-slate-500">
                  Cotizaciones enviadas por proveedores desde el portal publico.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por proveedor u obra..."
                  value={proposalSearch}
                  onChange={(e) => setProposalSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600">
                Total: <span className="text-slate-950">{proposals.length}</span>
              </div>
            </div>
          </div>

          {isLoadingProposals ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando propuestas...
            </div>
          ) : (
            <div className="divide-y divide-slate-100 grid grid-cols-1 pr-2 scroll-smooth overflow-y-auto max-h-115">
              {filteredProposals.length === 0 ? (
                <p className="py-12 text-center text-sm font-medium italic text-slate-400">
                  {proposals.length === 0
                    ? "Aun no se han recibido propuestas de materiales."
                    : "No se encontraron propuestas con ese criterio."}
                </p>
              ) : (
                filteredProposals.map((proposal) => {
                  const isExpanded = expandedProposal === proposal.id;
                  const total = proposalTotal(proposal);
                  return (
                    <div key={proposal.id} className="transition hover:bg-slate-50/40">
                      <button
                        type="button"
                        onClick={() => setExpandedProposal(isExpanded ? null : proposal.id)}
                        className="w-full text-left px-5 py-4"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-600">
                            {proposal.id}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-baseline gap-2">
                              <span className="text-xs font-black text-slate-800">{proposal.supplierName}</span>
                              {proposal.supplierCompany && (
                                <span className="text-[11px] font-semibold text-slate-500">{proposal.supplierCompany}</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-0.5 text-[11px] text-slate-400 font-medium">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {proposal.supplierContact}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="truncate max-w-xs">{proposal.projectTitleSnapshot}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <div className="text-[10px] font-bold uppercase text-slate-400">Total oferta</div>
                              <div className="font-mono text-sm font-black text-indigo-700">
                                ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                            <div className="text-right hidden sm:block">
                              <div className="text-[10px] font-bold uppercase text-slate-400">Materiales</div>
                              <div className="font-mono text-xs font-black text-slate-600">{proposal.items.length}</div>
                            </div>
                            <div className="text-right hidden sm:block">
                              <div className="text-[10px] font-bold uppercase text-slate-400">Fecha</div>
                              <div className="text-[11px] font-semibold text-slate-500">{proposal.submittedAt}</div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                            )}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-5 space-y-3">
                          <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-3 text-xs">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <div className="text-[10px] font-bold uppercase text-indigo-500">Obra</div>
                                <div className="font-semibold text-slate-700 mt-0.5">{proposal.projectTitleSnapshot}</div>
                                <div className="font-mono text-[10px] text-indigo-600">{proposal.projectId}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold uppercase text-indigo-500">Proveedor</div>
                                <div className="font-semibold text-slate-700 mt-0.5">{proposal.supplierName}</div>
                                {proposal.supplierCompany && (
                                  <div className="text-[11px] text-slate-500">{proposal.supplierCompany}</div>
                                )}
                              </div>
                              <div>
                                <div className="text-[10px] font-bold uppercase text-indigo-500">Contacto</div>
                                <div className="font-semibold text-slate-700 mt-0.5 flex items-center gap-1">
                                  <Mail className="h-3 w-3 text-slate-400" />
                                  {proposal.supplierContact}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold uppercase text-indigo-500">Enviado</div>
                                <div className="font-semibold text-slate-700 mt-0.5">{proposal.submittedAt}</div>
                              </div>
                            </div>
                            {proposal.estimatedDays != null && (
                              <div className="mt-3 pt-3 border-t border-indigo-100 flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                <div className="text-[10px] font-bold uppercase text-indigo-500">Tiempo estimado:</div>
                                <div className="font-black text-slate-700 text-xs">
                                  {proposal.estimatedDays} {proposal.durationUnit ?? "dias"}
                                </div>
                              </div>
                            )}
                            {proposal.generalNotes && (
                              <div className="mt-3 pt-3 border-t border-indigo-100">
                                <div className="text-[10px] font-bold uppercase text-indigo-500 mb-1">Observaciones generales</div>
                                <p className="text-slate-600">{proposal.generalNotes}</p>
                              </div>
                            )}
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <Table
                              columns={[
                                { key: "materialName", label: "Material", render: (item) => <span className="font-semibold text-slate-800">{item.materialName}</span> },
                                { key: "quantity", label: "Cantidad", align: "center", render: (item) => <span className="font-mono font-bold text-slate-600">{item.quantity}</span> },
                                { key: "unit", label: "Unidad", render: (item) => <span className="text-slate-500">{item.unit}</span> },
                                { key: "unitPrice", label: "Precio unit.", align: "right", render: (item) => <span className="font-mono font-bold text-slate-700">${item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span> },
                                { key: "totalPrice", label: "Total", align: "right", render: (item) => <span className="font-mono font-black text-indigo-700">${item.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span> },
                                { key: "notes", label: "Notas", render: (item) => <span className="text-slate-400 italic">{item.notes || "—"}</span> },
                              ]}
                              data={proposal.items}
                              rowKey={(_item, idx) => idx}
                              pageSize={10}
                              footer={
                                <tr className="border-t-2 border-slate-200 bg-slate-50">
                                  <td colSpan={4} className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-600">Total propuesta:</td>
                                  <td className="px-4 py-3 text-right font-mono text-sm font-black text-indigo-700">${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                  <td />
                                </tr>
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── Rating Modal ── */}
      {editingContractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 p-5 text-white">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-amber-400">Evaluacion de proveedor</span>
                <h3 className="text-sm font-bold">{editingContractor.name}</h3>
                <p className="mt-0.5 font-mono text-[11px] text-slate-400">{editingContractor.code}</p>
              </div>
              <button onClick={handleCloseEdit} className="rounded-full p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="flex flex-col items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Calificacion</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(null)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          star <= displayStars ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Valor exacto (0.0 – 5.0)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={editRating}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[eE]/g, '');
                    if (v === "") { setEditRating(""); return; }
                    const val = Math.min(5, Math.max(0, parseFloat(v) || 0));
                    setEditRating(Math.round(val * 10) / 10);
                  }}
                  onKeyDown={(e) => { if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === 'Subtract') e.preventDefault(); }}
                  onPaste={(e) => { e.preventDefault(); const v = e.clipboardData.getData('text/plain').replace(/[eE]/g, ''); if (v === "") { setEditRating(""); return; } const val = Math.min(5, Math.max(0, parseFloat(v) || 0)); setEditRating(Math.round(val * 10) / 10); }}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-center font-mono text-lg font-black text-amber-500 outline-hidden focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button onClick={handleCloseEdit} disabled={isSaving} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-white shadow-md shadow-amber-500/20 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Star className="h-3.5 w-3.5" />
                {isSaving ? "Guardando..." : "Guardar evaluacion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invite Modal ── */}
      {inviteModalContractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 p-5 text-white">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-indigo-400">Propuesta de materiales</span>
                <h3 className="text-sm font-bold">{inviteModalContractor.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Mail className="h-3 w-3 text-slate-400" />
                  <p className="font-mono text-[11px] text-slate-400">{inviteModalContractor.contact}</p>
                </div>
              </div>
              <button onClick={handleCloseInviteModal} className="rounded-full p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Project selector (always visible) */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Obra activa *
                </label>
                <select
                  value={inviteProjectId}
                  onChange={(e) => {
                    setInviteProjectId(e.target.value);
                    setGeneratedToken("");
                    setLinkCopied(false);
                  }}
                  disabled={!!generatedToken}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="">-- Seleccione una obra --</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.title}
                    </option>
                  ))}
                </select>
                {activeProjects.length === 0 && (
                  <p className="mt-1.5 text-[11px] text-slate-400 font-medium">No hay obras activas disponibles.</p>
                )}
              </div>

              {/* Result: generated link */}
              {generatedToken ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Enlace generado para</div>
                  <div className="text-xs font-black text-slate-800">{inviteModalContractor.name}</div>
                  <div className="text-[11px] text-slate-500 font-medium">Obra: {generatedProjectTitle}</div>
                  <p className="break-all rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-[11px] text-indigo-600 leading-relaxed">
                    {inviteUrl}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyLink}
                      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black shadow-md transition ${
                        linkCopied
                          ? "bg-emerald-500 text-white shadow-emerald-500/20"
                          : "bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700"
                      }`}
                    >
                      {linkCopied ? (
                        <><ClipboardCheck className="h-4 w-4" />Copiado</>
                      ) : (
                        <><ClipboardCheck className="h-4 w-4" />Copiar enlace</>
                      )}
                    </button>
                    <button
                      onClick={handleResetInviteProject}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                      title="Generar para otra obra"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleGenerateInvite}
                  disabled={isCreatingInvite || !inviteProjectId}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-black text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isCreatingInvite ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Generando enlace...</>
                  ) : (
                    <><Link2 className="h-4 w-4" />Generar enlace unico</>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
