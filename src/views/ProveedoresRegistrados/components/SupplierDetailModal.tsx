/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de detalle de proveedor registrado — información completa en
 * secciones organizadas, reutilizando el patrón de ContractorDetailModal.
 */

import { type ReactNode } from "react";
import { Mail, Phone, Building2, Star } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Card from "@/components/UI/Card";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import type { Contractor } from "@/types";

interface SupplierDetailModalProps {
  supplier: Contractor | null;
  onClose: () => void;
}

function DetailField({ label, children, icon }: { label: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex gap-3">
      {icon && <div className="shrink-0 text-text-muted mt-1">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{label}</p>
        <div className="text-sm font-semibold text-text-primary break-words">{children}</div>
      </div>
    </div>
  );
}

function SectionTitle({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-200">
      {icon && <div className="text-brand-600">{icon}</div>}
      <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">{children}</h3>
    </div>
  );
}

export default function SupplierDetailModal({ supplier, onClose }: SupplierDetailModalProps) {
  const statusBadge = supplier?.status === "ACTIVE"
    ? { label: "Activo", role: "success" as const }
    : supplier?.status === "INACTIVE"
      ? { label: "Inactivo", role: "danger" as const }
      : { label: "Pendiente", role: "warning" as const };

  const statusSemantic = SEMANTIC_COLOR_MAP[statusBadge.role];

  return (
    <Modal
      isOpen={supplier !== null}
      onClose={onClose}
      title={supplier?.name}
      badge={supplier?.code}
      icon={<Building2 className="h-5 w-5" />}
      iconColor="indigo"
      maxWidth="max-w-lg"
    >
      {supplier && statusSemantic && (
        <div className="space-y-5">
          {/* ── Información Básica ── */}
          <Card hoverable={false} className="p-4 bg-surface-raised">
            <SectionTitle icon={<Building2 className="h-4 w-4" />}>Información General</SectionTitle>
            <div className="space-y-3">
              <DetailField label="Código">
                <span className={`inline-block rounded-control border ${SEMANTIC_COLOR_MAP.info.border100} ${SEMANTIC_COLOR_MAP.info.bg50} px-2.5 py-1 font-mono text-xs font-semibold ${SEMANTIC_COLOR_MAP.info.text600}`}>
                  {supplier.code}
                </span>
              </DetailField>

              <DetailField label="Razón Social / Nombre">
                <span className="font-semibold">{supplier.name}</span>
              </DetailField>

              <DetailField label="RIF / ID Fiscal">
                <span className="font-mono text-sm font-semibold">{supplier.rif}</span>
              </DetailField>

              <DetailField label="Especialidad">
                <span className="inline-block rounded-control bg-surface-sunken px-2.5 py-1 font-semibold text-text-secondary text-xs">
                  {supplier.specialty}
                </span>
              </DetailField>
            </div>
          </Card>

          {/* ── Contacto ── */}
          <Card hoverable={false} className="p-4 bg-surface-raised">
            <SectionTitle icon={<Mail className="h-4 w-4" />}>Contacto</SectionTitle>
            <div className="space-y-3">
              <DetailField label="Email" icon={<Mail className="h-4 w-4" />}>
                {supplier.email ? (
                  <a href={`mailto:${supplier.email}`} className="text-brand-600 hover:underline font-mono text-sm">
                    {supplier.email}
                  </a>
                ) : (
                  <span className="text-text-muted italic">No registrado</span>
                )}
              </DetailField>

              <DetailField label="Teléfono" icon={<Phone className="h-4 w-4" />}>
                {supplier.phone ? (
                  <a href={`tel:${supplier.phone}`} className="text-brand-600 hover:underline font-mono text-sm">
                    {supplier.phone}
                  </a>
                ) : (
                  <span className="text-text-muted italic">No registrado</span>
                )}
              </DetailField>
            </div>
          </Card>

          {/* ── Desempeño y Estado ── */}
          <Card hoverable={false} className="p-4 bg-surface-raised">
            <SectionTitle icon={<Star className="h-4 w-4" />}>Desempeño y Estado</SectionTitle>
            <div className="space-y-3">
              <DetailField label="Calificación (Rating)">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-lg font-black ${SEMANTIC_COLOR_MAP.warning.text600}`}>
                    {supplier.rating.toFixed(1)}
                  </span>
                  <span className="text-text-tertiary text-xs">/ 10</span>
                </div>
              </DetailField>

              {supplier.status && (
                <DetailField label="Estado">
                  <span className={`inline-block rounded-pill border px-3 py-1 text-xs font-bold ${statusSemantic.border100} ${statusSemantic.bg50} ${statusSemantic.text700}`}>
                    {statusBadge.label}
                  </span>
                </DetailField>
              )}
            </div>
          </Card>
        </div>
      )}
    </Modal>
  );
}
