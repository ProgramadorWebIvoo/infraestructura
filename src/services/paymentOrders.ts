/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Orden de pago digital (F4 Bloque C): detalle con línea de firmas + acción
 * de firmar. `apiFetch` desenvuelve `data` (convención Laravel), así que
 * estos endpoints devuelven directamente el objeto esperado.
 */

import { apiFetch } from "@/services/api";
import type { PaymentOrder, PaymentOrderDetail } from "@/types";

export async function fetchPaymentOrder(orderId: number, authToken: string): Promise<PaymentOrderDetail> {
  return apiFetch(`/payment-orders/${orderId}`, { token: authToken });
}

export async function signPaymentOrder(orderId: number, authToken: string): Promise<void> {
  await apiFetch(`/payment-orders/${orderId}/sign`, { method: "POST", token: authToken });
}

export interface PendingSignaturesInbox {
  hasConfiguredSteps: boolean;
  orders: PaymentOrder[];
}

/** Bandeja "Firmas pendientes" (F4 Bloque C): órdenes donde le toca firmar al usuario actual, sea cual sea su rol. */
export async function fetchPendingSignatures(authToken: string): Promise<PendingSignaturesInbox> {
  return apiFetch("/payment-orders/pending-signatures", { token: authToken });
}
