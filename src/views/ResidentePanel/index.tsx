/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Módulo del ingeniero residente ("Mis obras"): obras a su cargo pendientes de
 * verificación en campo. Sin datos financieros (los endpoints los omiten).
 */

import { useMemo, useState } from "react";
import { HardHat } from "lucide-react";
import Button from "@/components/UI/Button";
import Card from "@/components/UI/Card";
import EmptyState from "@/components/UI/EmptyState";
import SectionHeader from "@/components/UI/SectionHeader";
import StatusBadge from "@/components/UI/StatusBadge";
import { useResidentProjects } from "@/hooks/useResidentProjects";
import { sortPendingFirst } from "./residentRules";
import ResidentProjectModal from "./ResidentProjectModal";

interface ResidentePanelProps {
  authToken: string;
}

export default function ResidentePanel({ authToken }: ResidentePanelProps) {
  const { projects, isLoading, approve, reject, uploadPhoto, loadDocuments } = useResidentProjects(authToken);
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = useMemo(() => sortPendingFirst(projects), [projects]);
  const selected = projects.find((p) => p.id === openId) ?? null;
  const pending = sorted.filter((p) => p.pendingAction).length;

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        icon={<HardHat className="h-5 w-5" />}
        title="Mis obras"
        description={pending > 0 ? `${pending} obra(s) pendiente(s) de su verificación en campo` : "Obras a su cargo pendientes de verificación en campo"}
        color="sky"
      />

      {!isLoading && sorted.length === 0 ? (
        <EmptyState message="No tiene obras asignadas por el momento." icon={<HardHat className="h-8 w-8" />} />
      ) : (
        <Card accent="brand" className="p-6">
          <ul className="divide-y divide-slate-100">
            {sorted.map((project) => (
              <li key={project.id} className="flex flex-wrap items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-slate-800">{project.title}</div>
                  <div className="truncate text-[11px] text-slate-500">{project.location}</div>
                </div>
                <StatusBadge code={project.status} />
                <Button size="sm" colorScheme="sky" variant={project.pendingAction ? "primary" : "secondary"} onClick={() => setOpenId(project.id)}>
                  {project.pendingAction ? "Verificar obra" : "Ver informe"}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ResidentProjectModal project={selected} authToken={authToken} actions={{ approve, reject, uploadPhoto, loadDocuments }} onClose={() => setOpenId(null)} />
    </div>
  );
}
