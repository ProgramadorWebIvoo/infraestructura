/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de detalle (solo lectura) de un proveedor — datos secundarios que no
 * caben en la tabla sin apretar columnas (Código, Email, Teléfono, Origen,
 * fechas). La tabla conserva solo las columnas de consulta "first-hand"
 * (Nombre, Especialidad, Rating, Estado); este modal es el drill-down.
 */

import { useState, type ReactNode } from "react";
import { Mail, Phone, Info, BrainCircuit, RefreshCw, Building2, Calendar, Star } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import Spinner from "@/components/UI/Spinner";
import Card from "@/components/UI/Card";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { SOURCE_BADGE, STATUS_BADGE, type ConfigContractor } from "@/views/ConfigAppPanel/components/ProveedoresConfigPanel/types";
import { useAiFeatureGate } from "@/hooks/useAiFeatureGate";
import { getContractorRatingSuggestion, type ContractorRatingSuggestion } from "@/services/aiEvaluationService";
import { getErrorMessage } from "@/services/logger";

interface ContractorDetailModalProps {
  contractor: ConfigContractor | null;
  onClose: () => void;
  authToken: string;
}

/**
 * Bloque "Sugerencia IA" — informativo, no autoritativa: no modifica
 * `rating`, solo muestra un ajuste sugerido con justificación para que el
 * admin decida si lo aplica manualmente (ver ContractorRatingSuggestionStrategy
 * en el backend). Carga bajo demanda (no automática al abrir el modal) para
 * no disparar una llamada a IA cada vez que se consulta un proveedor.
 */
function AiRatingSuggestion({ contractorCode, authToken }: { contractorCode: string; authToken: string }) {
  const [suggestion, setSuggestion] = useState<ContractorRatingSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const warning = SEMANTIC_COLOR_MAP.warning;

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getContractorRatingSuggestion(contractorCode, authToken);
      setSuggestion(result);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo obtener la sugerencia de IA."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card hoverable={false} className={`p-4 ${warning.borderL500} ${warning.border100} ${warning.bg50}`}>
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-border-200">
        <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${warning.text700}`}>
          <BrainCircuit className="h-4 w-4" />
          Análisis IA
        </div>
        {!isLoading && (
          <Button variant="secondary" size="sm" onClick={load} icon={<RefreshCw className="h-3 w-3" />}>
            {suggestion ? "Actualizar" : "Analizar"}
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-text-secondary font-medium">
          <Spinner size="sm" />
          Analizando historial del proveedor...
        </div>
      )}

      {error && !isLoading && (
        <p className="text-xs text-danger-600 font-medium">{error}</p>
      )}

      {suggestion && !isLoading && (
        <div className="space-y-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-text-secondary">Rating sugerido:</span>
            <span className={`font-mono text-base font-black ${SEMANTIC_COLOR_MAP.warning.text600}`}>
              {suggestion.suggestedRating !== null ? suggestion.suggestedRating.toFixed(1) : "N/A"}
            </span>
            <span className="text-[10px] text-text-tertiary">(confianza: {suggestion.confidenceScore}%)</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed bg-white/50 rounded-control p-2">
            {suggestion.rationale}
          </p>
          <p className="text-[10px] text-text-tertiary font-medium italic">
            💡 Recomendación — revisa y aplica manualmente si lo consideras apropiado.
          </p>
        </div>
      )}

      {!suggestion && !isLoading && !error && (
        <p className="text-xs text-text-secondary font-medium">
          Analiza la tendencia de precios y tasa de adjudicación para sugerir un ajuste de rating.
        </p>
      )}
    </Card>
  );
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

export default function ContractorDetailModal({ contractor, onClose, authToken }: ContractorDetailModalProps) {
  const source = contractor ? (SOURCE_BADGE[contractor.registrationSource] ?? SOURCE_BADGE.INTERNAL) : null;
  const sourceSemantic = source ? SEMANTIC_COLOR_MAP[source.role] : null;
  const status = contractor ? (STATUS_BADGE[contractor.status] ?? STATUS_BADGE.PENDING_REVIEW) : null;
  const statusSemantic = status ? SEMANTIC_COLOR_MAP[status.role] : null;
  const { isAiFeatureEnabled } = useAiFeatureGate();
  const showAiSuggestion = isAiFeatureEnabled("CATALOGOS", "ia.proveedores.sugerencia_rating");

  return (
    <Modal
      isOpen={contractor !== null}
      onClose={onClose}
      title={contractor?.name}
      badge={contractor?.code}
      icon={<Building2 className="h-5 w-5" />}
      iconColor="indigo"
      maxWidth="max-w-lg"
    >
      {contractor && source && sourceSemantic && status && statusSemantic && (
        <div className="space-y-5">
          {/* ── Información Básica ── */}
          <Card hoverable={false} className="p-4 bg-surface-raised">
            <SectionTitle icon={<Building2 className="h-4 w-4" />}>Información General</SectionTitle>
            <div className="space-y-3">
              <DetailField label="Código">
                <span className={`inline-block rounded-control border ${SEMANTIC_COLOR_MAP.info.border100} ${SEMANTIC_COLOR_MAP.info.bg50} px-2.5 py-1 font-mono text-xs font-semibold ${SEMANTIC_COLOR_MAP.info.text600}`}>
                  {contractor.code}
                </span>
              </DetailField>

              <DetailField label="Razón Social / Nombre">
                <span className="font-semibold">{contractor.name}</span>
              </DetailField>

              <DetailField label="RIF / ID Fiscal">
                <span className="font-mono text-sm font-semibold">{contractor.rif}</span>
              </DetailField>

              <DetailField label="Especialidad">
                <span className="inline-block rounded-control bg-surface-sunken px-2.5 py-1 font-semibold text-text-secondary text-xs">
                  {contractor.specialty}
                </span>
              </DetailField>
            </div>
          </Card>

          {/* ── Contacto ── */}
          <Card hoverable={false} className="p-4 bg-surface-raised">
            <SectionTitle icon={<Mail className="h-4 w-4" />}>Contacto</SectionTitle>
            <div className="space-y-3">
              <DetailField label="Email" icon={<Mail className="h-4 w-4" />}>
                {contractor.email ? (
                  <a href={`mailto:${contractor.email}`} className="text-brand-600 hover:underline font-mono text-sm">
                    {contractor.email}
                  </a>
                ) : (
                  <span className="text-text-muted italic">No registrado</span>
                )}
              </DetailField>

              <DetailField label="Teléfono" icon={<Phone className="h-4 w-4" />}>
                {contractor.phone ? (
                  <a href={`tel:${contractor.phone}`} className="text-brand-600 hover:underline font-mono text-sm">
                    {contractor.phone}
                  </a>
                ) : (
                  <span className="text-text-muted italic">No registrado</span>
                )}
              </DetailField>
            </div>
          </Card>

          {/* ── Estado y Calificación ── */}
          <Card hoverable={false} className="p-4 bg-surface-raised">
            <SectionTitle icon={<Star className="h-4 w-4" />}>Desempeño y Estado</SectionTitle>
            <div className="space-y-3">
              <DetailField label="Calificación (Rating)">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-lg font-black ${SEMANTIC_COLOR_MAP.warning.text600}`}>
                    {contractor.rating.toFixed(1)}
                  </span>
                  <span className="text-text-tertiary text-xs">/ 10</span>
                </div>
              </DetailField>

              <DetailField label="Estado">
                <span className={`inline-block rounded-pill border px-3 py-1 text-xs font-bold ${statusSemantic.border100} ${statusSemantic.bg50} ${statusSemantic.text700}`}>
                  {status.label}
                </span>
              </DetailField>

              <DetailField label="Origen de Registro">
                <span className={`inline-block rounded-pill border px-3 py-1 text-xs font-bold ${sourceSemantic.border100} ${sourceSemantic.bg50} ${sourceSemantic.text700}`}>
                  {source.label}
                </span>
              </DetailField>
            </div>
          </Card>

          {/* ── Auditoría ── */}
          <Card hoverable={false} className="p-4 bg-surface-raised">
            <SectionTitle icon={<Calendar className="h-4 w-4" />}>Historial</SectionTitle>
            <div className="space-y-3">
              <DetailField label="Registrado el">
                <span className="font-mono text-sm">{contractor.createdAt}</span>
              </DetailField>
              <DetailField label="Última actualización">
                <span className="font-mono text-sm">{contractor.updatedAt}</span>
              </DetailField>
            </div>
          </Card>

          {/* ── Sugerencia IA ── */}
          {showAiSuggestion && (
            <AiRatingSuggestion contractorCode={contractor.code} authToken={authToken} />
          )}
        </div>
      )}
    </Modal>
  );
}
