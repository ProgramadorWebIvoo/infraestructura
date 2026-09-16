/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Toggle del DEBUG-MODE — a diferencia del resto de SettingGroupCard, no
 * pega al backend ni pasa por settingsDraft: es un flag 100% client-side en
 * stores/debugStore.ts (localStorage por-navegador), así que se guarda al
 * instante, sin draft/dirty state ni botón "Guardar todo".
 */

import { motion } from "motion/react";
import { Bug } from "lucide-react";
import { itemVariants } from "@/animations";
import Card from "@/components/UI/Card";
import SectionHeader from "@/components/UI/SectionHeader";
import SegmentedControl from "@/components/UI/SegmentedControl";
import { useDebugStore } from "@/stores/debugStore";

export default function DebugModeCard() {
  const enabled = useDebugStore(s => s.enabled);
  const setEnabled = useDebugStore(s => s.setEnabled);

  return (
    <motion.div variants={itemVariants}>
      <Card>
        <SectionHeader
          icon={<Bug className="h-5 w-5" />}
          title="Modo Debug"
          description="Muestra un panel flotante con requests HTTP, eventos WebSocket y logs internos de la app — solo visible para tu navegador, no afecta a otros usuarios."
          color="neutral"
        />
        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-xs text-text-secondary max-w-sm">
            Útil para depurar errores o procesos en desarrollo. Se activa/desactiva al instante, sin necesidad de guardar.
          </p>
          <SegmentedControl
            ariaLabel="Activar modo debug"
            variant="pill"
            accent="neutral"
            value={enabled ? "on" : "off"}
            onChange={value => setEnabled(value === "on")}
            options={[
              { value: "off", label: "Apagado" },
              { value: "on", label: "Encendido" },
            ]}
          />
        </div>
      </Card>
    </motion.div>
  );
}
