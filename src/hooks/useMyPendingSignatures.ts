/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bandeja "Firmas pendientes" (F4 Bloque C): cuántas órdenes le tocan firmar
 * al usuario actual y si su rol/usuario tiene algún paso configurado (para
 * que el sidebar decida si mostrar la pestaña). No usa `usePolledFetch`
 * porque esa función devuelve un array plano y esta respuesta trae también
 * `hasConfiguredSteps` — se usa `useQuery` directo con la misma convención
 * de queryKey ([...key, authToken]) para compartir caché/polling entre el
 * ítem del sidebar y el panel, sin duplicar el fetch.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchPendingSignatures } from "@/services/paymentOrders";
import { DEFAULT_POLL_INTERVAL } from "@/constants";

export function useMyPendingSignatures(authToken: string) {
  const enabled = !!authToken;
  const query = useQuery({
    queryKey: ["myPendingSignatures", authToken],
    queryFn: () => fetchPendingSignatures(authToken),
    enabled,
    refetchInterval: enabled ? DEFAULT_POLL_INTERVAL : false,
    staleTime: Math.max(DEFAULT_POLL_INTERVAL - 5000, 0),
    retry: false,
  });

  return {
    hasConfiguredSteps: query.data?.hasConfiguredSteps ?? false,
    orders: query.data?.orders ?? [],
    isLoading: query.isPending && enabled,
  };
}
