/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Módulo del ingeniero residente ("Mis obras"). En R1 solo existe el esqueleto
 * (rol, ruta, menú y home); la bandeja con las obras a corroborar llega en R6.
 */

import { HardHat } from "lucide-react";
import EmptyState from "@/components/UI/EmptyState";
import SectionHeader from "@/components/UI/SectionHeader";

export default function ResidentePanel() {
  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        icon={<HardHat className="h-5 w-5" />}
        title="Mis obras"
        description="Obras a su cargo pendientes de verificación en campo"
        color="sky"
      />
      <EmptyState message="No tiene obras asignadas por el momento." icon={<HardHat className="h-8 w-8" />} />
    </div>
  );
}
