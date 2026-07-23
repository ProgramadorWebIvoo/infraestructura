import { useQuery } from "@tanstack/react-query";
import type { Project } from "../types";
import { requestJson } from "../api";

export function useProjects(token: string | null) {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const json = await requestJson<{ data: Project[] } | Project[]>(token, "/projects");
      return Array.isArray(json) ? json : json.data;
    },
    enabled: !!token,
    staleTime: 30_000,
  });
}
