import { useQuery } from "@tanstack/react-query";
import type { AuditLog } from "../types";
import { requestJson } from "../api";

/**
 * `requestJson` delega en `apiFetch` (@ivoo/shared), que ya desenvuelve un
 * nivel de `.data` — GET /audit-logs responde `{ data: { items, currentPage,
 * lastPage, total, perPage } }` (mismo shape enveloped que /config-audit-logs,
 * ver docblock de AuditLogController::index en el backend), así que acá se
 * recibe directamente `{ items, currentPage, ... }`, no un array plano.
 */
export function useAuditLogs(token: string | null) {
  return useQuery<AuditLog[]>({
    queryKey: ["auditLogs"],
    queryFn: async () => {
      const json = await requestJson<{ items: AuditLog[] }>(token, "/audit-logs");
      return json.items ?? [];
    },
    enabled: !!token,
    staleTime: 30_000,
  });
}
