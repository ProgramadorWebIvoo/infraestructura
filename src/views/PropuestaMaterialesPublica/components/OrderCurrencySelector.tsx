/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Moneda del pedido — obligatoria, sin precarga, y aplicada a TODO el
 * pedido (no por línea): el proveedor cotiza un pedido completo en una
 * sola moneda, no mezcla monedas entre materiales de la misma propuesta.
 * Se muestra prominente, antes de la tabla de materiales, para que sea lo
 * primero que el proveedor define — cada precio unitario que cargue abajo
 * se entiende expresado en esta moneda.
 */

import { motion } from "motion/react";
import { Coins } from "lucide-react";
import { itemVariants } from "../../../animations";
import { RequiredMark } from "../../../components/UI/HintSignals";
import type { PublicCurrency } from "../types";

interface OrderCurrencySelectorProps {
  currencies: PublicCurrency[];
  value: string;
  onChange: (code: string) => void;
}

export default function OrderCurrencySelector({ currencies, value, onChange }: OrderCurrencySelectorProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={`rounded-2xl border p-5 transition-colors duration-200 ${
        value ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/10"
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <Coins className={`h-4 w-4 ${value ? "text-emerald-400" : "text-amber-400"}`} />
        <h3 className="flex items-center gap-1.5 text-sm font-black uppercase tracking-wider text-white">
          Moneda de cotización del pedido <RequiredMark filled={!!value} />
        </h3>
      </div>
      <p className="mb-4 text-xs font-medium text-slate-300">
        Selecciona en qué moneda estás cotizando <strong className="text-white">todo</strong> este pedido. Todos los precios
        unitarios que cargues a continuación se entenderán expresados en esta moneda.
      </p>
      <div className="flex flex-wrap gap-2">
        {currencies.length === 0 ? (
          <p className="text-xs italic text-slate-400">Cargando monedas disponibles…</p>
        ) : (
          currencies.map((c) => {
            const isSelected = value === c.code;
            return (
              <motion.button
                key={c.code}
                type="button"
                onClick={() => onChange(c.code)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors duration-150 ${
                  isSelected
                    ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
                    : "border-white/15 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10"
                }`}
              >
                <span className="font-mono">{c.symbol}</span>
                {c.code}
                {c.isBase && (
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Base
                  </span>
                )}
              </motion.button>
            );
          })
        )}
      </div>
      {!value && currencies.length > 0 && (
        <p className="mt-3 text-[11px] font-bold text-amber-400">Debes seleccionar una moneda antes de continuar.</p>
      )}
    </motion.div>
  );
}
