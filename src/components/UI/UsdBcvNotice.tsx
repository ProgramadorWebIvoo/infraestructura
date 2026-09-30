/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aviso informativo de las vistas que comparan ofertas: los montos en dólares
 * ($) están en USD-BCV — las ofertas cotizadas en EUR o USDT se convierten con
 * la tasa BCV para compararlas en una misma unidad — y la moneda original de
 * cotización se indica debajo de cada monto. Un solo texto para todas las
 * pantallas (Analistas, Procura, renegociación…), en vez de redactarlo en cada una.
 */

import InfoBanner from "./InfoBanner";

interface UsdBcvNoticeProps {
  /** Qué montos cubre el aviso (ej. "'Mejor Oferta'"); por defecto, los montos en $ de la vista. */
  scope?: string;
  defaultOpen?: boolean;
  className?: string;
}

export default function UsdBcvNotice({ scope = "los montos en $ de esta vista", defaultOpen = true, className = "" }: UsdBcvNoticeProps) {
  return (
    <InfoBanner title="Precios en USD-BCV" color="amber" defaultOpen={defaultOpen} className={className}>
      <p>
        Los precios mostrados en {scope} están en <strong>USD-BCV</strong>: las ofertas cotizadas en EUR o USDT se convierten con la tasa BCV para
        compararlas en una misma unidad y dar vistas más concordes y exactas en montos monetarios aproximados. La moneda original de cotización
        se indica debajo de cada monto.
      </p>
    </InfoBanner>
  );
}
