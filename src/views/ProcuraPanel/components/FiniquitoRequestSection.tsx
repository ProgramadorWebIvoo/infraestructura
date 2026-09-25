/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Procura: solicitud de pago del finiquito de obras ya verificadas por
 * Auditoría (PENDIENTE_SOLICITUD_FINIQUITO). Procura solicita el pago a
 * Finanzas o devuelve a Auditoría con motivo.
 */

import { useMemo, useState } from "react";
import { Banknote } from "lucide-react";
import { formatCurrency } from "@ivoo/shared";
import Button from "@/components/UI/Button";
import Card from "@/components/UI/Card";
import EmptyState from "@/components/UI/EmptyState";
import SectionHeader from "@/components/UI/SectionHeader";
import ClosureReviewModal from "@/components/ClosureReport/ClosureReviewModal";
import ClosureFinalQuantities from "@/components/ClosureReport/ClosureFinalQuantities";
import type { ClosureActions } from "@/hooks/projectsWorkflows/useClosureWorkflows";
import { ProjectStatus } from "@/types";
import type { Project } from "@/types";

interface FiniquitoRequestSectionProps {
  projects: Project[];
  authToken: string;
  actions: ClosureActions;
}

export default function FiniquitoRequestSection({ projects, authToken, actions }: FiniquitoRequestSectionProps) {
  const pending = useMemo(() => projects.filter((p) => p.status === ProjectStatus.PENDIENTE_SOLICITUD_FINIQUITO), [projects]);
  const [reviewing, setReviewing] = useState<Project | null>(null);

  return (
    <Card accent="success" className="p-6 space-y-4">
      <SectionHeader
        icon={<Banknote className="h-5 w-5" />}
        title="Solicitud de finiquito"
        description="Obras verificadas por Auditoría. Al solicitar el pago, la obra pasa a Finanzas para liquidar el finiquito."
        color="emerald"
      />

      {pending.length === 0 ? (
        <EmptyState message="No hay obras pendientes de solicitud de finiquito." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {pending.map((project) => (
            <li key={project.id} className="flex flex-wrap items-center gap-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-800 truncate">{project.title}</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {project.location} · Contratista: {project.selectedContractorCode}
                </div>
              </div>
              <div className="text-right whitespace-nowrap">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Finiquito propuesto</div>
                <div className="font-mono font-black text-slate-800">
                  {project.finiquitoAmount != null ? formatCurrency(project.finiquitoAmount) : "—"}
                </div>
              </div>
              <Button size="sm" colorScheme="emerald" onClick={() => setReviewing(project)}>
                Revisar y solicitar pago
              </Button>
              <div className="basis-full">
                <ClosureFinalQuantities projectId={project.id} authToken={authToken} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <ClosureReviewModal project={reviewing} mode="procura" authToken={authToken} actions={actions} onClose={() => setReviewing(null)} />
    </Card>
  );
}
