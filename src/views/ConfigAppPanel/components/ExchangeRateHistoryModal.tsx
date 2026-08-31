/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal para ver el histórico de tasas de una moneda específica.
 * Abierto desde el botón de acción en CurrencyRow para monedas oficiales.
 * Reutiliza el componente Modal genérico mejorado.
 */

import { RefreshCw, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import Modal from "../../../components/UI/Modal";
import Button from "../../../components/UI/Button";
import { Table, type Column } from "../../../components/UI/Table";
import EmptyState from "../../../components/UI/EmptyState";
import { useToast } from "../../../components/UI/Toast";
import { getErrorMessage } from "../../../services/logger";
import type { ExchangeRateRecord } from "../../../hooks/useExchangeRates";

interface ExchangeRateHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencyCode: string;
  currencyName: string;
  rates: ExchangeRateRecord[];
  isLoading: boolean;
  isSyncing: boolean;
  onSyncNow: () => Promise<void>;
}

const SOURCE_BADGE_CLASSES: Record<string, string> = {
  DOLARVZLA_API: "bg-sky-100/60 text-sky-700 font-semibold",
  BCV_SCRAPING: "bg-emerald-100/60 text-emerald-700 font-semibold",
};

export default function ExchangeRateHistoryModal({
  isOpen,
  onClose,
  currencyCode,
  currencyName,
  rates,
  isLoading,
  isSyncing,
  onSyncNow,
}: ExchangeRateHistoryModalProps) {
  const { showToast } = useToast();

  const filteredRates = useMemo(
    () =>
      rates
        .filter(r => r.currency_code === currencyCode)
        .sort((a, b) => new Date(b.effective_at).getTime() - new Date(a.effective_at).getTime()),
    [rates, currencyCode],
  );

  const handleSync = async () => {
    try {
      await onSyncNow();
      showToast("Tasas sincronizadas exitosamente", "success");
    } catch (err) {
      showToast(getErrorMessage(err, "No se pudo sincronizar las tasas."), "error");
    }
  };

  const columns: Column<ExchangeRateRecord>[] = [
    {
      key: "effective_at",
      label: "Fecha",
      width: "30%",
      render: (row) =>
        new Date(row.effective_at).toLocaleDateString("es-VE", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
    },
    {
      key: "rate_to_usd",
      label: `Tasa a USD`,
      align: "right",
      width: "30%",
      className: "font-semibold text-sky-600",
      render: (row) => row.rate_to_usd.toFixed(4),
    },
    {
      key: "source",
      label: "Fuente",
      align: "center",
      width: "40%",
      render: (row) => (
        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold ${SOURCE_BADGE_CLASSES[row.source] || "bg-gray-100 text-gray-700"}`}>
          {row.source === "DOLARVZLA_API" ? "DolarVZLA API" : row.source === "BCV_SCRAPING" ? "BCV Scraping" : row.source}
        </span>
      ),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Histórico de Tasas"
      infoLine={`${currencyCode} – ${currencyName}`}
      icon={<TrendingUp className="h-5 w-5" />}
      iconColor="sky"
      maxWidth="max-w-lg"
    >
      <div className="space-y-6">
        {/* Botón de sincronización */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="primary"
            colorScheme="sky"
            isLoading={isSyncing}
            icon={<RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />}
            onClick={handleSync}
          >
            {isSyncing ? "Sincronizando..." : "Sincronizar Ahora"}
          </Button>
          <span className="text-xs text-text-muted self-center">{filteredRates.length} registros</span>
        </div>

        {/* Tabla o estado vacío */}
        {filteredRates.length === 0 ? (
          <EmptyState
            icon={<TrendingUp className="h-12 w-12" />}
            title="Sin histórico de tasas"
            description="No hay registros todavía. Ejecuta una sincronización manual para obtener las tasas."
          />
        ) : (
          <Table<ExchangeRateRecord>
            columns={columns}
            data={filteredRates}
            rowKey={(r) => r.id}
            isLoading={isLoading}
            emptyMessage="No hay tasas registradas para esta moneda."
            pageSize={15}
            maxHeight="20rem"
          />
        )}

        {/* Info contextual */}
        {filteredRates.length > 0 && (
          <div className="border-t border-border-subtle pt-4 text-xs text-text-secondary leading-relaxed">
            <p>
              Las tasas se sincronizan automáticamente de <strong>lunes a viernes a las 10:00 AM VE</strong>. Si la API de DolarVZLA falla, se utiliza
              scraping de BCV como respaldo.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
