/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Una sección de CONFIG APP: header + lista de SettingRow para un `group`
 * (presupuesto, ratings, fiscal, etc.). Extraído de ConfigAppPanel/index.tsx
 * para separar el JSX de renderizado de la lógica de estado del contenedor.
 */

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { itemVariants } from "../../../animations";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import InfoBanner from "../../../components/UI/InfoBanner";
import type { AppSettingRecord } from "../../../hooks/useAppSettings";
import type { TagOption } from "../../../components/UI/TagMultiSelect";
import SettingRow from "./SettingRow";

export interface SettingGroupMeta {
  title: string;
  description: string;
  icon: ReactNode;
  color: string;
}

interface SettingGroupCardProps {
  group: string;
  meta: SettingGroupMeta;
  settings: AppSettingRecord[];
  valueOf: (setting: AppSettingRecord) => string;
  onChange: (id: number, value: string) => void;
  errors: Partial<Record<number, string>>;
  notificationActionsCatalog?: TagOption[];
}

export default function SettingGroupCard({ group, meta, settings, valueOf, onChange, errors, notificationActionsCatalog }: SettingGroupCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card>
        <SectionHeader icon={meta.icon} title={meta.title} description={meta.description} color={meta.color} />
        {group === "presupuesto" && <PresupuestoSemaforoBanner settings={settings} />}
        <div>
          {settings.map(setting => (
            <SettingRow
              key={setting.id}
              setting={setting}
              value={valueOf(setting)}
              onChange={onChange}
              error={errors[setting.id]}
              notificationActionsCatalog={notificationActionsCatalog}
            />
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

function PresupuestoSemaforoBanner({ settings }: { settings: AppSettingRecord[] }) {
  const thresholdValue = (key: string, fallback: string) => settings.find(s => s.key === key)?.value ?? fallback;

  return (
    <InfoBanner title="¿Cómo funciona el semáforo de ejecución presupuestaria?" defaultOpen={false} className="mb-4">
      <p>
        Cada umbral es un porcentaje sobre el <strong>100% de la inversión aprobada</strong> de un proyecto u oferta
        (monto ejecutado o cotizado ÷ monto autorizado). El semáforo toma el color del primer umbral que el
        porcentaje no supere:
      </p>
      <ul className="mt-1.5 space-y-0.5 font-mono">
        <li>🟢 Verde: hasta el umbral verde ({thresholdValue("semaforo_umbral_verde", "80")}%)</li>
        <li>🟡 Amarillo: entre el umbral verde y el amarillo ({thresholdValue("semaforo_umbral_amarillo", "95")}%)</li>
        <li>🟠 Naranja: entre el umbral amarillo y el naranja ({thresholdValue("semaforo_umbral_naranja", "100")}%)</li>
        <li>🔴 Rojo: al superar el umbral naranja (por defecto, más del 100% — sobre-ejecución)</li>
      </ul>
      <p className="mt-1.5">
        Se usa hoy en el Dashboard de Presidencia (ejecución agregada de toda la cartera) y en la evaluación de
        ofertas de Procura (cada propuesta, individualmente).
      </p>
    </InfoBanner>
  );
}
