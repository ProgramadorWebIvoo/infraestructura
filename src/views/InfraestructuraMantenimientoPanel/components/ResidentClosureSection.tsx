/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Infraestructura: bandeja del ingeniero residente / coordinador de
 * mantenimiento. Corrobora el informe de cierre enviado por el contratista
 * (INFORME_ENVIADO) y reenvía el enlace a las obras aún en ejecución.
 */

import { useMemo, useState } from "react";
import { ClipboardCheck, HardHat, Mail } from "lucide-react";
import Button from "@/components/UI/Button";
import Card from "@/components/UI/Card";
import EmptyState from "@/components/UI/EmptyState";
import SectionHeader from "@/components/UI/SectionHeader";
import StatusBadge from "@/components/UI/StatusBadge";
import { useToast } from "@/components/UI/Toast";
import ClosureReviewModal from "@/components/ClosureReport/ClosureReviewModal";
import { getErrorMessage } from "@/services/logger";
import type { ClosureActions } from "@/hooks/projectsWorkflows/useClosureWorkflows";
import { ProjectStatus } from "@/types";
import type { Project } from "@/types";

interface ResidentClosureSectionProps {
  projects: Project[];
  authToken: string;
  actions: ClosureActions;
  currentUser: { id: number; role?: string } | null;
}

/** Con residente asignado, solo él (y ADMIN/SUPERADMIN) puede actuar; sin asignar, cualquier INFRAESTRUCTURA. */
export function isReadOnlyForResident(project: Project, user: ResidentClosureSectionProps["currentUser"]): boolean {
  return user?.role === "INFRAESTRUCTURA" && project.residentUserId != null && project.residentUserId !== user.id;
}

export default function ResidentClosureSection({ projects, authToken, actions, currentUser }: ResidentClosureSectionProps) {
  const { showToast } = useToast();
  const [reviewing, setReviewing] = useState<Project | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const awaitingReview = useMemo(() => projects.filter((p) => p.status === ProjectStatus.INFORME_ENVIADO), [projects]);
  const inExecution = useMemo(() => projects.filter((p) => p.status === ProjectStatus.EN_EJECUCION), [projects]);

  const resend = async (projectId: string) => {
    setResendingId(projectId);
    try {
      const { mailSent } = await actions.handleResendClosureLink(projectId);
      showToast(mailSent ? "Enlace reenviado al contratista." : "No se pudo enviar el correo; revise el contacto del contratista.", mailSent ? "success" : "error");
    } catch (error) {
      showToast(getErrorMessage(error, "No se pudo reenviar el enlace."), "error");
    } finally {
      setResendingId(null);
    }
  };

  return (
    <Card accent="brand" className="p-6 space-y-6">
      <SectionHeader
        icon={<ClipboardCheck className="h-5 w-5" />}
        title="Corroboración de ejecución"
        description="Informes enviados por el contratista pendientes de su visto bueno como ingeniero residente o coordinador."
        color="sky"
      />

      {awaitingReview.length === 0 ? (
        <EmptyState message="No hay informes de contratistas pendientes de corroborar." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {awaitingReview.map((project) => {
            const readOnly = isReadOnlyForResident(project, currentUser);
            return (
              <li key={project.id} className="flex flex-wrap items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 truncate">{project.title}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {project.location} · Residente: {project.residentName ?? "Sin asignar"}
                  </div>
                </div>
                <StatusBadge code={project.status} />
                <Button size="sm" colorScheme="sky" variant={readOnly ? "secondary" : "primary"} onClick={() => setReviewing(project)}>
                  {readOnly ? "Ver informe" : "Revisar informe"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          <HardHat className="h-3.5 w-3.5" /> Obras en ejecución (esperando informe del contratista)
        </h3>
        {inExecution.length === 0 ? (
          <p className="text-xs text-slate-400">Sin obras en ejecución.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {inExecution.map((project) => (
              <li key={project.id} className="flex flex-wrap items-center gap-4 py-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-700 truncate">{project.title}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {project.location}
                    {project.closureReportStatus === "RECHAZADO" && " · Informe devuelto al contratista"}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Mail className="h-3.5 w-3.5" />}
                  isLoading={resendingId === project.id}
                  disabled={resendingId !== null}
                  onClick={() => resend(project.id)}
                >
                  Reenviar enlace al contratista
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ClosureReviewModal
        project={reviewing}
        mode="resident"
        authToken={authToken}
        actions={actions}
        readOnly={reviewing ? isReadOnlyForResident(reviewing, currentUser) : false}
        onClose={() => setReviewing(null)}
      />
    </Card>
  );
}
