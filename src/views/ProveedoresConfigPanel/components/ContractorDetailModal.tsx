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
import { Mail, Phone, Info, BrainCircuit, RefreshCw } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import Spinner from "@/components/UI/Spinner";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { SOURCE_BADGE, STATUS_BADGE, type ConfigContractor } from "@/views/ProveedoresConfigPanel/types";
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
    <div className={`col-span-2 rounded-2xl border p-3.5 ${warning.border100} ${warning.bg50}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${warning.text700}`}>
          <BrainCircuit className="h-3.5 w-3.5" />
          Sugerencia IA de rating
        </div>
        {!isLoading && (
          <Button variant="secondary" size="sm" onClick={load} icon={<RefreshCw className="h-3 w-3" />}>
            {suggestion ? "Actualizar" : "Analizar"}
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Spinner size="sm" />
          Analizando historial del proveedor...
        </div>
      )}

      {error && !isLoading && <p className="text-xs text-danger-600 font-medium">{error}</p>}

      {suggestion && !isLoading && (
        <div className="space-y-1.5">
          <p className="text-xs text-slate-600 leading-relaxed">
            Rating sugerido:{" "}
            <strong className="font-mono text-sm text-slate-800">
              {suggestion.suggestedRating !== null ? suggestion.suggestedRating.toFixed(1) : "N/A"}
            </strong>{" "}
            <span className="text-[10px] text-slate-400">(confianza: {suggestion.confidenceScore}%)</span>
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed">{suggestion.rationale}</p>
          <p className="text-[9px] text-slate-400 font-medium italic">
            Informativa — no modifica el rating actual. Ajústelo manualmente si está de acuerdo.
          </p>
        </div>
      )}

      {!suggestion && !isLoading && !error && (
        <p className="text-xs text-slate-500 font-medium">
          Sugiere un ajuste de rating basado en tendencia de precios y tasa de adjudicación — no reemplaza tu criterio.
        </p>
      )}
    </div>
  );
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{label}</p>
      <div className="text-sm font-semibold text-text-primary">{children}</div>
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

          <DetailField label="RIF">
            <span className="font-mono text-xs">{contractor.rif}</span>
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

          {showAiSuggestion && <AiRatingSuggestion contractorCode={contractor.code} authToken={authToken} />}
        </div>
      )}
    </Modal>
  );
}
