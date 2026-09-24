/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Procura: envío a Finanzas de las adjudicaciones ya aprobadas por Presidencia.
 * Solo Procura opera este envío; también muestra lo que sigue pendiente en Presidencia.
 */

import { useMemo, useState } from "react";
import { Landmark, Send } from "lucide-react";
import { formatCurrency } from "@ivoo/shared";
import Button from "@/components/UI/Button";
import Card from "@/components/UI/Card";
import EmptyState from "@/components/UI/EmptyState";
import SectionHeader from "@/components/UI/SectionHeader";
import { ProjectStatus } from "@/types";
import type { Project } from "@/types";

interface SendToFinanceSectionProps {
  projects: Project[];
  onSendToFinance: (projectId: string) => Promise<void>;
}

export default function SendToFinanceSection({ projects, onSendToFinance }: SendToFinanceSectionProps) {
  const approved = useMemo(() => projects.filter((p) => p.status === ProjectStatus.APROBADO_PRESIDENCIA), [projects]);
  const waitingCount = useMemo(() => projects.filter((p) => p.status === ProjectStatus.PENDIENTE_PRESIDENCIA).length, [projects]);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const send = async (projectId: string) => {
    setSendingId(projectId);
    try {
      await onSendToFinance(projectId);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Card accent="success" className="p-6 space-y-4">
      <SectionHeader
        icon={<Send className="h-5 w-5" />}
        title="Envío a Finanzas"
        description="Adjudicaciones aprobadas por Presidencia. Al enviar, la obra pasa a Finanzas para liberar el anticipo."
        color="emerald"
      />

      {waitingCount > 0 && (
        <p className="flex items-center gap-2 text-[11px] font-medium text-amber-700">
          <Landmark className="h-3.5 w-3.5" />
          {waitingCount} adjudicación(es) esperan la aprobación de Presidencia.
        </p>
      )}

      {approved.length === 0 ? (
        <EmptyState message="No hay adjudicaciones aprobadas pendientes de enviar a Finanzas." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {approved.map((project) => {
            const proposal = project.proposals?.find((p) => p.id === project.selectedProposalId);
            return (
              <li key={project.id} className="flex flex-wrap items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 truncate">{project.title}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {project.location} · Contratista: {proposal?.contractorName ?? project.selectedContractorCode}
                  </div>
                </div>
                <div className="font-mono font-black text-slate-800 whitespace-nowrap">
                  {proposal ? formatCurrency(proposal.totalCost) : "—"}
                </div>
                <Button
                  size="sm"
                  colorScheme="emerald"
                  icon={<Send className="h-3.5 w-3.5" />}
                  isLoading={sendingId === project.id}
                  disabled={sendingId !== null}
                  onClick={() => send(project.id)}
                >
                  Enviar a Finanzas
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
