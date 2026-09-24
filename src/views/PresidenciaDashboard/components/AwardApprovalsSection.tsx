/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bandeja de Presidencia: adjudicaciones seleccionadas por Procura que esperan
 * aprobación. Permite aprobar una, varias a la vez, o rechazar con motivo
 * (la obra vuelve a Procura). Muestra en qué se usará el dinero antes de decidir.
 */

import { useMemo, useState } from "react";
import { CheckCircle2, Landmark, XCircle } from "lucide-react";
import { formatCurrency } from "@ivoo/shared";
import Button from "@/components/UI/Button";
import Card from "@/components/UI/Card";
import EmptyState from "@/components/UI/EmptyState";
import Modal from "@/components/UI/Modal";
import SectionHeader from "@/components/UI/SectionHeader";
import { ProjectStatus } from "@/types";
import type { Project } from "@/types";

interface AwardApprovalsSectionProps {
  projects: Project[];
  onApproveAward: (projectIds: string[], observations?: string) => Promise<void>;
  onRejectAward: (projectId: string, reason: string, observations?: string) => Promise<void>;
}

export default function AwardApprovalsSection({ projects, onApproveAward, onRejectAward }: AwardApprovalsSectionProps) {
  const pending = useMemo(() => projects.filter((p) => p.status === ProjectStatus.PENDIENTE_PRESIDENCIA), [projects]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isBusy, setIsBusy] = useState(false);
  const [rejecting, setRejecting] = useState<Project | null>(null);
  const [reason, setReason] = useState("");

  const selectedIds = pending.filter((p) => selected.has(p.id)).map((p) => p.id);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const approve = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsBusy(true);
    try {
      await onApproveAward(ids);
      setSelected(new Set());
    } finally {
      setIsBusy(false);
    }
  };

  const confirmReject = async () => {
    if (!rejecting || !reason.trim()) return;
    setIsBusy(true);
    try {
      await onRejectAward(rejecting.id, reason.trim());
      setRejecting(null);
      setReason("");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Card accent="warning" className="p-6 space-y-4">
      <SectionHeader
        icon={<Landmark className="h-5 w-5" />}
        title="Aprobación de Adjudicaciones"
        description="Procura seleccionó al contratista. Apruebe para que Procura envíe la obra a Finanzas, o rechace con un motivo para que Procura la revise."
        color="amber"
        actions={
          <Button
            colorScheme="emerald"
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            disabled={selectedIds.length === 0 || isBusy}
            onClick={() => approve(selectedIds)}
          >
            Aprobar seleccionadas ({selectedIds.length})
          </Button>
        }
      />

      {pending.length === 0 ? (
        <EmptyState message="No hay adjudicaciones pendientes de aprobación." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {pending.map((project) => {
            const proposal = project.proposals?.find((p) => p.id === project.selectedProposalId);
            return (
              <li key={project.id} className="flex flex-wrap items-center gap-4 py-3">
                <input
                  type="checkbox"
                  aria-label={`Seleccionar ${project.title}`}
                  checked={selected.has(project.id)}
                  onChange={() => toggle(project.id)}
                  className="h-4 w-4"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 truncate">{project.title}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {project.location} · {project.description}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    Contratista: <span className="font-bold">{proposal?.contractorName ?? project.selectedContractorCode}</span>
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Monto adjudicado</div>
                  <div className="font-mono font-black text-slate-800">{proposal ? formatCurrency(proposal.totalCost) : "—"}</div>
                  {project.approvedInvestmentAmount != null && (
                    <div className="text-[10px] text-slate-400">Aprobado: {formatCurrency(project.approvedInvestmentAmount)}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" colorScheme="emerald" disabled={isBusy} onClick={() => approve([project.id])}>
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<XCircle className="h-3.5 w-3.5" />}
                    disabled={isBusy}
                    onClick={() => {
                      setRejecting(project);
                      setReason("");
                    }}
                  >
                    Rechazar
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        isOpen={rejecting !== null}
        onClose={() => setRejecting(null)}
        closeDisabled={isBusy}
        title="Rechazar adjudicación"
        infoLine={rejecting?.title}
        icon={<XCircle className="h-5 w-5" />}
        iconColor="rose"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejecting(null)} disabled={isBusy}>
              Cancelar
            </Button>
            <Button variant="danger" isLoading={isBusy} disabled={!reason.trim()} onClick={confirmReject}>
              Rechazar y devolver a Procura
            </Button>
          </div>
        }
      >
        <label className="block text-xs font-bold text-slate-600 mb-1" htmlFor="award-reject-reason">
          Motivo del rechazo (obligatorio)
        </label>
        <textarea
          id="award-reject-reason"
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-slate-200 p-3 text-sm"
        />
      </Modal>
    </Card>
  );
}
