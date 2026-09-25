/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Portal público de CIERRE — el contratista abre el enlace personal enviado por
 * correo al liberarse el anticipo y reporta las partidas ejecutadas + fotos de
 * evidencia. El enlace no caduca y es reutilizable mientras el informe no esté
 * en revisión (backend: PublicClosureReportController).
 */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Loader2, Lock, MapPin, Send } from "lucide-react";
import { useToast } from "@/components/UI/Toast";
import Button from "@/components/UI/Button";
import { containerVariants, itemVariants, springs } from "@/animations";
import { apiFetch } from "@/services/api";
import { BackgroundDecor, TopBar } from "./components/PublicChrome";
import ClosureStepper from "./components/ClosureStepper";
import ClosureItemCards from "./components/ClosureItemCards";
import PhotoDropzone from "./components/PhotoDropzone";
import {
  CLOSURE_PHOTO_MAX_BYTES,
  CLOSURE_PHOTO_MIMES,
  isClosureEditable,
  validateClosureItem,
  type ClosureReportItem,
  type PublicClosureResponse,
} from "@/components/ClosureReport/types";

export default function CierrePublico() {
  const { token } = useParams<{ token: string }>();
  const { showToast } = useToast();

  const [info, setInfo] = useState<PublicClosureResponse | null>(null);
  const [items, setItems] = useState<ClosureReportItem[]>([]);
  const [notes, setNotes] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<PublicClosureResponse>(`/public/closures/${token}`);
      setInfo(data);
      setItems((prev) =>
        prev.length === 0 ? data.items : data.items.map((fresh) => prev.find((p) => p.id === fresh.id) ?? fresh),
      );
      setNotes((prev) => prev || data.contractorNotes || "");
    } catch {
      setLoadError("Enlace no válido o no se pudo conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const editable = info !== null && isClosureEditable(info) && !submitted;
  const photos = info?.photos ?? [];
  const itemErrors = items.map(validateClosureItem);
  const canSubmit = editable && photos.length > 0 && itemErrors.every((e) => e === null);

  const updateItem = (id: number, patch: Partial<ClosureReportItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const uploadOne = async (file: File): Promise<boolean> => {
    if (!CLOSURE_PHOTO_MIMES.includes(file.type)) {
      showToast(`«${file.name}»: solo se permiten imágenes JPG, PNG o WEBP.`, "error");
      return false;
    }
    if (file.size > CLOSURE_PHOTO_MAX_BYTES) {
      showToast(`«${file.name}»: la imagen debe pesar máximo 5 MB.`, "error");
      return false;
    }

    const form = new FormData();
    form.append("image", file);
    try {
      await apiFetch(`/public/closures/${token}/photos`, { method: "POST", body: form });
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo subir la foto.", "error");
      return false;
    }
  };

  const handleFiles = async (files: File[]) => {
    setIsUploading(true);
    let uploaded = false;
    for (const file of files) {
      uploaded = (await uploadOne(file)) || uploaded;
    }
    if (uploaded) await load();
    setIsUploading(false);
  };

  const handleDelete = async (photoId: number) => {
    try {
      await apiFetch(`/public/closures/${token}/photos/${photoId}`, { method: "DELETE" });
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo eliminar la foto.", "error");
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/public/closures/${token}/submit`, {
        method: "POST",
        body: JSON.stringify({
          notes: notes.trim() || null,
          items: items.map((i) => ({ id: i.id, executedQuantity: i.executedQuantity, note: i.note?.trim() || null })),
        }),
      });
      setSubmitted(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo enviar el informe.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
        <BackgroundDecor />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 flex flex-col items-center gap-3 text-slate-400"
        >
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-widest">Cargando informe…</span>
        </motion.div>
      </div>
    );
  }

  if (loadError || !info) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6 text-white">
        <BackgroundDecor />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 space-y-3 text-center"
        >
          <motion.span
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...springs.snappy, delay: 0.1 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-500"
          >
            <AlertTriangle className="h-7 w-7" />
          </motion.span>
          <h2 className="text-xl font-black text-slate-300">{loadError || "Enlace no disponible"}</h2>
          <p className="text-sm text-slate-500">Verifique el enlace recibido o contacte a IVOO.</p>
        </motion.div>
      </div>
    );
  }

  const report = info;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans text-white antialiased">
      <BackgroundDecor />

      <div className="relative z-10">
        <TopBar />

        <motion.main variants={containerVariants} initial="hidden" animate="visible" className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          <motion.section variants={itemVariants} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Obra {report.projectId}
              {report.revision > 1 && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-slate-300">Revisión {report.revision}</span>}
            </p>
            {info.project && (
              <>
                <h2 className="mt-1 text-lg font-black text-white">{info.project.title}</h2>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {info.project.location}
                </p>
              </>
            )}
          </motion.section>

          {report.rejectionReason && editable && (
            <motion.section
              variants={itemVariants}
              role="alert"
              className="flex gap-3 rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/15 to-rose-500/5 p-4 text-sm text-rose-100"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
              <div>
                <p className="font-black text-rose-200">Su informe fue devuelto para corrección</p>
                <p className="mt-1 text-rose-100/90">{report.rejectionReason}</p>
              </div>
            </motion.section>
          )}

          {submitted ? (
            <motion.section
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-8 text-center"
            >
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...springs.snappy, delay: 0.15 }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-400"
              >
                <CheckCircle2 className="h-9 w-9" strokeWidth={2.25} />
              </motion.span>
              <motion.h3 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }} className="text-xl font-black text-emerald-300">
                Informe enviado
              </motion.h3>
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38, duration: 0.3 }} className="text-sm text-emerald-200/80">
                Infraestructura corroborará la ejecución. Si requiere ajustes, recibirá un correo con este mismo enlace.
              </motion.p>
            </motion.section>
          ) : (
            <>
              {editable ? (
                <motion.div variants={itemVariants}>
                  <ClosureStepper itemsValid={itemErrors.every((e) => e === null)} hasPhotos={photos.length > 0} readyToSend={canSubmit} />
                </motion.div>
              ) : (
                <motion.p variants={itemVariants} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                  <Lock className="h-4 w-4 shrink-0" /> El informe ya fue enviado y está en revisión; no puede modificarse.
                </motion.p>
              )}

              <motion.section variants={itemVariants} aria-labelledby="closure-items-title" className="space-y-3">
                <h3 id="closure-items-title" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Partidas ejecutadas
                </h3>
                <ClosureItemCards items={items} errors={itemErrors} editable={editable} onChange={updateItem} />
              </motion.section>

              <motion.section variants={itemVariants} className="space-y-2">
                <label htmlFor="closure-notes" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Observaciones generales
                </label>
                <textarea
                  id="closure-notes"
                  value={notes}
                  disabled={!editable}
                  maxLength={2000}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200 outline-hidden transition focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/60 disabled:opacity-60"
                />
              </motion.section>

              <motion.section variants={itemVariants} aria-labelledby="closure-photos-title" className="space-y-3">
                <h3 id="closure-photos-title" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Fotos de evidencia (mínimo 1)
                </h3>
                <PhotoDropzone photos={photos} editable={editable} isUploading={isUploading} onFiles={(files) => void handleFiles(files)} onDelete={(p) => void handleDelete(p.id)} />
              </motion.section>

              {editable && (
                <motion.div variants={itemVariants} className="flex justify-end border-t border-white/10 pt-4">
                  <Button
                    type="button"
                    variant="primary"
                    colorScheme="emerald"
                    className="w-full sm:w-auto"
                    isLoading={isSubmitting}
                    disabled={!canSubmit}
                    icon={<Send className="h-4 w-4" />}
                    onClick={() => void handleSubmit()}
                  >
                    Enviar informe
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </motion.main>

        <footer className="mt-10 border-t border-white/10 px-4 py-6 text-center text-xs font-medium text-slate-600">
          IVOO Gestión de Infraestructura &copy; {new Date().getFullYear()} — Portal de Cierre de Obra
        </footer>
      </div>
    </div>
  );
}
