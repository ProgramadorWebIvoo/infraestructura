/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Switch BCV / USDT de la tasa con la que se calculan los montos en Bs. en
 * toda la app. Anclado a useCurrencyConversion() (el modo vive en un store
 * global, así que cambiarlo aquí actualiza cada BsAmount de cualquier vista
 * sin tocarlas). Pensado para ir al lado de las KpiPills de cada vista. Se
 * oculta si no hay tasa USDT o si el rol del usuario no está en
 * `tasa_switch_roles` (CONFIG APP). Los montos con tasa congelada no
 * obedecen al switch.
 */

import SegmentedControl, { type SegmentedOption } from "./SegmentedControl";
import Tooltip from "./Tooltip";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { useRateSwitchRoleAllowed } from "@/hooks/useRateSwitchRoleAllowed";
import type { UsdRateMode } from "@/stores/usdRateModeStore";

const OPTIONS: SegmentedOption<UsdRateMode>[] = [
  { value: "BCV", label: "$ BCV" },
  { value: "USDT", label: "USDT" },
];

function formatRate(value: number | undefined): string {
  return value != null ? value.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
}

export default function RateModeSwitch({ className = "" }: { className?: string }) {
  const { usdRateMode, setUsdRateMode, hasUsdtRate, rates } = useCurrencyConversion();
  const roleAllowed = useRateSwitchRoleAllowed();

  if (!hasUsdtRate || !roleAllowed) return null;

  const tooltip = (
    <span className="block max-w-64 whitespace-normal leading-snug">
      <span className="block font-bold">Tasa para los montos en Bs.</span>
      <span className="block font-medium">
        Elige si el dólar se convierte con la tasa oficial BCV (Bs. {formatRate(rates.USD)}) o con la tasa USDT del
        mercado paralelo (Bs. {formatRate(rates.USDT)}). Los montos con tasa congelada no cambian.
      </span>
      <span className="mt-1 block text-[10px] font-medium text-slate-400">Fuente USDT: usdt.com.ve</span>
    </span>
  );

  return (
    <Tooltip content={tooltip} placement="bottom">
      <span className={`inline-flex ${className}`}>
        <SegmentedControl
          options={OPTIONS}
          value={usdRateMode}
          onChange={setUsdRateMode}
          size="sm"
          ariaLabel="Tasa para los montos en bolívares"
        />
      </span>
    </Tooltip>
  );
}
