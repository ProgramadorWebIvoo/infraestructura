/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bandeja "Firmas pendientes" (F4 Bloque C): visible para CUALQUIER rol
 * autenticado, no solo Finanzas/Presidencia/Procura — la cadena de firmas es
 * configurable con cualquier rol del sistema (ver PaymentSignatureStep), así
 * que un usuario de INFRAESTRUCTURA, AUDITORIA, etc. con un paso a su nombre
 * necesita un lugar propio para firmarlo sin tener acceso a esos módulos.
 * Reutiliza PaymentOrderDetailModal (mismo componente que Finanzas/Procura).
 */

import { useState } from "react";
import { FileSignature } from "lucide-react";
import { formatCurrency } from "@ivoo/shared";
import Card from "@/components/UI/Card";
import EmptyState from "@/components/UI/EmptyState";
import SectionHeader from "@/components/UI/SectionHeader";
import Button from "@/components/UI/Button";
import { SkeletonList } from "@/components/SkeletonLoader";
import PaymentOrderDetailModal from "@/components/PaymentOrder/PaymentOrderDetailModal";
import { useMyPendingSignatures } from "@/hooks/useMyPendingSignatures";
import type { PaymentOrder } from "@/types";

interface MisFirmasPanelProps {
  authToken: string;
  activeRole?: string;
}

const PAYMENT_TYPE_LABEL: Record<string, string> = { ADVANCE: "Anticipo", FINAL: "Finiquito" };

export default function MisFirmasPanel({ authToken, activeRole }: MisFirmasPanelProps) {
  const { orders, isLoading } = useMyPendingSignatures(authToken);
  const [viewOrder, setViewOrder] = useState<PaymentOrder | null>(null);

  return (
    <Card accent="warning" className="p-6 space-y-4">
      <SectionHeader
        icon={<FileSignature className="h-5 w-5" />}
        title="Firmas Pendientes"
        description="Órdenes de pago que esperan tu firma en el paso que te corresponde, sin importar el módulo al que pertenezcan."
        color="amber"
      />

      {isLoading ? (
        <SkeletonList items={3} />
      ) : orders.length === 0 ? (
        <EmptyState message="No tienes firmas pendientes por el momento." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {orders.map((order) => (
            <li key={order.id} className="flex flex-wrap items-center gap-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-800 truncate">
                  {order.snapshot.project.title}
                  <span className="ml-2 text-[10px] font-mono font-bold text-slate-400">{order.projectId}</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {PAYMENT_TYPE_LABEL[order.paymentType] ?? order.paymentType} · Orden #{order.number} · {order.snapshot.contractor.name}
                </div>
              </div>
              <div className="text-right whitespace-nowrap">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Monto</div>
                <div className="font-mono font-black text-slate-800">{formatCurrency(order.amount)}</div>
              </div>
              <Button size="sm" colorScheme="amber" icon={<FileSignature className="h-3.5 w-3.5" />} onClick={() => setViewOrder(order)}>
                Revisar y firmar
              </Button>
            </li>
          ))}
        </ul>
      )}

      <PaymentOrderDetailModal order={viewOrder} onClose={() => setViewOrder(null)} authToken={authToken} activeRole={activeRole} />
    </Card>
  );
}
