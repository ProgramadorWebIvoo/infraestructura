/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Una fila de la matriz de "Control por Departamento": el interruptor
 * maestro del departamento (apaga toda su IA de un golpe) + la lista
 * expandible de sus acciones específicas, cada una con su propio
 * interruptor. Espejo visual de ActionRuleRow.tsx (matriz de notificaciones)
 * pero con Check/X en vez de selectores de rol — acá el valor es binario.
 */

import { useState } from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import IconActionButton from "@/components/UI/IconActionButton";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { springs } from "@/animations";
import type { AiFeatureActionOption } from "@/hooks/useAiFeatureToggles";
import type { AiFeatureMatrixEntry } from "@/stores/aiFeatureGateStore";

const DEPARTMENT_LABELS: Record<string, string> = {
  PROCURA: "Procura",
  CIERRE_DE_OBRA: "Cierre de Obra",
  ANALISTA: "Analistas",
  CATALOGOS: "Proveedores",
};

interface AiDepartmentRowProps {
  department: string;
  entry: AiFeatureMatrixEntry;
  actions: AiFeatureActionOption[];
  pendingKey: string | null;
  onToggleMaster: (enabled: boolean) => void;
  onToggleAction: (action: string, enabled: boolean) => void;
}

export default function AiDepartmentRow({ department, entry, actions, pendingKey, onToggleMaster, onToggleAction }: AiDepartmentRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const danger = SEMANTIC_COLOR_MAP.danger;
  const isMasterPending = pendingKey === `${department}:__master__`;

  return (
    <div className="border-b border-border-subtle last:border-0">
      <div className="w-full flex items-center gap-2.5 -mx-2 px-2 py-3">
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          aria-expanded={isOpen}
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
        >
          <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={springs.snappy} className="shrink-0">
            <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
          </motion.span>
          <span className={`flex-1 min-w-0 text-sm font-bold truncate ${entry.master ? "text-text-secondary" : "text-text-muted"}`}>
            {DEPARTMENT_LABELS[department] ?? department}
          </span>
          {!entry.master && (
            <span className={`text-[10px] font-bold uppercase tracking-wide ${danger.text600} ${danger.bg50} border ${danger.border100} rounded-pill px-1.5 py-0.5 shrink-0`}>
              IA desactivada
            </span>
          )}
        </button>
        <IconActionButton
          label={entry.master ? `Desactivar IA de ${department}` : `Activar IA de ${department}`}
          tooltip={entry.master ? "Desactivar toda la IA de este departamento" : "Activar IA de este departamento"}
          onClick={() => onToggleMaster(!entry.master)}
          tone={entry.master ? "amber" : "emerald"}
          disabled={isMasterPending}
          icon={entry.master ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
        />
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: { height: springs.gentle, opacity: { duration: 0.2, delay: 0.05 } } }}
            exit={{ height: 0, opacity: 0, transition: { height: springs.gentle, opacity: { duration: 0.1 } } }}
            className="overflow-hidden"
          >
            <div className="pb-3.5 space-y-2">
              {actions.map(action => {
                const actionEnabled = entry.actions[action.value] ?? true;
                const isPending = pendingKey === `${department}:${action.value}`;
                return (
                  <div key={action.value} className="flex items-center gap-2.5 rounded-control bg-surface-sunken px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate ${actionEnabled ? "text-text-secondary" : "text-text-muted"}`}>{action.label}</p>
                      <p className="text-[10px] text-text-tertiary font-medium leading-snug mt-0.5">{action.description}</p>
                    </div>
                    <IconActionButton
                      label={actionEnabled ? `Desactivar ${action.label}` : `Activar ${action.label}`}
                      tooltip={!entry.master ? "El interruptor maestro del departamento está apagado" : actionEnabled ? "Desactivar" : "Activar"}
                      onClick={() => onToggleAction(action.value, !actionEnabled)}
                      tone={actionEnabled ? "amber" : "emerald"}
                      disabled={isPending || !entry.master}
                      icon={actionEnabled ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
