/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pestaña "Modificaciones" (F3): obras en ejecución con sus solicitudes de
 * aumento/disminución de partidas. Quién puede solicitar es configurable
 * (`canRequest` del backend); Auditoría aprueba.
 */

import { useState } from "react";
import { FilePenLine, HardHat } from "lucide-react";
import type { Project } from "@/types";
import { ProjectStatus } from "@/types";
import Button from "@/components/UI/Button";
import EmptyState from "@/components/UI/EmptyState";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { useToast } from "@/components/UI/Toast";
import { useProjectModifications, type ModificationRequest } from "@/hooks/useProjectModifications";
import ModificationFormModal from "./ModificationFormModal";
import { MODIFICATION_STATUS, MODIFICATION_TYPE_LABEL } from "./modificationUtils";

function ProjectModifications({ project, authToken }: { project: Project; authToken: string }) {
  const { showToast } = useToast();
  const { state, isLoading, save } = useProjectModifications(project.id, authToken);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ModificationRequest | null>(null);

  const openForm = (request: ModificationRequest | null) => {
    setEditing(request);
    setFormOpen(true);
  };

  const handleSave: typeof save = async (payload, id) => {
    try {
      await save(payload, id);
      showToast(id ? "Modificación reenviada a Auditoría." : "Modificación enviada a Auditoría.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo guardar la modificación.", "error");
      throw error;
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-800"><HardHat className="h-4 w-4 text-slate-400" />{project.title}</h3>
          <p className="text-[11px] text-slate-500">{project.location}</p>
        </div>
        {state?.canRequest && (
          <Button size="sm" icon={<FilePenLine className="h-3.5 w-3.5" />} onClick={() => openForm(null)}>Nueva modificación</Button>
        )}
      </header>

      {isLoading && !state && <p className="text-xs text-slate-400">Cargando…</p>}
      {state && state.data.length === 0 && <p className="text-xs italic text-slate-400">Sin modificaciones solicitadas.</p>}

      {state?.data.map((request) => {
        const status = MODIFICATION_STATUS[request.status];
        const c = SEMANTIC_COLOR_MAP[status.color];
        return (
          <article key={request.id} className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${c.bg50} ${c.border200} ${c.text700}`}>{status.label}</span>
              {request.status === "RECHAZADA" && state.canRequest && (
                <Button size="sm" variant="secondary" onClick={() => openForm(request)}>Editar y reenviar</Button>
              )}
            </div>
            <p className="text-xs text-slate-700">{request.reason}</p>
            <ul className="space-y-0.5 text-[11px] text-slate-600">
              {request.items.map((item) => (
                <li key={item.id}>
                  {MODIFICATION_TYPE_LABEL[item.type]}: {item.name} — {Number(item.quantity)} {item.unit}
                </li>
              ))}
            </ul>
            {request.status === "RECHAZADA" && request.rejectionReason && (
              <p className="text-[11px] font-medium text-rose-700">Motivo del rechazo: {request.rejectionReason}</p>
            )}
          </article>
        );
      })}

      {formOpen && state && (
        <ModificationFormModal
          project={project}
          quantities={state.effectiveQuantities}
          editing={editing}
          onClose={() => setFormOpen(false)}
          onSave={handleSave}
        />
      )}
    </section>
  );
}

export default function ModificationsSection({ projects, authToken }: { projects: Project[]; authToken: string }) {
  const running = projects.filter((p) => p.status === ProjectStatus.EN_EJECUCION);
  if (running.length === 0) return <EmptyState message="No hay obras en ejecución para modificar." />;
  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
      {running.map((project) => <ProjectModifications key={project.id} project={project} authToken={authToken} />)}
    </div>
  );
}
