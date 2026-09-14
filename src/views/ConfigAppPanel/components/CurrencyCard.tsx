/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección "Moneda" de CONFIG APP: moneda base + catálogo de monedas
 * aceptadas. A diferencia de las demás secciones, cada acción se persiste
 * de inmediato contra la API (es un CRUD de catálogo, no un AppSetting con
 * draft/dirty) — no participa de la barra "Guardar todo".
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Coins, CheckCircle, XCircle, Pencil, Trash2, X, Check, Landmark } from "lucide-react";
import { itemVariants } from "@/animations";
import Card from "@/components/UI/Card";
import SectionHeader from "@/components/UI/SectionHeader";
import { SkeletonCatalogRow, SkeletonGroup, SkeletonGroupItem } from "@/components/SkeletonLoader";
import IconActionButton from "@/components/UI/IconActionButton";
import { useToast } from "@/components/UI/Toast";
import { getErrorMessage } from "@/services/logger";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import type { CurrencyRecord } from "@/hooks/useCurrencies";
import { currencyEditSchema } from "@/schemas/currency.schema";

interface CurrencyCardProps {
  currencies: CurrencyRecord[];
  isLoading: boolean;
  onUpdate: (id: number, input: Partial<Pick<CurrencyRecord, "name" | "symbol" | "is_active">>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function CurrencyCard({ currencies, isLoading, onUpdate, onDelete }: CurrencyCardProps) {
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSymbol, setEditSymbol] = useState("");

  const run = async (id: number, action: () => Promise<void>) => {
    setBusyId(id);
    try {
      await action();
    } catch (err) {
      showToast(getErrorMessage(err, "No se pudo completar la acción."), "error");
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (currency: CurrencyRecord) => {
    setEditingId(currency.id);
    setEditName(currency.name);
    setEditSymbol(currency.symbol);
  };

  const cancelEdit = () => setEditingId(null);

  const officialCurrencies = currencies.filter(c => c.is_official);
  const customCurrencies = currencies.filter(c => !c.is_official);

  const saveEdit = async (id: number) => {
    const result = currencyEditSchema.safeParse({ name: editName, symbol: editSymbol });
    if (!result.success) {
      showToast(result.error.issues[0].message, "error");
      return;
    }
    await run(id, () => onUpdate(id, { name: editName.trim(), symbol: editSymbol.trim() }));
    setEditingId(null);
  };

  return (
    <motion.div variants={itemVariants}>
      <Card>
        <SectionHeader
          icon={<Coins className="h-5 w-5" />}
          title="Moneda"
          description="Moneda base para montos registrados en la app y monedas aceptadas como tasas referenciales de proveedores."
          color="amber"
        />

        {isLoading ? (
          <SkeletonGroup className="space-y-2">
            <SkeletonGroupItem><SkeletonCatalogRow /></SkeletonGroupItem>
            <SkeletonGroupItem><SkeletonCatalogRow /></SkeletonGroupItem>
            <SkeletonGroupItem><SkeletonCatalogRow /></SkeletonGroupItem>
          </SkeletonGroup>
        ) : (
          <div className="space-y-5">
            {officialCurrencies.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-text-muted">
                  <Landmark className="h-3.5 w-3.5" /> Monedas oficiales BCV
                </h4>
                <p className="text-[10px] text-text-muted">
                  Catálogo fijo del Banco Central de Venezuela — el nombre y símbolo no se pueden modificar ni eliminar. Solo se pueden activar o desactivar.
                </p>
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {officialCurrencies.map(currency => (
                      <CurrencyRow
                        key={currency.id}
                        currency={currency}
                        busyId={busyId}
                        editingId={editingId}
                        editName={editName}
                        editSymbol={editSymbol}
                        setEditName={setEditName}
                        setEditSymbol={setEditSymbol}
                        startEdit={startEdit}
                        cancelEdit={cancelEdit}
                        saveEdit={saveEdit}
                        run={run}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted">Monedas personalizadas</h4>
              {customCurrencies.length === 0 ? (
                <p className="text-[10px] italic text-text-muted">Sin monedas personalizadas agregadas todavía.</p>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {customCurrencies.map(currency => (
                      <CurrencyRow
                        key={currency.id}
                        currency={currency}
                        busyId={busyId}
                        editingId={editingId}
                        editName={editName}
                        editSymbol={editSymbol}
                        setEditName={setEditName}
                        setEditSymbol={setEditSymbol}
                        startEdit={startEdit}
                        cancelEdit={cancelEdit}
                        saveEdit={saveEdit}
                        run={run}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

interface CurrencyRowProps {
  currency: CurrencyRecord;
  busyId: number | null;
  editingId: number | null;
  editName: string;
  editSymbol: string;
  setEditName: (v: string) => void;
  setEditSymbol: (v: string) => void;
  startEdit: (currency: CurrencyRecord) => void;
  cancelEdit: () => void;
  saveEdit: (id: number) => void;
  run: (id: number, action: () => Promise<void>) => void;
  onUpdate: (id: number, input: Partial<Pick<CurrencyRecord, "name" | "symbol" | "is_active">>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

/** Fila de moneda — comportamiento idéntico para oficiales/custom salvo qué botones se muestran (una oficial nunca expone editar/eliminar). */
function CurrencyRow({
  currency,
  busyId,
  editingId,
  editName,
  editSymbol,
  setEditName,
  setEditSymbol,
  startEdit,
  cancelEdit,
  saveEdit,
  run,
  onUpdate,
  onDelete,
}: CurrencyRowProps) {
  const isEditing = editingId === currency.id;

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, x: -12, scale: 0.98, transition: { duration: 0.15 } }}
      whileHover={{ scale: 1.01 }}
      className="flex items-center justify-between gap-3 rounded-control border border-border-subtle p-3 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className={`rounded-control border ${SEMANTIC_COLOR_MAP.brand.border100} ${SEMANTIC_COLOR_MAP.brand.bg50}/80 px-2 py-0.5 font-mono text-[10px] font-bold ${SEMANTIC_COLOR_MAP.brand.text600}`}>
          {currency.code}
        </span>
        {isEditing ? (
          <>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-36 rounded-control border border-border-default px-2 py-1 text-xs font-bold text-text-primary focus:outline-hidden focus:ring-2 focus:ring-info-400/40"
            />
            <input
              value={editSymbol}
              onChange={e => setEditSymbol(e.target.value)}
              className="w-14 rounded-control border border-border-default px-2 py-1 text-xs font-mono font-semibold text-text-tertiary focus:outline-hidden focus:ring-2 focus:ring-info-400/40"
            />
          </>
        ) : (
          <>
            <span className="font-bold text-xs text-text-primary">{currency.name}</span>
            <span className="font-mono text-xs font-semibold text-text-tertiary">{currency.symbol}</span>
          </>
        )}
        {currency.is_official && (
          <span className={`inline-flex items-center gap-1 rounded-pill border ${SEMANTIC_COLOR_MAP.info.border100} ${SEMANTIC_COLOR_MAP.info.bg50} px-2.5 py-0.5 text-[10px] font-bold ${SEMANTIC_COLOR_MAP.info.text700}`}>
            <Landmark className="h-3 w-3" />
            BCV
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-[10px] font-bold ${
            currency.is_active
              ? `${SEMANTIC_COLOR_MAP.success.border100} ${SEMANTIC_COLOR_MAP.success.bg50} ${SEMANTIC_COLOR_MAP.success.text700}`
              : "border-border-default bg-surface-raised text-text-tertiary"
          }`}
        >
          {currency.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {currency.is_active ? "Activa" : "Inactiva"}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {/* Moneda oficial BCV: nunca editable/eliminable — solo activar/desactivar (salvo si es la base, ver abajo). */}
        {!currency.is_official && (
          isEditing ? (
            <>
              <IconActionButton
                label={`Guardar ${currency.code}`}
                tooltip="Guardar cambios"
                onClick={() => saveEdit(currency.id)}
                isBusy={busyId === currency.id}
                tone="emerald"
                icon={<Check className="h-3.5 w-3.5" />}
              />
              <IconActionButton
                label="Cancelar edición"
                tooltip="Cancelar"
                onClick={cancelEdit}
                disabled={busyId === currency.id}
                tone="slate"
                icon={<X className="h-3.5 w-3.5" />}
              />
            </>
          ) : (
            <IconActionButton
              label={`Editar ${currency.code}`}
              tooltip="Editar moneda"
              onClick={() => startEdit(currency)}
              tone="indigo"
              icon={<Pencil className="h-3.5 w-3.5" />}
            />
          )
        )}
        {!isEditing && (
          <IconActionButton
            label={currency.is_active ? `Desactivar ${currency.code}` : `Activar ${currency.code}`}
            tooltip={currency.is_active ? "Desactivar moneda" : "Activar moneda"}
            onClick={() => run(currency.id, () => onUpdate(currency.id, { is_active: !currency.is_active }))}
            isBusy={busyId === currency.id}
            tone={currency.is_active ? "amber" : "emerald"}
            icon={currency.is_active ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          />
        )}
        {!currency.is_official && !isEditing && (
          <IconActionButton
            label={`Eliminar ${currency.code}`}
            tooltip="Eliminar moneda"
            onClick={() => run(currency.id, () => onDelete(currency.id))}
            isBusy={busyId === currency.id}
            tone="rose"
            icon={<Trash2 className="h-3.5 w-3.5" />}
          />
        )}
      </div>
    </motion.div>
  );
}
