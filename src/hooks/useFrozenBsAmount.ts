/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Punto único de decisión "monto en Bs. congelado vs. en vivo" para montos
 * de un proyecto — envuelve useCurrencyConversion(). Si el proyecto tiene
 * una congelación vigente (no reemplazada) para el trigger dado, usa
 * los Bs. congelados (fijos, no se mueven con ninguna tasa del día ni con el
 * switch BCV/USDT); si no, cae al convert() en vivo de siempre. Único lugar donde vive este
 * `if`, para no repetirlo en cada vista que muestra montos de proyecto.
 */

import { useMemo } from "react";
import type { RateFreeze } from "@/types";
import { useCurrencyConversion, formatBs } from "./useCurrencyConversion";

export interface FrozenBsAmountResult {
  /** Monto en Bs. — congelado si hay freeze vigente, en vivo si no. */
  bs: number;
  /** Ya formateado con formatBs() para render directo. */
  formatted: string;
  isFrozen: boolean;
  /** Solo presente si isFrozen. */
  freeze?: RateFreeze;
}

/**
 * Bs. por unidad de moneda base implícitos en un congelado: sus Bs. sobre su
 * equivalente en base. Así un monto en base (USD) se convierte con la misma
 * proporción que se congeló aunque el monto original estuviera en EUR o USDT
 * (su tasa propia). Sin esos datos (congelados antiguos), la tasa registrada.
 */
function bsPerBase(freeze: RateFreeze): number | null {
  if (freeze.frozenAmountBs != null && freeze.frozenAmountBase) return freeze.frozenAmountBs / freeze.frozenAmountBase;
  return freeze.frozenRate;
}

/** Última congelación vigente (no superseded) para un trigger dado. */
export function activeFreezeFor(rateFreezes: RateFreeze[] | undefined, trigger: RateFreeze["trigger"]): RateFreeze | undefined {
  return rateFreezes?.find(f => f.trigger === trigger && f.supersededById === null);
}

export function useFrozenBsAmount(
  amountBase: number | null | undefined,
  rateFreezes: RateFreeze[] | undefined,
  trigger: RateFreeze["trigger"],
): FrozenBsAmountResult {
  const { convert, hasRates } = useCurrencyConversion();

  return useMemo(() => {
    const amount = amountBase ?? 0;
    const freeze = activeFreezeFor(rateFreezes, trigger);

    const frozenBsPerBase = freeze ? bsPerBase(freeze) : null;
    if (freeze && frozenBsPerBase != null) {
      const bs = amount * frozenBsPerBase;
      return { bs, formatted: `Bs. ${formatBs(bs)}`, isFrozen: true, freeze };
    }

    if (!hasRates) {
      return { bs: 0, formatted: "—", isFrozen: false };
    }

    const bs = convert(amount, "USD");
    return { bs, formatted: `Bs. ${formatBs(bs)}`, isFrozen: false };
  }, [amountBase, rateFreezes, trigger, convert, hasRates]);
}
