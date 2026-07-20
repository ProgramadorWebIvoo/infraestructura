/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Contractor } from "../types";
import { Building2, CheckCircle, Mail, Send, ShieldCheck, UserRound } from "lucide-react";
import { apiFetch } from "../services/api";
import { useToast } from "../components/UI/Toast";

interface RegistroProveedoresPublicoProps {
  contractorsCount: number;
  onAddContractor: (contractor: Contractor) => void;
}

export default function RegistroProveedoresPublico({
  contractorsCount,
  onAddContractor,
}: RegistroProveedoresPublicoProps) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [contact, setContact] = useState("");
  const [submittedCode, setSubmittedCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !specialty.trim() || !contact.trim()) {
      showToast("Completa todos los campos para registrar el proveedor.", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      const contractor = await apiFetch<Contractor>("/contractors", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          specialty: specialty.trim(),
          contact: contact.trim(),
          rating: 4.0,
        }),
      });

      onAddContractor(contractor);
      setSubmittedCode(contractor.code);
      setName("");
      setSpecialty("");
      setContact("");
    } catch (error) {
      console.error(error);
      showToast("No se pudo registrar el proveedor en Laravel.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans antialiased">
      <header className="border-b border-white/10 bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500 shadow-lg shadow-sky-500/20">
              <Building2 className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight">IVOO Registro de Proveedores</h1>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Portal publico</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-200 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Registro seguro
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-82px)] max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-sky-200">
            Base de datos IVOO
          </div>
          <div className="space-y-4">
            <h2 className="max-w-xl text-4xl font-black tracking-tight text-white sm:text-5xl">
              Registro publico de empresas proveedoras
            </h2>
            <p className="max-w-lg text-sm font-medium leading-6 text-slate-300">
              Complete los datos principales de su empresa para quedar disponible en el modulo interno de proveedores registrados.
            </p>
          </div>
          <div className="grid max-w-lg grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-2xl font-black text-white">{contractorsCount}</div>
              <div className="mt-1 font-semibold text-slate-400">Proveedores activos</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-2xl font-black text-white">24/7</div>
              <div className="mt-1 font-semibold text-slate-400">Recepcion digital</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-2xl shadow-slate-950/40 sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-950">Datos del proveedor</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">La evaluacion inicial se asigna automaticamente al registrar.</p>
            </div>
            <div className="rounded-xl bg-slate-100 p-2 text-slate-500">
              <UserRound className="h-5 w-5" />
            </div>
          </div>

          {submittedCode && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Registro recibido con codigo {submittedCode}.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Nombre de la empresa</label>
              <input
                id="public-provider-name"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Servicios Integrales Delta"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-semibold text-slate-800 outline-hidden transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Especialidad tecnica</label>
              <input
                id="public-provider-specialty"
                type="text"
                required
                value={specialty}
                onChange={(event) => setSpecialty(event.target.value)}
                placeholder="Ej. Electricidad, climatizacion, obra civil"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-semibold text-slate-800 outline-hidden transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Correo de contacto</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  id="public-provider-contact"
                  type="email"
                  required
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  placeholder="contacto@empresa.com"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3.5 text-sm font-semibold text-slate-800 outline-hidden transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </div>

            <button
              id="btn-public-provider-submit"
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Enviando..." : "Enviar registro"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
