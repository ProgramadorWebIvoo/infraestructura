/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de evaluación (rating) de un proveedor — extraído de
 * ProveedoresRegistrados. Rediseño premium: estrellas con feedback de
 * spring (hover/tap/selección), comparación explícita "antes → después"
 * del rating (para que quede claro qué está cambiando antes de confirmar),
 * y un stepper numérico integrado en vez del <input type=number> nativo.
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Minus, Plus, Star } from "lucide-react";
import { useToast } from "../../../components/UI/Toast";
import Modal from "../../../components/UI/Modal";
import Button from "../../../components/UI/Button";
import { springs } from "../../../animations";
import type { Contractor } from "../../../types";

interface RatingModalProps {
  contractor: Contractor | null;
  onClose: () => void;
  onSave: (code: string, rating: number) => Promise<void>;
}

const RATING_STEP = 0.1;

function clampRating(value: number): number {
  return Math.round(Math.min(5, Math.max(0, value)) * 10) / 10;
}

/** Etiqueta cualitativa del valor — refuerza el número con una lectura inmediata, sin obligar a interpretar la escala. */
function ratingLabel(value: number): string {
  if (value === 0) return "Sin evaluar";
  if (value < 2) return "Deficiente";
  if (value < 3) return "Regular";
  if (value < 4) return "Bueno";
  if (value < 4.5) return "Muy bueno";
  return "Excelente";
}

export default function RatingModal({ contractor, onClose, onSave }: RatingModalProps) {
  const { showToast } = useToast();
  const [editRating, setEditRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (contractor) {
      setEditRating(contractor.rating);
      setHoveredStar(null);
    }
  }, [contractor]);

  const originalRating = contractor?.rating ?? 0;
  const hasChanged = Math.abs(editRating - originalRating) >= 0.05;
  const delta = clampRating(editRating - originalRating);

  const handleSave = async () => {
    if (!contractor) return;
    setIsSaving(true);
    try {
      await onSave(contractor.code, editRating);
      onClose();
    } catch {
      showToast("No se pudo guardar la evaluación.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const displayValue = hoveredStar ?? editRating;
  const displayStars = Math.round(displayValue);

  // Cada estrella se llena de forma fraccional (0/0.5/1) — refleja valores
  // como 3.4 o 4.7 con precisión visual en vez de redondear al entero más
  // cercano, que perdía la mitad del rango decimal que sí se puede tipear.
  const starFills = useMemo(
    () => [1, 2, 3, 4, 5].map((star) => Math.max(0, Math.min(1, displayValue - (star - 1)))),
    [displayValue],
  );

  return (
    <Modal
      isOpen={contractor !== null}
      onClose={onClose}
      title={contractor?.name}
      badge="Evaluación de proveedor"
      infoLine={contractor?.code}
      icon={<Star className="h-5 w-5" />}
      iconColor="amber"
      maxWidth="max-w-lg"
      closeDisabled={isSaving}
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <AnimatePresence mode="wait">
            {hasChanged ? (
              <motion.div
                key="changed"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 text-[11px] font-bold"
              >
                <span className="font-mono text-slate-400">{originalRating.toFixed(1)}</span>
                <ArrowRight className="h-3 w-3 text-slate-300" />
                <span className={`font-mono ${delta > 0 ? "text-success-600" : "text-danger-600"}`}>{editRating.toFixed(1)}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${delta > 0 ? "bg-success-50 text-success-600" : "bg-danger-50 text-danger-600"}`}>
                  {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                </span>
              </motion.div>
            ) : (
              <motion.span
                key="unchanged"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[10px] font-medium text-slate-400"
              >
                Sin cambios respecto a la evaluación actual.
              </motion.span>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanged}
              variant="primary"
              colorScheme="amber"
              isLoading={isSaving}
              icon={<Star className="h-3.5 w-3.5" />}
            >
              {isSaving ? "Guardando..." : "Guardar evaluación"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Estrellas — cada una es un botón con spring en hover/tap, y un
            halo ámbar breve cuando queda seleccionada como el valor final. */}
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star, i) => (
              <motion.button
                key={star}
                type="button"
                onClick={() => setEditRating(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(null)}
                whileHover={{ scale: 1.15, y: -2 }}
                whileTap={{ scale: 0.9 }}
                transition={springs.snappy}
                aria-label={`Calificar con ${star} ${star === 1 ? "estrella" : "estrellas"}`}
                className="relative cursor-pointer rounded-lg p-1"
              >
                <span className="relative block h-9 w-9">
                  <Star className="absolute inset-0 h-9 w-9 fill-slate-100 text-slate-300" />
                  <span
                    className="absolute inset-0 overflow-hidden transition-[width] duration-150 ease-out"
                    style={{ width: `${starFills[i] * 100}%` }}
                  >
                    <Star className="h-9 w-9 fill-amber-400 text-amber-400" />
                  </span>
                </span>
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={ratingLabel(displayValue)}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="flex items-baseline gap-2"
            >
              <span className="font-mono text-2xl font-black text-amber-500">{displayValue.toFixed(1)}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{ratingLabel(displayValue)}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Ajuste fino — stepper en vez de <input type=number>: mismo rango
            (0.0–5.0 en pasos de 0.1) pero con controles pensados para touch/
            click en vez de las flechitas nativas del navegador, y feedback
            de tap en los botones +/-. */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ajuste fino</span>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-1.5">
            <motion.button
              type="button"
              onClick={() => setEditRating((v) => clampRating(v - RATING_STEP))}
              disabled={editRating <= 0}
              whileHover={editRating > 0 ? { scale: 1.08 } : undefined}
              whileTap={editRating > 0 ? { scale: 0.9 } : undefined}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-xs transition-colors hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-slate-500 cursor-pointer"
              aria-label="Restar 0.1"
            >
              <Minus className="h-4 w-4" strokeWidth={2.5} />
            </motion.button>
            <span className="w-16 text-center font-mono text-lg font-black text-slate-800 tabular-nums">
              {editRating.toFixed(1)}
            </span>
            <motion.button
              type="button"
              onClick={() => setEditRating((v) => clampRating(v + RATING_STEP))}
              disabled={editRating >= 5}
              whileHover={editRating < 5 ? { scale: 1.08 } : undefined}
              whileTap={editRating < 5 ? { scale: 0.9 } : undefined}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-xs transition-colors hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-slate-500 cursor-pointer"
              aria-label="Sumar 0.1"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
