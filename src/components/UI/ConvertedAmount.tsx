/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Monto de una obra con su "conversor doble": el valor en el dólar activo (USD-BCV
 * o USD-USDT, el que elige el switch), la moneda original de cotización cuando la
 * oferta adjudicada vino en otra moneda, y los Bs. — con la tasa de esa moneda si
 * hubo conversión, o la del switch si el monto es nativo en USD. Para importes
 * derivados de la oferta adjudicada que solo existen en moneda base (finiquito,
 * anticipo…): su equivalente original sale de dividir por la tasa a base fijada
 * al cotizar, la misma con la que se generará la orden de pago.
 *
 * Sin oferta convertida se comporta como un monto nativo en USD (valor, sin
 * "cotizado"), igual que antes.
 */

import { formatCurrency } from "@ivoo/shared";
import BsAmount from "./BsAmount";
import OriginalAmount from "./OriginalAmount";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { round2 } from "@/utils/paymentSettlement";
import type { Project } from "@/types";

/** Oferta adjudicada de la obra (la propuesta seleccionada), si la hay. */
export function awardedProposalOf(project: Pick<Project, "proposals" | "selectedProposalId"> | null | undefined) {
  return project?.proposals?.find(p => p.id === project.selectedProposalId) ?? null;
}

interface ConvertedAmountProps {
  /** Importe en moneda base (USD-BCV), tal como lo guarda el backend. */
  amountBase: number;
  /** Moneda en que se cotizó la oferta de la que deriva el importe (null/"USD" = nativo en USD). */
  quoteCurrency?: string | null;
  /** Tasa a base fijada al cotizar (1 unidad de quoteCurrency = fx en base). */
  fxRateToBase?: number | null;
  className?: string;
  /** "inline": en el flujo de texto; "block": columna con una línea por dato. */
  variant?: "block" | "inline";
}

export default function ConvertedAmount({ amountBase, quoteCurrency, fxRateToBase, className = "", variant = "block" }: ConvertedAmountProps) {
  const { convert, hasRates, isLoading, convertToModeUsd } = useCurrencyConversion();

  const isConverted = !!quoteCurrency && quoteCurrency !== "USD" && !!fxRateToBase && fxRateToBase > 0;
  const original = isConverted ? round2(amountBase / (fxRateToBase as number)) : null;
  const usd = convertToModeUsd(amountBase, original, quoteCurrency);

  if (variant === "inline") {
    return (
      <span className={className}>
        {formatCurrency(usd)}
        {original != null && <OriginalAmount amount={original} currency={quoteCurrency} variant="inline" label="Cotizado: " />}
        <BsAmount amount={original ?? amountBase} fromCode={original != null ? (quoteCurrency as string) : "USD"} convert={convert} hasRates={hasRates} isLoading={isLoading} variant="inline" />
      </span>
    );
  }

  return (
    <div className={className}>
      <span className="font-mono font-black text-slate-800">{formatCurrency(usd)}</span>
      {original != null && <OriginalAmount amount={original} currency={quoteCurrency} label="Cotizado: " />}
      <BsAmount amount={original ?? amountBase} fromCode={original != null ? (quoteCurrency as string) : "USD"} convert={convert} hasRates={hasRates} isLoading={isLoading} />
    </div>
  );
}
