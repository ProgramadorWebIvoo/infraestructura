/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de evaluación (rating) de un proveedor — extraído de ProveedoresRegistrados.
 */

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useToast } from "../../components/UI/Toast";
import Modal from "../../components/UI/Modal";
import type { Contractor } from "../../types";

interface RatingModalProps {
  contractor: Contractor | null;
  onClose: () => void;
  onSave: (code: string, rating: number) => Promise<void>;
}

export default function RatingModal({ contractor, onClose, onSave }: RatingModalProps) {
  const { showToast } = useToast();
  const [editRating, setEditRating] = useState<number | "">(0);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (contractor) {
      setEditRating(contractor.rating);
      setHoveredStar(null);
    }
  }, [contractor]);

  const handleSave = async () => {
    if (!contractor) return;
    setIsSaving(true);
    try {
      await onSave(contractor.code, editRating === "" ? 0 : editRating);
      onClose();
    } catch {
      showToast("No se pudo guardar la evaluación.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const displayStars = hoveredStar ?? Math.round(editRating === "" ? 0 : editRating);

  return (
    <Modal
      isOpen={contractor !== null}
      onClose={onClose}
      title={contractor?.name}
      badge="Evaluacion de proveedor"
      infoLine={contractor?.code}
      icon={<Star className="h-5 w-5" />}
      iconColor="amber"
      maxWidth="max-w-lg"
      closeDisabled={isSaving}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={isSaving} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:shadow-md disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2 text-xs font-black text-white shadow-md shadow-amber-500/20 transition-all duration-200 hover:from-amber-700 hover:to-amber-600 hover:shadow-lg hover:shadow-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Star className="h-3.5 w-3.5" />
            {isSaving ? "Guardando..." : "Guardar evaluacion"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Calificacion</span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setEditRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(null)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= displayStars ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Valor exacto (0.0 – 5.0)
        </label>
        <input
          type="number"
          min={0}
          max={5}
          step={0.1}
          value={editRating}
          onChange={(e) => {
            const v = e.target.value.replace(/[eE]/g, '');
            if (v === "") { setEditRating(""); return; }
            const val = Math.min(5, Math.max(0, parseFloat(v) || 0));
            setEditRating(Math.round(val * 10) / 10);
          }}
          onKeyDown={(e) => { if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === 'Subtract') e.preventDefault(); }}
          onPaste={(e) => { e.preventDefault(); const v = e.clipboardData.getData('text/plain').replace(/[eE]/g, ''); if (v === "") { setEditRating(""); return; } const val = Math.min(5, Math.max(0, parseFloat(v) || 0)); setEditRating(Math.round(val * 10) / 10); }}
          placeholder="0"
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-center font-mono text-lg font-black text-amber-500 outline-hidden focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
        />
      </div>
    </Modal>
  );
}
