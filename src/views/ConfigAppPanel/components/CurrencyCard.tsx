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
import { Coins, Star, CheckCircle, XCircle, Pencil, Trash2, Plus, X, Check } from "lucide-react";
import { itemVariants, bannerVariants } from "../../../animations";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import Button from "../../../components/UI/Button";
import { SkeletonCatalogRow, SkeletonGroup, SkeletonGroupItem } from "../../../components/SkeletonLoader";
import IconActionButton from "../../../components/UI/IconActionButton";
import { RequiredMark } from "../../../components/UI/HintSignals";
import { useToast } from "../../../components/UI/Toast";
import { getErrorMessage } from "../../../services/logger";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";
import type { CurrencyRecord } from "../../../hooks/useCurrencies";

interface CurrencyCardProps {
  currencies: CurrencyRecord[];
  isLoading: boolean;
  onAdd: (input: { code: string; name: string; symbol: string }) => Promise<void>;
  onUpdate: (id: number, input: Partial<Pick<CurrencyRecord, "name" | "symbol" | "is_active">>) => Promise<void>;
  onSetBase: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function CurrencyCard({ currencies, isLoading, onAdd, onUpdate, onSetBase, onDelete }: CurrencyCardProps) {
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const saveEdit = async (id: number) => {
    if (!editName.trim() || !editSymbol.trim()) {
      showToast("Nombre y símbolo no pueden quedar vacíos.", "error");
      return;
    }
    await run(id, () => onUpdate(id, { name: editName.trim(), symbol: editSymbol.trim() }));
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!code.trim() || !name.trim() || !symbol.trim()) {
      showToast("Completa código, nombre y símbolo.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await onAdd({ code: code.trim(), name: name.trim(), symbol: symbol.trim() });
      setCode("");
      setName("");
      setSymbol("");
      setFormOpen(false);
      showToast("Moneda agregada.", "success");
    } catch (err) {
      showToast(getErrorMessage(err, "No se pudo agregar la moneda."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <Card>
        <SectionHeader
          icon={<Coins className="h-5 w-5" />}
          title="Moneda"
          description="Moneda base para montos registrados en la app y monedas aceptadas como tasas referenciales de proveedores."
          color="amber"
          actions={
            !formOpen && (
              <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setFormOpen(true)}>
                Agregar moneda
              </Button>
            )
          }
        />

        <AnimatePresence initial={false}>
          {formOpen && (
            <motion.div
              variants={bannerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="overflow-hidden"
            >
              <div className="mb-4 flex flex-wrap items-end gap-2 rounded-control border border-border-subtle bg-surface-sunken/50 p-3">
                <div>
                  <label className="block text-[10px] font-bold text-text-tertiary uppercase mb-1">
                    Código (ISO 4217) <RequiredMark filled={code.trim().length > 0} />
                  </label>
                  <input
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase().slice(0, 3))}
                    maxLength={3}
                    placeholder="EUR"
                    className="w-20 rounded-control border border-border-default px-2.5 py-1.5 text-xs font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-warning-400/40 transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-tertiary uppercase mb-1">
                    Nombre <RequiredMark filled={name.trim().length > 0} />
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Euro"
                    className="w-40 rounded-control border border-border-default px-2.5 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-warning-400/40 transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-tertiary uppercase mb-1">
                    Símbolo <RequiredMark filled={symbol.trim().length > 0} />
                  </label>
                  <input
                    value={symbol}
                    onChange={e => setSymbol(e.target.value)}
                    placeholder="€"
                    className="w-16 rounded-control border border-border-default px-2.5 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-warning-400/40 transition-shadow"
                  />
                </div>
                <Button size="sm" variant="primary" colorScheme="amber" isLoading={submitting} onClick={handleAdd}>
                  Guardar
                </Button>
                <Button size="sm" variant="secondary" disabled={submitting} onClick={() => setFormOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <SkeletonGroup className="space-y-2">
            <SkeletonGroupItem><SkeletonCatalogRow /></SkeletonGroupItem>
            <SkeletonGroupItem><SkeletonCatalogRow /></SkeletonGroupItem>
            <SkeletonGroupItem><SkeletonCatalogRow /></SkeletonGroupItem>
          </SkeletonGroup>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {currencies.map(currency => (
                <motion.div
                  key={currency.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, x: -12, scale: 0.98, transition: { duration: 0.15 } }}
                  whileHover={{ scale: 1.01 }}
                  className={`flex items-center justify-between gap-3 rounded-control border p-3 transition-colors ${
                    currency.is_base ? `${SEMANTIC_COLOR_MAP.warning.border100} ${SEMANTIC_COLOR_MAP.warning.bg50}/50` : "border-border-subtle"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`rounded-control border ${SEMANTIC_COLOR_MAP.brand.border100} ${SEMANTIC_COLOR_MAP.brand.bg50}/80 px-2 py-0.5 font-mono text-[10px] font-bold ${SEMANTIC_COLOR_MAP.brand.text600}`}>
                      {currency.code}
                    </span>
                    {editingId === currency.id ? (
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
                    {currency.is_base && (
                      <span className={`inline-flex items-center gap-1 rounded-pill border ${SEMANTIC_COLOR_MAP.warning.border100} ${SEMANTIC_COLOR_MAP.warning.bg50} px-2.5 py-0.5 text-[10px] font-bold ${SEMANTIC_COLOR_MAP.warning.text700}`}>
                        <Star className="h-3 w-3" />
                        Base
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
                    {editingId === currency.id ? (
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
                    )}
                    {editingId !== currency.id && !currency.is_base && currency.is_active && (
                      <IconActionButton
                        label={`Fijar ${currency.code} como base`}
                        tooltip="Fijar como base"
                        onClick={() => run(currency.id, () => onSetBase(currency.id))}
                        isBusy={busyId === currency.id}
                        tone="amber"
                        icon={<Star className="h-3.5 w-3.5" />}
                      />
                    )}
                    {editingId !== currency.id && !currency.is_base && (
                      <IconActionButton
                        label={currency.is_active ? `Desactivar ${currency.code}` : `Activar ${currency.code}`}
                        tooltip={currency.is_active ? "Desactivar moneda" : "Activar moneda"}
                        onClick={() => run(currency.id, () => onUpdate(currency.id, { is_active: !currency.is_active }))}
                        isBusy={busyId === currency.id}
                        tone={currency.is_active ? "amber" : "emerald"}
                        icon={currency.is_active ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      />
                    )}
                    {editingId !== currency.id && !currency.is_base && (
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
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
