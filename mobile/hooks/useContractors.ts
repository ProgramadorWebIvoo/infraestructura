import { useQuery } from "@tanstack/react-query";
import type { Contractor } from "../types";
import { requestJson } from "../api";

export function useContractors(token: string | null) {
  return useQuery<Contractor[]>({
    queryKey: ["contractors"],
    queryFn: async () => {
      const json = await requestJson<{ data: Contractor[] } | Contractor[]>(token, "/contractors");
      return Array.isArray(json) ? json : json.data;
    },
    enabled: !!token,
    staleTime: 60_000,
  });
}
