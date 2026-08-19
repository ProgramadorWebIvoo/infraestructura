/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de detalle (solo lectura) de un proveedor — datos secundarios que no
 * caben en la tabla sin apretar columnas (Código, Email, Teléfono, Origen,
 * fechas). La tabla conserva solo las columnas de consulta "first-hand"
 * (Nombre, Especialidad, Rating, Estado); este modal es el drill-down.
 */

import type { ReactNode } from "react";
import { Mail, Phone, Info } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";
import { SOURCE_BADGE, STATUS_BADGE, type ConfigContractor } from "../types";

interface ContractorDetailModalProps {
  contractor: ConfigContractor | null;
  onClose: () => void;
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{label}</p>
      <div className="text-sm font-semibold text-text-primary">{children}</div>
    </div>
  );
}

export default function ContractorDetailModal({ contractor, onClose }: ContractorDetailModalProps) {
  const source = contractor ? (SOURCE_BADGE[contractor.registrationSource] ?? SOURCE_BADGE.INTERNAL) : null;
  const sourceSemantic = source ? SEMANTIC_COLOR_MAP[source.role] : null;
  const status = contractor ? (STATUS_BADGE[contractor.status] ?? STATUS_BADGE.PENDING_REVIEW) : null;
  const statusSemantic = status ? SEMANTIC_COLOR_MAP[status.role] : null;

  return (
    <Modal
      isOpen={contractor !== null}
      onClose={onClose}
      title={contractor?.name}
      badge={contractor?.code}
      icon={<Info className="h-5 w-5" />}
      iconColor="indigo"
      maxWidth="max-w-md"
    >
      {contractor && source && sourceSemantic && status && statusSemantic && (
        <div className="grid grid-cols-2 gap-4">
          <DetailField label="Código">
            <span className={`inline-block rounded-control border ${SEMANTIC_COLOR_MAP.info.border100} ${SEMANTIC_COLOR_MAP.info.bg50} px-2 py-0.5 font-mono text-xs ${SEMANTIC_COLOR_MAP.info.text600}`}>
              {contractor.code}
            </span>
          </DetailField>

          <DetailField label="Origen">
            <span className={`inline-block rounded-pill border px-2.5 py-0.5 text-[10px] font-bold ${sourceSemantic.border100} ${sourceSemantic.bg50} ${sourceSemantic.text700}`}>
              {source.label}
            </span>
          </DetailField>

          <DetailField label="Email">
            {contractor.email ? (
              <span className="flex items-center gap-1.5 font-mono text-xs">
                <Mail className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                {contractor.email}
              </span>
            ) : (
              <span className="text-text-muted italic">—</span>
            )}
          </DetailField>

          <DetailField label="Teléfono">
            {contractor.phone ? (
              <span className="flex items-center gap-1.5 font-mono text-xs">
                <Phone className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                {contractor.phone}
              </span>
            ) : (
              <span className="text-text-muted italic">—</span>
            )}
          </DetailField>

          <DetailField label="Estado">
            <span className={`inline-block rounded-pill border px-2.5 py-0.5 text-[10px] font-bold ${statusSemantic.border100} ${statusSemantic.bg50} ${statusSemantic.text700}`}>
              {status.label}
            </span>
          </DetailField>

          <DetailField label="Rating">
            <span className={`font-mono text-sm font-black ${SEMANTIC_COLOR_MAP.warning.text600}`}>
              {contractor.rating.toFixed(1)}
            </span>
          </DetailField>

          <DetailField label="Registrado">{contractor.createdAt}</DetailField>
          <DetailField label="Actualizado">{contractor.updatedAt}</DetailField>
        </div>
      )}
    </Modal>
  );
}
