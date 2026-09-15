/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Control por Departamento" — sección de Config IA para activar/desactivar
 * la integración de IA por departamento (interruptor maestro) y por acción
 * específica dentro de ese departamento (interruptor granular). Al
 * desactivar, la integración desaparece de la vista del rol correspondiente
 * (ver useAiFeatureGate, consumido en BidEvaluationSection,
 * DossierEvaluationPanel, AnalistasWorkspace, ContractorDetailModal).
 *
 * Guardado inmediato por toggle (no el patrón "Guardar todo" de CONFIG APP)
 * — mismo criterio que handleToggleActive en AIConfigTable.
 */

import { motion } from "motion/react";
import InfoBanner from "@/components/UI/InfoBanner";
import Card from "@/components/UI/Card";
import { SkeletonBlock, SkeletonCollapsedRow, SkeletonGroup, SkeletonGroupItem } from "@/components/SkeletonLoader";
import { containerVariants, itemVariants } from "@/animations";
import { useToast } from "@/components/UI/Toast";
import { getErrorMessage } from "@/services/logger";
import { useAiFeatureToggles } from "@/hooks/useAiFeatureToggles";
import AiDepartmentRow from "./AiDepartmentRow";

interface AiFeatureMatrixProps {
  authToken: string;
}

export default function AiFeatureMatrix({ authToken }: AiFeatureMatrixProps) {
  const { showToast } = useToast();
  const { departments, actions, matrix, isLoading, pendingKey, setToggle } = useAiFeatureToggles(authToken, true);

  const handleToggle = async (department: string, action: string | null, enabled: boolean) => {
    try {
      await setToggle(department, action, enabled);
      showToast(enabled ? "Función de IA activada." : "Función de IA desactivada.", "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Error al cambiar el estado de la función de IA."), "error");
    }
  };

  if (isLoading) {
    return (
      <SkeletonGroup className="space-y-2">
        <SkeletonBlock className="h-3 w-40 mb-1.5" />
        <SkeletonGroupItem>
          <Card hoverable={false} className="p-0 px-4">
            {Array.from({ length: 4 }).map((_, r) => (
              <SkeletonCollapsedRow key={r} className={r < 3 ? "border-b border-border-subtle" : ""} />
            ))}
          </Card>
        </SkeletonGroupItem>
      </SkeletonGroup>
    );
  }

  return (
    <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div variants={itemVariants}>
        <InfoBanner title="¿Cómo funciona el control por departamento?" defaultOpen={false} color="indigo">
          <p>
            Cada departamento tiene un <strong>interruptor maestro</strong> que apaga toda su integración de IA de un
            golpe, y un interruptor <strong>específico</strong> por acción dentro de ese departamento. Al desactivar
            una función, el botón o sección correspondiente desaparece de la vista de ese rol — no solo se
            deshabilita.
          </p>
          <p className="mt-1.5">
            Sin fila configurada, una función queda <strong>habilitada por defecto</strong>. El interruptor específico
            solo aplica si el maestro del departamento está activo.
          </p>
        </InfoBanner>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card hoverable={false} className="p-0 px-4">
          {departments.map(department => (
            <AiDepartmentRow
              key={department}
              department={department}
              entry={matrix[department] ?? { master: true, actions: {} }}
              actions={actions.filter(a => a.department === department)}
              pendingKey={pendingKey}
              onToggleMaster={enabled => handleToggle(department, null, enabled)}
              onToggleAction={(action, enabled) => handleToggle(department, action, enabled)}
            />
          ))}
        </Card>
      </motion.div>
    </motion.div>
  );
}
