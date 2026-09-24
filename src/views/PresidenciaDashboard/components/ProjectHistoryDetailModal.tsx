/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Detalle de una obra en el Histórico: cifras (estimado vs aprobado vs
 * adjudicado vs ejecutado), recorrido por etapas y una pestaña por tramo de
 * la cadena obra → presupuesto → proveedores → adjudicación → pagos → planos → cierre.
 */

import { useEffect, useState } from "react";
import { Check, Circle, History } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Tabs from "@/components/UI/Tabs";
import EmptyState from "@/components/UI/EmptyState";
import { SkeletonCard } from "@/components/SkeletonLoader";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { useProjectHistoryDetail } from "@/hooks/useProjectHistory";
import type { Project } from "@/types";
import type { HistoryStage } from "../projectHistoryTypes";
import ProjectHistoryFiguresPanel from "./ProjectHistoryFigures";
import { BudgetPanel, SuppliersPanel } from "./HistoryProcurementPanels";
import { DrawingsClosurePanel, PaymentsPanel, TimelinePanel } from "./HistoryExecutionPanels";
import HistoryFlowPanel from "./HistoryFlowPanel";

type DetailTab = "presupuesto" | "proveedores" | "pagos" | "planos" | "flujo" | "linea";

function StageStepper({ stages }: { stages: HistoryStage[] }) {
  const done = SEMANTIC_COLOR_MAP.success;
  const current = SEMANTIC_COLOR_MAP.warning;
  const pending = SEMANTIC_COLOR_MAP.neutral;

  return (
    <ol className="flex flex-wrap gap-2" aria-label="Etapas de la obra">
      {stages.map((s) => {
        const tone = s.state === "done" ? done : s.state === "current" ? current : pending;
        return (
          <li key={s.key} className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[11px] font-bold ${tone.bg50} ${tone.border200} ${tone.text700}`}>
            {s.state === "done" ? <Check className="h-3 w-3" aria-hidden="true" /> : <Circle className="h-3 w-3" aria-hidden="true" />}
            {s.label}
            <span className="sr-only"> — {s.state === "done" ? "completada" : s.state === "current" ? "en curso" : "pendiente"}</span>
          </li>
        );
      })}
    </ol>
  );
}

interface Props {
  authToken: string;
  projectId: string | null;
  /** Obras cargadas en la sesión: de ahí sale el Project que alimenta la pestaña de flujo. */
  projects: Project[];
  onClose: () => void;
}

export default function ProjectHistoryDetailModal({ authToken, projectId, projects, onClose }: Props) {
  const { data: detail, isLoading, isError } = useProjectHistoryDetail(authToken, projectId);
  const [tab, setTab] = useState<DetailTab>("presupuesto");

  useEffect(() => {
    if (projectId) setTab("presupuesto");
  }, [projectId]);

  return (
    <Modal
      isOpen={projectId !== null}
      onClose={onClose}
      maxWidth="max-w-6xl"
      icon={<History className="h-5 w-5" />}
      badge="Histórico de obra"
      title={detail?.project.title ?? "Cargando obra…"}
      infoLine={detail ? `${detail.project.id} · ${detail.project.location ?? "Sin ubicación"}` : undefined}
      iconColor="sky"
    >
      {isLoading && <SkeletonCard />}
      {isError && <EmptyState message="No se pudo cargar el detalle de la obra." />}
      {detail && (
        <div className="space-y-5">
          <ProjectHistoryFiguresPanel figures={detail.figures} />
          <StageStepper stages={detail.stages} />
          <Tabs
            ariaLabel="Etapas del histórico de la obra"
            layoutId="history-detail-tabs"
            activeKey={tab}
            onChange={(k) => setTab(k as DetailTab)}
            tabs={[
              { key: "presupuesto", label: "Presupuesto y solicitud" },
              { key: "proveedores", label: "Proveedores y adjudicación", count: detail.suppliers.length },
              { key: "pagos", label: "Pagos", count: detail.payments.items.length },
              { key: "planos", label: "Planos y cierre", count: detail.drawings.length },
              { key: "flujo", label: "Flujo y organigrama" },
              { key: "linea", label: "Línea de tiempo", count: detail.timeline.length },
            ]}
          />
          {tab === "presupuesto" && <BudgetPanel detail={detail} />}
          {tab === "proveedores" && <SuppliersPanel suppliers={detail.suppliers} award={detail.award} />}
          {tab === "pagos" && <PaymentsPanel payments={detail.payments} />}
          {tab === "planos" && <DrawingsClosurePanel drawings={detail.drawings} closure={detail.closure} />}
          {tab === "flujo" && <HistoryFlowPanel project={projects.find((p) => p.id === detail.project.id)} />}
          {tab === "linea" && <TimelinePanel timeline={detail.timeline} />}
        </div>
      )}
    </Modal>
  );
}
