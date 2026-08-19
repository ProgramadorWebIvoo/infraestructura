/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de invitación a proveedor (generar enlace de propuesta de
 * materiales) — extraído de ProveedoresRegistrados.
 */

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Link2, Loader2, Search } from "lucide-react";
import { useToast } from "../../../components/UI/Toast";
import Modal from "../../../components/UI/Modal";
import { copyToClipboard } from "../../../utils/clipboard";
import { ProjectStatus } from "../../../types";
import type { Contractor, Project } from "../../../types";

interface InviteModalProps {
  contractor: Contractor | null;
  projects: Project[];
  onClose: () => void;
  onInvite: (payload: {
    project_id: string;
    supplierName: string;
    supplierCompany: string | null;
    supplierContact: string;
  }) => Promise<{ token: string; projectTitle: string }>;
}

export default function InviteModal({ contractor, projects, onClose, onInvite }: InviteModalProps) {
  const { showToast } = useToast();
  const [inviteProjectId, setInviteProjectId] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [generatedToken, setGeneratedToken] = useState("");
  const [generatedProjectTitle, setGeneratedProjectTitle] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const resetForm = () => {
    setInviteProjectId("");
    setProjectSearch("");
    setGeneratedToken("");
    setGeneratedProjectTitle("");
    setLinkCopied(false);
  };

  // Resetea el formulario cada vez que se abre el modal para un proveedor.
  useEffect(() => {
    if (contractor) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractor]);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== ProjectStatus.COMPLETADO_PAGADO),
    [projects],
  );

  const filteredProjects = useMemo(
    () =>
      activeProjects.filter(
        (p) =>
          p.title.toLowerCase().includes(projectSearch.toLowerCase()) ||
          p.id.toLowerCase().includes(projectSearch.toLowerCase())
      ),
    [activeProjects, projectSearch],
  );

  const handleGenerateInvite = async () => {
    if (!inviteProjectId || !contractor) return;
    setIsCreatingInvite(true);
    try {
      const data = await onInvite({
        project_id: inviteProjectId,
        supplierName: contractor.name,
        supplierCompany: null,
        supplierContact: contractor.email,
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

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    const ok = await copyToClipboard(inviteUrl);
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } else {
      showToast("No se pudo copiar el enlace. Cópialo manualmente.", "error");
    }
  };

  return (
    <Modal
      isOpen={contractor !== null}
      onClose={onClose}
      title={contractor?.name}
      badge="Propuesta de materiales"
      infoLine={contractor?.email}
      icon={<Link2 className="h-5 w-5" />}
      iconColor="purple"
      maxWidth="max-w-lg"
    >
      {/* Project selector inline */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Obra objetivo
        </label>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar obra por título o ID..."
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            disabled={!!generatedToken}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Project list */}
        <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
          {filteredProjects.length === 0 ? (
            <p className="py-8 text-center text-xs font-medium text-slate-400 italic">
              No se encontraron obras
            </p>
          ) : (
            filteredProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setInviteProjectId(p.id)}
                disabled={!!generatedToken}
                className={`w-full cursor-pointer text-left px-4 py-3 transition-colors ${
                  inviteProjectId === p.id
                    ? "bg-indigo-50 border-l-4 border-l-indigo-500"
                    : "border-l-4 border-l-transparent hover:bg-slate-50"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <div className="text-xs font-semibold text-slate-800">{p.title}</div>
                <div className="mt-0.5 font-mono text-[10px] text-slate-400">{p.id}</div>
              </button>
            ))
          )}
        </div>

        <div className="text-[11px] font-medium text-slate-400">
          {activeProjects.length} obras disponibles
        </div>
      </div>

      {/* Result: generated link */}
      {generatedToken ? (
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white p-4 space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Enlace generado para</div>
          <div className="text-xs font-black text-slate-800">{contractor?.name}</div>
          <div className="text-[11px] text-slate-500 font-medium">Obra: {generatedProjectTitle}</div>
          <p className="break-all rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-[11px] text-indigo-600 leading-relaxed">
            {inviteUrl}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className={`flex-1 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black shadow-md transition-all duration-200 ${
                linkCopied
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-emerald-500/20"
                  : "bg-gradient-to-r from-indigo-600 to-indigo-500 shadow-indigo-600/20 hover:from-indigo-700 hover:to-indigo-600 hover:shadow-lg hover:shadow-indigo-600/30"
              }`}
            >
              {linkCopied ? (
                <><ClipboardCheck className="h-4 w-4" />Copiado</>
              ) : (
                <><ClipboardCheck className="h-4 w-4" />Copiar enlace</>
              )}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGenerateInvite}
          disabled={isCreatingInvite || !inviteProjectId}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3 text-xs font-black text-white shadow-md shadow-indigo-600/20 transition-all duration-200 hover:from-indigo-700 hover:to-indigo-600 hover:shadow-lg hover:shadow-indigo-600/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isCreatingInvite ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Generando enlace...</>
          ) : (
            <><Link2 className="h-4 w-4" />Generar enlace unico</>
          )}
        </button>
      )}
    </Modal>
  );
}
