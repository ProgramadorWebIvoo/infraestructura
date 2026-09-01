/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Formulario de material personalizado (fuera de catálogo) — extraído de
 * MaterialAdderSection.tsx (división por SRP).
 */

import { useState } from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import type { MaterialItem } from "../../../types";
import TextField from "../../../components/UI/TextField";
import NumericInput from "../../../components/UI/NumericInput";
import Button from "../../../components/UI/Button";
import { useToast } from "../../../components/UI/Toast";
import { useCurrencyConversion, formatBs } from "../../../hooks/useCurrencyConversion";

interface CustomMaterialFormProps {
  onAdd: (material: Omit<MaterialItem, "id">) => void;
}

export default function CustomMaterialForm({ onAdd }: CustomMaterialFormProps) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("Unidad");
  const [price, setPrice] = useState<number | "">(1.0);
  const [qty, setQty] = useState<number | "">(1);
  const { convert, hasRates, isLoading: ratesLoading } = useCurrencyConversion();
  const [error, setError] = useState("");
  const { showToast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const qtyNum = qty === "" ? 1 : qty;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Por favor, introduce el nombre del material personalizado.");
      document.getElementById("custom-mat-name")?.focus();
      return;
    }
    const priceNum = price === "" ? 0 : price;
    // Condición default "NUEVO": este formulario no tiene selector propio
    // (mismo criterio que el checklist de catálogo) — se ajusta luego desde
    // "Editar detalles" si corresponde, donde sí es un campo requerido.
    onAdd({ name: trimmedName, quantity: qtyNum, unit, estimatedUnitPrice: priceNum, condition: "NUEVO" });
    setName("");
    showToast(`${trimmedName} agregado al requerimiento.`, "success");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 md:grid-cols-4 gap-3.5 items-end bg-gradient-to-br from-emerald-50/30 to-white p-5 rounded-xl border border-emerald-100/60"
    >
      <div className="md:col-span-2">
        <TextField
          id="custom-mat-name"
          label="Nombre del Material / Servicio"
          placeholder="Ej. Mano de obra soldadura de vigas"
          value={name}
          onChange={(v) => { setName(v); setError(""); }}
          error={error}
          accent="success"
          required
        />
      </div>
      <TextField
        id="custom-mat-unit"
        label="Unidad"
        placeholder="Ej. Unidad, m³, Kg, Rollo"
        value={unit}
        onChange={setUnit}
        accent="success"
      />
      <div>
        <label htmlFor="custom-mat-price" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Costo Estimado ($)
        </label>
        <NumericInput
          id="custom-mat-price"
          value={price}
          onChange={setPrice}
          placeholder="0.00"
          step="0.01"
          accent="success"
          className="rounded-lg"
        />
        {ratesLoading && !hasRates && typeof price === "number" && price > 0 && (
          <div className="mt-1.5 h-3 w-24 rounded skeleton-shimmer" />
        )}
        {hasRates && typeof price === "number" && price > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mt-1.5 text-[10px] font-mono font-semibold text-slate-500"
          >
            ≈ Bs. {formatBs(convert(price, "USD"))}
          </motion.p>
        )}
      </div>

      <div>
        <label htmlFor="mat-qty" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Cantidad
        </label>
        <NumericInput
          id="mat-qty"
          value={qty}
          onChange={setQty}
          placeholder="0"
          step="1"
          accent="success"
          className="rounded-lg"
        />
      </div>

      <div className="md:col-span-1">
        <Button
          id="btn-add-material"
          type="submit"
          variant="primary"
          colorScheme="emerald"
          icon={<Plus className="h-4 w-4" />}
          className="w-full justify-center"
        >
          Agregar
        </Button>
      </div>
    </form>
  );
}
