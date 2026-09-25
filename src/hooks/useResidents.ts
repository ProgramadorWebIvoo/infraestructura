import { useEffect, useState } from "react";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";

export interface ResidentOption {
  id: number;
  name: string;
}

/** Active users with role RESIDENTE, assignable as a location's / custom work's resident (GET /residents). */
export function useResidents(): ResidentOption[] {
  const [residents, setResidents] = useState<ResidentOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ResidentOption[]>("/residents")
      .then((data) => {
        if (!cancelled) setResidents(data);
      })
      .catch((error) => logError("useResidents", error));
    return () => {
      cancelled = true;
    };
  }, []);

  return residents;
}
