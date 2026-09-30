/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Inspección de un egreso del Diario de Finanzas: monto con el conversor doble
 * (dólar activo, moneda cotizada y Bs.), obra y proveedor, orden de pago, banco
 * y referencia, cómo se pagó (moneda, tasa, tasas congeladas) y el comprobante
 * con previsualizador y descarga. Los datos llegan de GET /finance/disbursements,
 * que solo se consulta cuando se abre este modal.
 */

import { useState, type ReactNode } from "react";
import { Download, Eye, FileText, ReceiptText } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import Spinner from "@/components/UI/Spinner";
import AlertBanner from "@/components/UI/AlertBanner";
import ConvertedAmount from "@/components/UI/ConvertedAmount";
import DocumentPreviewModal from "@/components/UI/DocumentPreviewModal";
import { useToast } from "@/components/UI/Toast";
import PaymentSettlementSummary from "@/components/PaymentOrder/PaymentSettlementSummary";
import { useFinanceDisbursements, type Disbursement } from "@/hooks/useFinanceDisbursements";
import { downloadProjectDocument } from "@/services/api";
import type { LedgerEntry } from "./LedgerSection";

const LABEL = "text-[10px] font-bold uppercase tracking-wider text-text-tertiary";

const TYPE_LABEL: Record<string, string> = { ADVANCE: "Anticipo", FINAL: "Liquidación final" };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className={LABEL}>{label}</dt>
      <dd className="mt-0.5 text-xs font-semibold text-text-primary">{children}</dd>
    </div>
  );
}

interface DisbursementDetailModalProps {
  entry: LedgerEntry | null;
  authToken: string;
  onClose: () => void;
}

export default function DisbursementDetailModal({ entry, authToken, onClose }: DisbursementDetailModalProps) {
  const { showToast } = useToast();
  const [previewing, setPreviewing] = useState(false);
  const { data, isLoading, isError } = useFinanceDisbursements(authToken, entry !== null);

  const expectedType = entry?.type === "ANTICIPO" ? "ADVANCE" : "FINAL";
  const detail: Disbursement | null = entry ? (data?.find(d => d.projectId === entry.projectId && d.type === expectedType) ?? null) : null;

  const download = async () => {
    if (!entry || !detail?.proof) return;
    try {
      await downloadProjectDocument(entry.projectId, { id: detail.proof.id, originalName: detail.proof.name }, authToken);
    } catch {
      showToast("No se pudo descargar el comprobante.", "error");
    }
  };

  return (
    <>
      <Modal
        isOpen={entry !== null}
        onClose={onClose}
        maxWidth="max-w-2xl"
        icon={<ReceiptText className="h-5 w-5" />}
        badge="Egreso"
        title={entry?.voucher ?? ""}
        infoLine={entry ? `${entry.title} · ${entry.projectId}` : undefined}
      >
        {entry && (
          <div className="space-y-5 text-left">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className={LABEL}>{TYPE_LABEL[expectedType]} desembolsado</p>
              <ConvertedAmount
                className="mt-1 text-lg"
                amountBase={entry.amount}
                quoteCurrency={detail?.quoteCurrency ?? entry.quoteCurrency}
                fxRateToBase={detail?.fxRateToBase ?? entry.fxRateToBase}
              />
            </div>

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Spinner /> Cargando el detalle del pago…
              </div>
            )}
            {isError && <AlertBanner type="error" message="No se pudo cargar el detalle del pago." />}
            {!isLoading && !isError && !detail && <AlertBanner type="warning" message="No se encontró el detalle de este pago." />}

            {detail && (
              <>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                  <Field label="Fecha de pago">{detail.paidDate ?? "—"}</Field>
                  <Field label="Proveedor">{detail.contractorName ?? detail.contractorCode ?? "—"}</Field>
                  <Field label="Orden de pago">{detail.orderNumber ?? "—"}</Field>
                  <Field label="Banco / plataforma">{detail.bank ?? "—"}</Field>
                  <Field label="Referencia"><span className="font-mono">{detail.reference ?? "—"}</span></Field>
                  <Field label="Código proveedor"><span className="font-mono">{detail.contractorCode ?? "—"}</span></Field>
                </dl>

                <div>
                  <p className={`${LABEL} mb-1.5`}>Cómo se pagó</p>
                  {detail.settlement ? (
                    <PaymentSettlementSummary settlement={detail.settlement} />
                  ) : (
                    <p className="text-[11px] italic text-text-tertiary">Sin detalle de moneda (pago anterior al registro de liquidación).</p>
                  )}
                </div>

                {detail.notes && (
                  <div>
                    <p className={LABEL}>Notas</p>
                    <p className="mt-0.5 text-xs text-text-secondary">{detail.notes}</p>
                  </div>
                )}

                <div>
                  <p className={`${LABEL} mb-1.5`}>Comprobante de pago</p>
                  {detail.proof ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                        <FileText className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                        {detail.proof.name}
                      </span>
                      <Button size="sm" variant="secondary" onClick={() => setPreviewing(true)} aria-label={`Ver comprobante ${detail.proof.name}`}>
                        <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Ver
                      </Button>
                      <Button size="sm" variant="secondary" onClick={download} aria-label={`Descargar comprobante ${detail.proof.name}`}>
                        <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Descargar
                      </Button>
                    </div>
                  ) : (
                    <p className="text-[11px] font-bold text-danger-700">Sin comprobante.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <DocumentPreviewModal
        isOpen={previewing && !!detail?.proof}
        onClose={() => setPreviewing(false)}
        projectId={entry?.projectId ?? ""}
        document={detail?.proof ? { id: detail.proof.id, originalName: detail.proof.name } : null}
        authToken={authToken}
        onDownload={download}
      />
    </>
  );
}
