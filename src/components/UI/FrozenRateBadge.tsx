/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Indicador visual de que un monto en Bs. está CONGELADO (tasa fija de un
 * trigger de negocio pasado), no recalculado con la tasa BCV del día —
 * mismo lenguaje visual que VariationBadge/ExchangeRatesBadge
 * (SEMANTIC_COLOR_MAP, pill compacto), con tooltip de trazabilidad
 * (trigger, fuente, fecha, motivo si es manual).
 */

import { Lock } from "lucide-react";
import type { RateFreeze } from "@/types";
import Tooltip from "./Tooltip";
import { formatBs } from "@/hooks/useCurrencyConversion";
import { SEMANTIC_COLOR_MAP } from "./colorTokens";

const TRIGGER_LABEL: Record<RateFreeze["trigger"], string> = {
  CONTRATADO: "adjudicación",
  PAGO_ANTICIPO: "pago de anticipo",
  PAGO_FINIQUITO: "pago de finiquito",
};

interface FrozenRateBadgeProps {
  freeze: RateFreeze;
}

export default function FrozenRateBadge({ freeze }: FrozenRateBadgeProps) {
  const c = SEMANTIC_COLOR_MAP.info;
  const date = new Date(freeze.frozenAt).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" });

  const tooltipContent = (
    <div className="space-y-0.5">
      <p>Congelada al {TRIGGER_LABEL[freeze.trigger]} ({date}).</p>
      {freeze.source === "MANUAL" && (
        <p>
          Corrección manual{freeze.frozenByName ? ` por ${freeze.frozenByName}` : ""}
          {freeze.reason ? `: ${freeze.reason}` : "."}
        </p>
      )}
    </div>
  );

  return (
    <Tooltip content={tooltipContent}>
      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap cursor-help ${c.bg100} ${c.text700}`}>
        <Lock className="h-3 w-3" />
        {freeze.frozenRate != null ? `1 ${freeze.baseCurrency} = ${formatBs(freeze.frozenRate)} Bs.` : "Congelado"}
      </span>
    </Tooltip>
  );
}
