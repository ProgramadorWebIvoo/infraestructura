/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aviso informativo de las vistas que comparan ofertas: los montos en dólares
 * ($) están en el dólar activo — USD-BCV o USD-USDT, el que elige el switch —
 * y las ofertas cotizadas en EUR o USDT se re-expresan en él para compararlas
 * en una misma unidad. La moneda original de cotización se indica debajo de
 * cada monto. Un solo texto para todas las pantallas (Analistas, Procura,
 * renegociación…), en vez de redactarlo en cada una.
 */

import InfoBanner from "./InfoBanner";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";

interface UsdBcvNoticeProps {
  /** Qué montos cubre el aviso (ej. "'Mejor Oferta'"); por defecto, los montos en $ de la vista. */
  scope?: string;
  defaultOpen?: boolean;
  className?: string;
}

export default function UsdBcvNotice({ scope = "los montos en $ de esta vista", defaultOpen = true, className = "" }: UsdBcvNoticeProps) {
  const { usdLabel } = useCurrencyConversion();

  return (
    <InfoBanner title={`Precios en ${usdLabel}`} color="amber" defaultOpen={defaultOpen} className={className}>
      <p>
        Los precios mostrados en {scope} están en <strong>{usdLabel}</strong>: las ofertas cotizadas en EUR o USDT se re-expresan con la tasa
        {usdLabel === "USD-BCV" ? " BCV" : " USDT"} para compararlas en una misma unidad y dar vistas más concordes y exactas en montos monetarios
        aproximados. La moneda original de cotización se indica debajo de cada monto y puede cambiar el dólar con el switch BCV / USDT.
      </p>
    </InfoBanner>
  );
}
