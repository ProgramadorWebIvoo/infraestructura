/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Detalle de los egresos de Finanzas (GET /finance/disbursements): banco,
 * referencia, comprobante, cómo se pagó y las tasas congeladas de cada pago.
 * Sin polling: se consulta a demanda cuando Finanzas inspecciona un egreso.
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/services/api";
import type { PaymentSettlement } from "@/types";

export interface Disbursement {
  id: number;
  projectId: string;
  title: string | null;
  contractorCode: string | null;
  contractorName: string | null;
  /** ADVANCE (anticipo) o FINAL (liquidación del finiquito). */
  type: "ADVANCE" | "FINAL" | string;
  /** Importe en moneda base (USD-BCV). */
  amount: number;
  paidDate: string | null;
  bank: string | null;
  reference: string | null;
  notes: string | null;
  orderNumber: string | null;
  proof: { id: number; name: string } | null;
  /** Moneda en que se cotizó la oferta adjudicada y su tasa a base. */
  quoteCurrency: string;
  fxRateToBase: number | null;
  /** Null en pagos anteriores al registro de liquidación. */
  settlement: PaymentSettlement | null;
}

export const DISBURSEMENTS_QUERY_KEY = ["finance-disbursements"] as const;

export function useFinanceDisbursements(authToken: string, enabled: boolean) {
  return useQuery({
    queryKey: DISBURSEMENTS_QUERY_KEY,
    queryFn: () => apiFetch<Disbursement[]>("/finance/disbursements", { token: authToken }),
    enabled,
    staleTime: 30_000,
  });
}
