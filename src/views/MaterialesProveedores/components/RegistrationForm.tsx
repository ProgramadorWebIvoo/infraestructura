/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Formulario de registro público de proveedores — extraído de MaterialesProveedores.
 */

import { useState, type FormEvent } from "react";
import { Contractor } from "../../../types";
import { CheckCircle, Loader2, Mail, Send, UserRound } from "lucide-react";
import { apiFetch } from "../../../services/api";
import { useToast } from "../../../components/UI/Toast";
import { RequiredMark } from "../../../components/UI/HintSignals";
import { isValidEmail } from "../../../utils/validators";

interface RegistrationFormProps {
  onAddContractor: (contractor: Contractor) => void;
}

/**
 * Sanitiza texto de entrada: elimina etiquetas HTML, javascript: URIs,
 * event handlers (onerror=, onclick=, etc.) y llamadas a funciones JS
 * comunes (alert, prompt, confirm) para prevenir XSS.
 */
function sanitize(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")                // Etiquetas HTML/XML
    .replace(/javascript\s*:/gi, "")         // javascript: URIs
    .replace(/on\w+\s*=\s*(['"]?)[^'"\s]*\1/gi, "") // Event handlers
    .replace(/\b(alert|prompt|confirm|print|open|write)\s*\([^)]*\)/gi, "") // Llamadas JS peligrosas
    .trim();
}

const MAX_NAME_LENGTH = 120;
const MAX_SPECIALTY_LENGTH = 200;
const MAX_CONTACT_LENGTH = 254;

export default function RegistrationForm({ onAddContractor }: RegistrationFormProps) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [contact, setContact] = useState("");
  const [submittedCode, setSubmittedCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de validación por campo (para feedback visual)
  const [touched, setTouched] = useState({ name: false, specialty: false, contact: false });
  const nameError = touched.name && !sanitize(name);
  const specialtyError = touched.specialty && !sanitize(specialty);
  const contactError = touched.contact && !isValidEmail(sanitize(contact));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const cleanName = sanitize(name);
    const cleanSpecialty = sanitize(specialty);
    const cleanContact = sanitize(contact);

    if (!cleanName || !cleanSpecialty || !cleanContact) {
      showToast("Completa todos los campos para registrar el proveedor.", "warning");
      setTouched({ name: true, specialty: true, contact: true });
      return;
    }

    if (!isValidEmail(cleanContact)) {
      showToast("Ingresa un correo electrónico válido.", "warning");
      setTouched((prev) => ({ ...prev, contact: true }));
      return;
    }

    setIsSubmitting(true);

    try {
      const contractor = await apiFetch<Contractor>("/contractors", {
        method: "POST",
        body: JSON.stringify({
          name: cleanName,
          specialty: cleanSpecialty,
          email: cleanContact,
          // rating: no se envía desde el portal público; el backend asigna valor por defecto
        }),
      });

      onAddContractor(contractor);
      setSubmittedCode(contractor.code);
      setName("");
      setSpecialty("");
      setContact("");
      setTouched({ name: false, specialty: false, contact: false });
    } catch {
      showToast("No se pudo registrar el proveedor en este momento. Intenta nuevamente.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-2xl shadow-slate-950/40 motion-safe:animate-[fadeIn_0.6s_ease-out_0.15s_both] sm:p-6"
    >
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h3 className="text-lg font-black tracking-tight text-slate-950">Datos del proveedor</h3>
          <p className="mt-1 text-xs font-medium text-slate-500">La evaluacion inicial se asigna automaticamente al registrar.</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-2 text-slate-500">
          <UserRound className="h-5 w-5" />
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-500 ease-out ${
          submittedCode ? "mb-5 max-h-24 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {submittedCode && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 motion-safe:animate-[slideUp_0.4s_ease-out]">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
            Registro recibido con codigo <span className="font-mono font-black">{submittedCode}</span>.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="public-provider-name"
            className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500"
          >
            Nombre de la empresa <RequiredMark filled={name.trim().length > 0} />
          </label>
          <input
            id="public-provider-name"
            type="text"
            required
            maxLength={MAX_NAME_LENGTH}
            autoComplete="organization"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
            placeholder="Ej. Servicios Integrales Delta"
            aria-required="true"
            aria-invalid={nameError || undefined}
            aria-describedby={nameError ? "public-provider-name-error" : undefined}
            className={`w-full rounded-xl border bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-hidden transition-all duration-200 placeholder:text-slate-300 focus:ring-2 focus:ring-sky-100 ${
              nameError
                ? "border-rose-300 focus:border-rose-400"
                : "border-slate-200 focus:border-sky-400"
            }`}
          />
          {nameError && (
            <p id="public-provider-name-error" className="mt-1 text-[11px] font-medium text-rose-500" role="alert">
              El nombre de la empresa es obligatorio.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="public-provider-specialty"
            className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500"
          >
            Especialidad tecnica <RequiredMark filled={specialty.trim().length > 0} />
          </label>
          <input
            id="public-provider-specialty"
            type="text"
            required
            maxLength={MAX_SPECIALTY_LENGTH}
            autoComplete="organization-title"
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, specialty: true }))}
            placeholder="Ej. Electricidad, climatizacion, obra civil"
            aria-required="true"
            aria-invalid={specialtyError || undefined}
            aria-describedby={specialtyError ? "public-provider-specialty-error" : undefined}
            className={`w-full rounded-xl border bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-hidden transition-all duration-200 placeholder:text-slate-300 focus:ring-2 focus:ring-sky-100 ${
              specialtyError
                ? "border-rose-300 focus:border-rose-400"
                : "border-slate-200 focus:border-sky-400"
            }`}
          />
          {specialtyError && (
            <p id="public-provider-specialty-error" className="mt-1 text-[11px] font-medium text-rose-500" role="alert">
              La especialidad tecnica es obligatoria.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="public-provider-contact"
            className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500"
          >
            Correo de contacto <RequiredMark filled={isValidEmail(contact)} />
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              id="public-provider-contact"
              type="email"
              required
              maxLength={MAX_CONTACT_LENGTH}
              autoComplete="email"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, contact: true }))}
              placeholder="contacto@empresa.com"
              aria-required="true"
              aria-invalid={contactError || undefined}
              aria-describedby={contactError ? "public-provider-contact-error" : undefined}
              className={`w-full rounded-xl border bg-white py-3 pl-10 pr-3.5 text-sm font-semibold text-slate-800 outline-hidden transition-all duration-200 placeholder:text-slate-300 focus:ring-2 focus:ring-sky-100 ${
                contactError
                  ? "border-rose-300 focus:border-rose-400"
                  : "border-slate-200 focus:border-sky-400"
              }`}
            />
          </div>
          {contactError && (
            <p id="public-provider-contact-error" className="mt-1 text-[11px] font-medium text-rose-500" role="alert">
              Ingresa un correo electronico valido.
            </p>
          )}
        </div>

        <button
          id="btn-public-provider-submit"
          type="submit"
          disabled={isSubmitting}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-500/20 transition-all duration-200 hover:bg-sky-600 hover:shadow-xl hover:shadow-sky-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isSubmitting ? "Enviando..." : "Enviar registro"}
        </button>
      </form>
    </section>
  );
}
