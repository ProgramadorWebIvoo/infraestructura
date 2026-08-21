/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Peticiones rechazadas por Cierre de Obra: muestra dónde/por qué/qué se
 * rechazó (motivo desde AuditLog, sin columna propia — mismo criterio que
 * RejectionService::buildDetails) y permite editar y reenviar la misma
 * petición (mismo Project.id) para una nueva evaluación, sin crear una
 * petición nueva. Se autoculta si no hay ninguna rechazada.
 */

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Clock, Eye, Pencil, User, XCircle } from "lucide-react";
import type { AuditLog, Project } from "../../../types";
import { ProjectStatus } from "../../../types";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import Modal from "../../../components/UI/Modal";
import RequestWizardCard from "./RequestWizardCard";
import RejectedPetitionDetailModal from "./RejectedPetitionDetailModal";
import { useRequestForm } from "../../../hooks/useRequestForm";
import { useToast } from "../../../components/UI/Toast";
import { useState } from "react";
import { bannerVariants, containerVariants, itemVariants } from "../../../animations";

const REJECT_ACTION = "Rechazo de petición de obra";

interface RejectedPetitionsSectionProps {
  projects: Project[];
  auditLogs: AuditLog[];
  authToken: string;
  materialsCatalog: { name: string; unit: string; estimatedUnitPrice: number }[];
  onResubmitProject: (
    projectId: string,
    project: Omit<Project, "id" | "createdDate" | "status" | "type">,
    files: { photos: File[]; documents: File[]; plans: File[] },
  ) => Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }>;
}

function latestRejectionLog(auditLogs: AuditLog[], projectId: string): AuditLog | undefined {
  return auditLogs
    .filter((l) => l.projectId === projectId && l.action === REJECT_ACTION)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
}

function EditAndResubmitModal({
  project,
  materialsCatalog,
  onResubmitProject,
  onClose,
}: {
  project: Project;
  materialsCatalog: { name: string; unit: string; estimatedUnitPrice: number }[];
  onResubmitProject: RejectedPetitionsSectionProps["onResubmitProject"];
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const form = useRequestForm({
    onAddProject: async () => ({ ok: false, partial: false, failedGroups: [] }),
    existingProject: project,
    onResubmitProject: async (...args) => {
      const result = await onResubmitProject(...args);
      if (result.ok) {
        showToast("Petición corregida y reenviada a Cierre de Obra.", "success");
        onClose();
      }
      return result;
    },
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="max-w-4xl"
      icon={<Pencil className="h-5 w-5" />}
      iconColor="sky"
      badge="Corregir y Reenviar Petición"
      title={project.id}
      infoLine={project.title}
    >
      <div className="h-[70vh] -m-6 p-6 pt-5">
        <RequestWizardCard form={form} materialsCatalog={materialsCatalog} variant="embedded" />
      </div>
    </Modal>
  );
}

export default function RejectedPetitionsSection({
  projects,
  auditLogs,
  authToken,
  materialsCatalog,
  onResubmitProject,
}: RejectedPetitionsSectionProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);

  const rejected = projects
    .filter((p) => p.status === ProjectStatus.RECHAZADO_CIERRE)
    .map((p) => ({ project: p, log: latestRejectionLog(auditLogs, p.id) }))
    .sort((a, b) => (b.log?.timestamp ?? "").localeCompare(a.log?.timestamp ?? ""));

  if (rejected.length === 0) return null;

  return (
    <motion.div variants={bannerVariants} initial="hidden" animate="visible">
      <Card accent="danger" hoverable={false} className="relative overflow-hidden">
        {/* Resplandor sutil de fondo — refuerza "requiere atención" sin ser
            un elemento animado explícito que distraiga del contenido. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-danger-200/30 blur-3xl"
        />

        <SectionHeader
          icon={<XCircle className="h-5 w-5" />}
          title="Peticiones Rechazadas"
          description="Corrija lo indicado por Cierre de Obra y reenvíe para una nueva evaluación."
          color="rose"
          actions={
            <motion.span
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black font-mono bg-danger-100 text-danger-700 border border-danger-200"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-danger-500" />
              </span>
              {rejected.length} {rejected.length === 1 ? "pendiente" : "pendientes"}
            </motion.span>
          }
        />

        <motion.div
          className="mt-4 space-y-3 relative"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence>
            {rejected.map(({ project: p, log }) => (
              <motion.div
                key={p.id}
                layout
                variants={itemVariants}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                whileHover={{ y: -2 }}
                className="group p-4 rounded-xl border border-danger-100 bg-gradient-to-br from-danger-50/60 to-white shadow-xs hover:shadow-md hover:border-danger-200 transition-shadow"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-danger-600">{p.id}</span>
                      <span className="font-bold text-slate-800 text-sm truncate">{p.title}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 font-medium">{p.location}</div>

                    {log ? (
                      <div className="mt-2.5 flex items-start gap-1.5 text-xs text-danger-700 bg-white/70 rounded-lg border border-danger-100 px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-medium leading-snug">{log.details}</p>
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                            <User className="h-3 w-3" />
                            {log.userName ?? "Cierre de Obra"}
                            <span className="text-slate-300">·</span>
                            <Clock className="h-3 w-3" />
                            {log.timestamp}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2.5 text-[11px] text-slate-400 italic">Motivo no disponible.</p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      id={`btn-view-${p.id}`}
                      type="button"
                      onClick={() => setViewingProject(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver petición
                    </button>
                    <button
                      id={`btn-resubmit-${p.id}`}
                      type="button"
                      onClick={() => setEditingProject(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-danger-700 bg-white border border-danger-200 hover:bg-danger-500 hover:text-white hover:border-danger-500 transition-colors cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar y reenviar
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </Card>

      {editingProject && (
        <EditAndResubmitModal
          project={editingProject}
          materialsCatalog={materialsCatalog}
          onResubmitProject={onResubmitProject}
          onClose={() => setEditingProject(null)}
        />
      )}

      {viewingProject && (
        <RejectedPetitionDetailModal
          project={viewingProject}
          log={latestRejectionLog(auditLogs, viewingProject.id)}
          authToken={authToken}
          onClose={() => setViewingProject(null)}
        />
      )}
    </motion.div>
  );
}
