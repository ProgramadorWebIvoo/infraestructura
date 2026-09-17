/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Inspector de TanStack Query dentro del DEBUG-MODE: lista cada query en
 * cache con su estado (fresh/stale/fetching/error), permite invalidar/
 * refetchear/eliminar una a una o purgar todo el cache. Se suscribe
 * directamente a `queryClient.getQueryCache()` — no hay hook público de
 * TanStack para "todas las queries reactivamente", así que esto es
 * deliberadamente la única pieza de la app que toca el QueryCache crudo.
 */

import { useEffect, useState } from "react";
import type { Query } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Ban, Trash2, Database } from "lucide-react";
import EmptyState from "@/components/UI/EmptyState";
import Button from "@/components/UI/Button";
import { SEMANTIC_COLOR_MAP, type SemanticColor } from "@/components/UI/colorTokens";
import { matchesSearchText } from "./debugUtils";

interface QueryRowState {
  key: string;
  displayKey: string;
  status: "success" | "error" | "pending";
  fetchStatus: "fetching" | "paused" | "idle";
  isStale: boolean;
  dataUpdatedAt: number;
  observersCount: number;
  data: unknown;
  query: Query;
}

function readQueries(queryClient: ReturnType<typeof useQueryClient>): QueryRowState[] {
  return queryClient
    .getQueryCache()
    .getAll()
    .map(query => ({
      key: query.queryHash,
      displayKey: JSON.stringify(query.queryKey),
      status: query.state.status,
      fetchStatus: query.state.fetchStatus,
      isStale: query.isStale(),
      dataUpdatedAt: query.state.dataUpdatedAt,
      observersCount: query.getObserversCount(),
      data: query.state.data,
      query,
    }))
    .sort((a, b) => b.dataUpdatedAt - a.dataUpdatedAt);
}

const STATUS_ACCENT: Record<QueryRowState["status"], SemanticColor> = {
  success: "success",
  error: "danger",
  pending: "warning",
};

const STATUS_FILTERS: { key: QueryRowState["status"] | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "success", label: "Success" },
  { key: "error", label: "Error" },
  { key: "pending", label: "Pending" },
];

interface DebugQueryPanelProps {
  search: string;
}

export default function DebugQueryPanel({ search }: DebugQueryPanelProps) {
  const queryClient = useQueryClient();
  const [queries, setQueries] = useState<QueryRowState[]>(() => readQueries(queryClient));
  const [statusFilter, setStatusFilter] = useState<QueryRowState["status"] | "all">("all");

  // Suscripción cruda al QueryCache: es la única forma de saber "algo cambió
  // en cualquier query" sin instanciar un useQuery por cada key existente.
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      setQueries(readQueries(queryClient));
    });
    return unsubscribe;
  }, [queryClient]);

  const filtered = queries
    .filter(q => statusFilter === "all" || q.status === statusFilter)
    .filter(q => matchesSearchText(q.displayKey, search));

  if (queries.length === 0) {
    return <EmptyState message="El cache de React Query está vacío." />;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="shrink-0 text-[10px] font-bold text-text-tertiary">
          {filtered.length} de {queries.length} {queries.length === 1 ? "query" : "queries"}
        </span>
        <div className="flex shrink-0 gap-1 rounded-xl bg-slate-100/60 p-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                statusFilter === f.key ? "bg-white text-slate-700 shadow-xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="secondary"
          icon={<Trash2 className="h-3.5 w-3.5" />}
          onClick={() => queryClient.clear()}
        >
          Purgar cache
        </Button>
      </div>
      {filtered.length === 0 ? (
        <EmptyState message="Ninguna query coincide con la búsqueda." />
      ) : (
        <ul className="space-y-1.5">
          {filtered.map(row => (
            <QueryRow key={row.key} row={row} queryClient={queryClient} />
          ))}
        </ul>
      )}
    </div>
  );
}

function QueryRow({ row, queryClient }: { row: QueryRowState; queryClient: ReturnType<typeof useQueryClient> }) {
  const [expanded, setExpanded] = useState(false);
  const accent = SEMANTIC_COLOR_MAP[STATUS_ACCENT[row.status]];

  return (
    <li className="rounded-control border border-border-default bg-white">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left cursor-pointer"
      >
        <span className={`shrink-0 rounded-pill px-1.5 py-0.5 text-[9px] font-black uppercase ${accent.bg100} ${accent.text700}`}>
          {row.status}
        </span>
        {row.fetchStatus === "fetching" && (
          <RefreshCw className="h-3 w-3 shrink-0 animate-spin text-brand-500" />
        )}
        {row.isStale && row.fetchStatus !== "fetching" && (
          <span className="shrink-0 rounded-pill bg-warning-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-warning-700">stale</span>
        )}
        <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-text-primary">{row.displayKey}</span>
        <span className="shrink-0 text-[10px] text-text-tertiary">{row.observersCount} obs.</span>
      </button>
      {expanded && (
        <div className="border-t border-border-default bg-slate-50">
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all px-3 py-2 text-[10px] text-slate-600">
            {JSON.stringify(row.data, null, 2) ?? "undefined"}
          </pre>
          <div className="flex items-center gap-2 border-t border-border-default px-3 py-1.5">
            <button
              type="button"
              onClick={() => queryClient.invalidateQueries({ queryKey: row.query.queryKey })}
              className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              <Database className="h-3 w-3" /> Invalidar
            </button>
            <button
              type="button"
              onClick={() => queryClient.refetchQueries({ queryKey: row.query.queryKey })}
              className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" /> Refetch
            </button>
            <button
              type="button"
              onClick={() => queryClient.removeQueries({ queryKey: row.query.queryKey })}
              className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-danger-600 cursor-pointer"
            >
              <Ban className="h-3 w-3" /> Eliminar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
