import { useQuery } from "@tanstack/react-query";
import type { MaterialItem } from "../types";
import { requestJson } from "../api";

export function useMaterials(token: string | null) {
  return useQuery<MaterialItem[]>({
    queryKey: ["materials"],
    queryFn: async () => {
      const json = await requestJson<{ data: MaterialItem[] } | MaterialItem[]>(token, "/materials");
      return Array.isArray(json) ? json : json.data;
    },
    enabled: !!token,
    staleTime: 60_000,
  });
}
