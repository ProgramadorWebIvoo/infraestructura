/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal para editar/cargar una tasa de cambio manualmente.
 * Disponible solo para SUPERADMIN.
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import TextField from "@/components/UI/TextField";
import NumericInput from "@/components/UI/NumericInput";
import { useToast } from "@/components/UI/Toast";
import { apiFetch } from "@/services/api";
import { getErrorMessage } from "@/services/logger";
import type { CurrencyRecord } from "@/hooks/useCurrencies";

interface ExchangeRateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencies: CurrencyRecord[];
  authToken: string;
  onRateAdded?: () => void;
}

export default function ExchangeRateEditModal({
  isOpen,
  onClose,
  currencies,
  authToken,
  onRateAdded,
}: ExchangeRateEditModalProps) {
  const { showToast } = useToast();
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");
  const [rate, setRate] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCurrency || !rate || !source) {
      showToast("Por favor completa todos los campos", "warning");
      return;
    }

    setIsLoading(true);
    try {
      await apiFetch("/exchange-rates", {
        method: "POST",
        token: authToken,
        body: JSON.stringify({
          currency_code: selectedCurrency,
          rate_to_usd: parseFloat(rate),
          source,
        }),
      });

      showToast("Tasa de cambio guardada exitosamente", "success");
      onRateAdded?.();
      handleClose();
    } catch (err) {
      showToast(getErrorMessage(err, "Error al guardar la tasa"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedCurrency("");
    setRate("");
    setSource("");
    onClose();
  };

  const officialCurrencies = currencies.filter(c => ["USD", "EUR"].includes(c.code));

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cargar Tasa de Cambio"
      icon={<Plus className="h-5 w-5" />}
      iconColor="sky"
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Moneda
          </label>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="w-full px-3 py-2 border border-border-default rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Selecciona una moneda</option>
            {officialCurrencies.map((c) => (
              <option key={c.id} value={c.code}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Tasa a USD
          </label>
          <NumericInput
            id="rate"
            value={rate === "" ? "" : parseFloat(rate)}
            onChange={(val) => setRate(val === "" ? "" : String(val))}
            placeholder="Ej: 2500.50"
          />
        </div>

        <TextField
          id="source"
          label="Fuente"
          value={source}
          onChange={setSource}
          placeholder="Ej: BCV Oficial, DolarVZLA, etc."
        />

        <div className="flex gap-3 pt-4">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            colorScheme="sky"
            onClick={handleSubmit}
            isLoading={isLoading}
            className="flex-1"
          >
            Guardar Tasa
          </Button>
        </div>
      </div>
    </Modal>
  );
}
