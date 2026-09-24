/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Portal público de CIERRE — el contratista abre el enlace personal enviado por
 * correo al liberarse el anticipo y reporta las partidas ejecutadas + fotos de
 * evidencia. El enlace no caduca y es reutilizable mientras el informe no esté
 * en revisión (backend: PublicClosureReportController).
 */

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ImagePlus, Loader2, Lock, Send } from "lucide-react";
import { useToast } from "@/components/UI/Toast";
import Button from "@/components/UI/Button";
import NumericInput from "@/components/UI/NumericInput";
import { apiFetch } from "@/services/api";
import ClosurePhotoGrid from "@/components/ClosureReport/ClosurePhotoGrid";
import {
  CLOSURE_PHOTO_MAX_BYTES,
  CLOSURE_PHOTO_MIMES,
  isDecrease,
  validateClosureItem,
  type ClosureReportItem,
  type PublicClosureResponse,
} from "@/components/ClosureReport/types";

export default function CierrePublico() {
  const { token } = useParams<{ token: string }>();
  const { showToast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

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
        prev.length === 0
          ? data.data.items
          : data.data.items.map((fresh) => prev.find((p) => p.id === fresh.id) ?? fresh),
      );
      setNotes((prev) => prev || data.data.contractorNotes || "");
    } catch {
      setLoadError("Enlace no válido o no se pudo conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const editable = Boolean(info?.editable) && !submitted;
  const photos = info?.data.photos ?? [];
  const itemErrors = items.map(validateClosureItem);
  const canSubmit = editable && photos.length > 0 && itemErrors.every((e) => e === null);

  const updateItem = (id: number, patch: Partial<ClosureReportItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!CLOSURE_PHOTO_MIMES.includes(file.type)) {
      showToast("Solo se permiten imágenes JPG, PNG o WEBP.", "error");
      return;
    }
    if (file.size > CLOSURE_PHOTO_MAX_BYTES) {
      showToast("La imagen debe pesar máximo 5 MB.", "error");
      return;
    }

    const form = new FormData();
    form.append("image", file);
    setIsUploading(true);
    try {
      await apiFetch(`/public/closures/${token}/photos`, { method: "POST", body: form });
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo subir la foto.", "error");
    } finally {
      setIsUploading(false);
    }
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
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (loadError || !info) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center text-slate-300">
        <AlertTriangle className="h-8 w-8 text-slate-500" />
        <h2 className="text-xl font-black">{loadError || "Enlace no disponible"}</h2>
        <p className="text-sm text-slate-500">Verifique el enlace recibido o contacte a IVOO.</p>
      </div>
    );
  }

  const report = info.data;

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white antialiased">
      <header className="border-b border-white/10 bg-slate-950/80 px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-base font-black tracking-tight">IVOO — Informe de Cierre de Obra</h1>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Portal público del contratista</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Obra {info.project.id}</p>
          <h2 className="mt-1 text-lg font-black">{info.project.title}</h2>
          <p className="text-sm text-slate-400">{info.project.location}</p>
        </section>

        {report.rejectionReason && editable && (
          <section role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            <p className="font-bold">Su informe fue devuelto para corrección</p>
            <p className="mt-1">{report.rejectionReason}</p>
          </section>
        )}

        {submitted ? (
          <section className="space-y-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <h3 className="text-xl font-black text-emerald-300">Informe enviado</h3>
            <p className="text-sm text-emerald-200/80">
              Infraestructura corroborará la ejecución. Si requiere ajustes, recibirá un correo con este mismo enlace.
            </p>
          </section>
        ) : (
          <>
            {!editable && (
              <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                <Lock className="h-4 w-4" /> El informe ya fue enviado y está en revisión; no puede modificarse.
              </p>
            )}

            <section className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Partida</th>
                    <th className="px-3 py-2 text-right">Contratado</th>
                    <th className="px-3 py-2">Ejecutado</th>
                    <th className="px-3 py-2">Justificación</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className="border-t border-white/5 align-top">
                      <td className="px-3 py-2 font-semibold">{item.name}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {item.contractedQuantity} {item.unit}
                      </td>
                      <td className="px-3 py-2">
                        <NumericInput
                          value={item.executedQuantity}
                          max={item.contractedQuantity}
                          onChange={(v) => updateItem(item.id, { executedQuantity: v === "" ? 0 : v })}
                          className={editable ? "" : "pointer-events-none opacity-60"}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.note ?? ""}
                          disabled={!editable}
                          maxLength={500}
                          placeholder={isDecrease(item) ? "Obligatoria: motivo de la disminución" : "Opcional"}
                          onChange={(e) => updateItem(item.id, { note: e.target.value })}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white"
                        />
                        {editable && itemErrors[index] && <p className="mt-1 text-[11px] text-amber-400">{itemErrors[index]}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="space-y-2">
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
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white"
              />
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Fotos de evidencia (mínimo 1)</h3>
                {editable && (
                  <>
                    <input ref={fileInput} type="file" accept={CLOSURE_PHOTO_MIMES.join(",")} className="hidden" onChange={handleUpload} />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      isLoading={isUploading}
                      icon={<ImagePlus className="h-3.5 w-3.5" />}
                      onClick={() => fileInput.current?.click()}
                    >
                      Agregar foto
                    </Button>
                  </>
                )}
              </div>
              <ClosurePhotoGrid photos={photos} canDelete={() => editable} onDelete={(p) => void handleDelete(p.id)} />
            </section>

            {editable && (
              <div className="flex justify-end">
                <Button type="button" isLoading={isSubmitting} disabled={!canSubmit} icon={<Send className="h-4 w-4" />} onClick={() => void handleSubmit()}>
                  Enviar informe
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
