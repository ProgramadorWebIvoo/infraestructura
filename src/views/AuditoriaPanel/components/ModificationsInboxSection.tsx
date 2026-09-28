/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bandeja de Auditoría (F3): solicitudes de modificación de obra (aumentos y
 * disminuciones de partidas) de las obras visibles. Por defecto, las pendientes.
 */

import { useState } from "react";
import { FilePenLine } from "lucide-react";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import SectionHeader from "@/components/UI/SectionHeader";
import SegmentedControl from "@/components/UI/SegmentedControl";
import EmptyState from "@/components/UI/EmptyState";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { useModificationInbox, type InboxModification } from "@/hooks/useModificationInbox";
import type { ModificationStatus } from "@/hooks/useProjectModifications";
import { MODIFICATION_STATUS, MODIFICATION_TYPE_LABEL } from "@/views/InfraestructuraMantenimientoPanel/components/modificationUtils";
import ModificationReviewModal from "./ModificationReviewModal";

type Filter = ModificationStatus | "TODAS";

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "PENDIENTE", label: "Pendientes" },
  { value: "APROBADA", label: "Aprobadas" },
  { value: "RECHAZADA", label: "Rechazadas" },
  { value: "TODAS", label: "Todas" },
];

interface Props {
  authToken: string;
  /** Refresca las obras tras una decisión (monto contratado, badge "Modificada"). */
  onRefresh?: () => Promise<void> | void;
}

export default function ModificationsInboxSection({ authToken, onRefresh }: Props) {
  const [filter, setFilter] = useState<Filter>("PENDIENTE");
  const [selected, setSelected] = useState<InboxModification | null>(null);
  const { requests, isLoading, reload } = useModificationInbox(filter, authToken);

  const handleReviewed = () => {
    void reload();
    void onRefresh?.();
  };

  return (
    <>
      <Card accent="info" className="min-h-0 flex-1 overflow-y-auto p-6" fillHeight>
        <SectionHeader
          icon={<FilePenLine className="h-5 w-5" />}
          title="Modificaciones de Obra"
          description="Apruebe o rechace los aumentos y disminuciones de partidas solicitados por Infraestructura sobre obras en ejecución."
          color="sky"
        />
        <div className="my-4">
          <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} accent="info" />
        </div>

        {isLoading ? (
          <p className="text-xs text-slate-400">Cargando…</p>
        ) : requests.length === 0 ? (
          <EmptyState message={filter === "PENDIENTE" ? "No hay modificaciones pendientes de revisión." : "No hay modificaciones en este estado."} />
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => {
              const status = MODIFICATION_STATUS[request.status];
              const c = SEMANTIC_COLOR_MAP[status.color];
              return (
                <li key={request.id} className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{request.projectTitle ?? request.projectId}</p>
                      <p className="font-mono text-[10px] text-slate-400">{request.projectId}{request.requestedByName ? ` · ${request.requestedByName}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${c.bg50} ${c.border200} ${c.text700}`}>{status.label}</span>
                      <Button size="sm" variant={request.status === "PENDIENTE" ? "primary" : "secondary"} onClick={() => setSelected(request)}>
                        {request.status === "PENDIENTE" ? "Revisar" : "Ver detalle"}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700">{request.reason}</p>
                  <ul className="space-y-0.5 text-[11px] text-slate-600">
                    {request.items.map((item) => (
                      <li key={item.id}>{MODIFICATION_TYPE_LABEL[item.type]}: {item.name} — {Number(item.quantity)} {item.unit}</li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {selected && <ModificationReviewModal request={selected} authToken={authToken} onClose={() => setSelected(null)} onReviewed={handleReviewed} />}
    </>
  );
}
