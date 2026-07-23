import { useQuery } from "@tanstack/react-query";
import type { AuditLog } from "../types";
import { requestJson } from "../api";

export function useAuditLogs(token: string | null) {
  return useQuery<AuditLog[]>({
    queryKey: ["auditLogs"],
    queryFn: async () => {
      const json = await requestJson<{ data: AuditLog[] } | AuditLog[]>(token, "/audit-logs");
      return Array.isArray(json) ? json : json.data;
    },
    enabled: !!token,
    staleTime: 30_000,
  });
}
