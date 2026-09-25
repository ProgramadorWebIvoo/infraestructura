/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tab "Cierre F2" del DEBUG-MODE: crea y avanza obras de prueba del flujo de
 * cierre posterior a la ejecución usando /debug/closure-fixtures (backend con
 * APP_DEBUG=true; ADMIN/SUPERADMIN). Cada paso usa los servicios reales.
 */

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, FlaskConical, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/services/api";
import { useToast } from "@/components/UI/Toast";

interface Fixture {
  projectId: string;
  title: string;
  status: string;
  publicUrl: string | null;
}

export const CLOSURE_STEPS = [
  { status: "EN_EJECUCION", label: "En ejecución", viewer: "Contratista, por enlace público" },
  { status: "INFORME_ENVIADO", label: "Informe enviado", viewer: "Residente: Infraestructura > Ejecución y cierre" },
  { status: "VERIFICANDO_FINALIZACION", label: "Pendiente de Auditoría", viewer: "Auditoría" },
  { status: "PENDIENTE_SOLICITUD_FINIQUITO", label: "Pendiente de solicitud de finiquito", viewer: "Procura > Solicitud de finiquito" },
  { status: "LISTO_PAGO_FINAL", label: "Listo para pago final", viewer: "Finanzas" },
] as const;

export default function DebugClosurePanel() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setFixtures(await apiFetch<Fixture[]>("/debug/closure-fixtures"));
    } catch {
      showToast("No se pudo listar: el backend requiere APP_DEBUG=true y rol ADMIN/SUPERADMIN.", "error");
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (path: string, targetStatus: string, okMessage: string) => {
    setBusy(true);
    try {
      await apiFetch(path, { method: "POST", body: JSON.stringify({ targetStatus }) });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await load();
      showToast(okMessage, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Error ejecutando la acción de debug.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-text-tertiary">
        Solo funciona con APP_DEBUG=true en el backend. Los pasos usan los servicios reales, por lo que generan
        notificaciones internas reales a los roles correspondientes.
      </p>

      <div className="grid gap-2">
        {CLOSURE_STEPS.map(step => (
          <button
            key={step.status}
            type="button"
            disabled={busy}
            onClick={() => run("/debug/closure-fixtures", step.status, `Obra de prueba creada en ${step.label}.`)}
            className="flex items-start gap-3 rounded-control border border-border-default bg-white p-3 text-left hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>
              <span className="block text-xs font-black text-text-primary">Crear obra de prueba en «{step.label}»</span>
              <span className="block text-[11px] text-text-tertiary">La ve: {step.viewer}</span>
            </span>
          </button>
        ))}
      </div>

      <h4 className="text-[11px] font-black uppercase text-text-secondary">Obras de prueba ({fixtures.length})</h4>
      {fixtures.length === 0 && <p className="text-[11px] text-text-tertiary">Sin obras de prueba todavía.</p>}
      {fixtures.map(fixture => {
        const currentIndex = CLOSURE_STEPS.findIndex(s => s.status === fixture.status);
        return (
          <div key={fixture.projectId} className="rounded-control border border-border-default bg-white p-3">
            <p className="text-xs font-black text-text-primary">{fixture.projectId} — {fixture.title}</p>
            <p className="text-[11px] text-text-tertiary">Estado: {fixture.status}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {fixture.publicUrl && (
                <a
                  href={fixture.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-control border border-border-default px-2 py-1 text-[11px] font-bold hover:bg-slate-50"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir enlace del contratista
                </a>
              )}
              {CLOSURE_STEPS.slice(currentIndex + 1).map(step => (
                <button
                  key={step.status}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`¿Avanzar ${fixture.projectId} a «${step.label}»?`)) {
                      void run(`/debug/closure-fixtures/${fixture.projectId}/advance`, step.status, `Avanzada a ${step.label}.`);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-control border border-border-default px-2 py-1 text-[11px] font-bold hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  <ArrowRight className="h-3 w-3" /> Avanzar a {step.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
