/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido de tarjeta para GridView en la vista de Proveedores — el
 * componente genérico (src/components/UI/GridView) no conoce "proveedores",
 * este archivo decide qué pintar dentro de cada tarjeta vía `renderCard`.
 */

import { Link2, Mail, Pencil, Star } from "lucide-react";
import IconActionButton from "../../../components/UI/IconActionButton";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";
import type { Contractor } from "../../../types";

interface ContractorGridCardActions {
  onOpenEdit: (contractor: Contractor) => void;
  onOpenInvite: (contractor: Contractor) => void;
}

export function renderContractorGridCard(contractor: Contractor, { onOpenEdit, onOpenInvite }: ContractorGridCardActions) {
  return (
    <div className="p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-lg border border-sky-100 bg-sky-50/80 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-600">{contractor.code}</span>
        <div className={`inline-flex items-center gap-1 rounded-lg border ${SEMANTIC_COLOR_MAP.warning.border200} bg-gradient-to-br ${SEMANTIC_COLOR_MAP.warning.bg50} to-warning-100/50 px-2 py-0.5 font-mono text-[10px] font-black ${SEMANTIC_COLOR_MAP.warning.text600}`}>
          <Star className={`h-3 w-3 fill-warning-400 ${SEMANTIC_COLOR_MAP.warning.icon500}`} />
          {contractor.rating.toFixed(1)}
        </div>
      </div>

      <div className="min-w-0">
        <div className="font-bold text-slate-800 text-sm truncate">{contractor.name}</div>
        <span className="mt-1 inline-block rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 truncate max-w-full">{contractor.specialty}</span>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-slate-500 truncate">
        <Mail className="h-3 w-3 text-slate-400 shrink-0" />
        <span className="truncate">{contractor.email}</span>
      </div>

      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
        <IconActionButton
          label={`Actualizar evaluación de ${contractor.name}`}
          tooltip="Actualizar evaluación"
          onClick={() => onOpenEdit(contractor)}
          tone="sky"
          icon={<Pencil className="h-3.5 w-3.5" />}
        />
        <IconActionButton
          label={`Generar enlace de propuesta para ${contractor.name}`}
          tooltip="Generar enlace de propuesta"
          onClick={() => onOpenInvite(contractor)}
          tone="indigo"
          icon={<Link2 className="h-3.5 w-3.5" />}
        />
      </div>
    </div>
  );
}
