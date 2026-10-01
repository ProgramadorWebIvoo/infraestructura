/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marca "Devuelto por <rol>" para un registro (card o fila) que volvió a una
 * etapa anterior por rechazo/devolución del flujo. El motivo y la fecha van
 * en el tooltip. Ver `ReturnInfo` y ProjectReturnResolver (backend).
 */

import type { ReturnInfo } from "@ivoo/shared";
import { roleLabel } from "@/constants/roles";
import { SEMANTIC_COLOR_MAP } from "./colorTokens";
import Tooltip from "./Tooltip";

interface ReturnedBadgeProps {
  info: ReturnInfo;
  className?: string;
}

export default function ReturnedBadge({ info, className = "" }: ReturnedBadgeProps) {
  const color = SEMANTIC_COLOR_MAP.warning;
  const date = info.at ? new Date(info.at).toLocaleDateString("es-VE") : null;
  const tip = [info.reason ?? "Sin motivo registrado", date].filter(Boolean).join(" · ");

  return (
    <Tooltip content={tip}>
      <span
        tabIndex={0}
        className={`inline-flex items-center whitespace-nowrap px-2 py-1 rounded-pill text-xs font-semibold border ${color.bg50} ${color.border200} ${color.text700} ${className}`}
      >
        Devuelto por {roleLabel(info.byRole)}
      </span>
    </Tooltip>
  );
}
