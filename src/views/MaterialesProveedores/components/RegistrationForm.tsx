/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Formulario de registro público de proveedores — extraído de
 * MaterialesProveedores. Rediseño premium: entrada con stagger propio,
 * confirmación de éxito con spring (icono + mensaje) en vez del hack de
 * max-h/overflow-hidden, y feedback de foco/hover consistente con el resto
 * de la app.
 */

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Contractor } from "../../../types";
import { CheckCircle2, Loader2, Mail, Send, UserRound } from "lucide-react";
import { apiFetch } from "../../../services/api";
import { getErrorMessage } from "../../../services/logger";
import { useToast } from "../../../components/UI/Toast";
import { RequiredMark } from "../../../components/UI/HintSignals";
import { isValidEmail, joinRif, RIF_TYPES, type RifType } from "../../../utils/validators";
import { containerVariants, itemVariants, springs } from "../../../animations";

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
  // El usuario solo elige la letra (selector) y tipea los 9 dígitos — nunca
  // guiones. rif = joinRif(rifType, rifDigits) es lo que se envía al backend.
  const [rifType, setRifType] = useState<RifType>("J");
  const [rifDigits, setRifDigits] = useState("");
  const rif = joinRif(rifType, rifDigits);
  const [specialty, setSpecialty] = useState("");
  const [contact, setContact] = useState("");
  const [submittedCode, setSubmittedCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de validación por campo (para feedback visual)
  const [touched, setTouched] = useState({ name: false, rif: false, specialty: false, contact: false });
  const nameError = touched.name && !sanitize(name);
  const rifError = touched.rif && rifDigits.length !== 9;
  const specialtyError = touched.specialty && !sanitize(specialty);
  const contactError = touched.contact && !isValidEmail(sanitize(contact));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const cleanName = sanitize(name);
    const cleanSpecialty = sanitize(specialty);
    const cleanContact = sanitize(contact);

    if (!cleanName || rifDigits.length !== 9 || !cleanSpecialty || !cleanContact) {
      showToast("Completa todos los campos para registrar el proveedor.", "warning");
      setTouched({ name: true, rif: true, specialty: true, contact: true });
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
          rif,
          specialty: cleanSpecialty,
          email: cleanContact,
          // rating: no se envía desde el portal público; el backend asigna valor por defecto
        }),
      });

      onAddContractor(contractor);
      setSubmittedCode(contractor.code);
      setName("");
      setRifType("J");
      setRifDigits("");
      setSpecialty("");
      setContact("");
      setTouched({ name: false, rif: false, specialty: false, contact: false });
    } catch (err) {
      showToast(getErrorMessage(err, "No se pudo registrar el proveedor en este momento. Intenta nuevamente."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-2xl shadow-slate-950/40 sm:p-6"
    >
      <motion.div variants={itemVariants} className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h3 className="text-lg font-black tracking-tight text-slate-950">Datos del proveedor</h3>
          <p className="mt-1 text-xs font-medium text-slate-500">La evaluación inicial se asigna automáticamente al registrar.</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-2 text-slate-500">
          <UserRound className="h-5 w-5" />
        </div>
      </motion.div>

      <AnimatePresence initial={false}>
        {submittedCode && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...springs.snappy, delay: 0.1 }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
              >
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
              </motion.span>
              Registro recibido con código <span className="font-mono font-black">{submittedCode}</span>.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* noValidate: la validación nativa del navegador (atributo `required`,
          `type="email"`) muestra sus mensajes en el idioma del NAVEGADOR, no
          de la página (el `lang="es"` del documento no la afecta) — con un
          navegador en inglés, el usuario veía "Please fill out this field"
          en vez de nuestros mensajes en español. La validación real ya la
          hace handleSubmit con toasts en español; `required`/`aria-required`
          se conservan solo por semántica de accesibilidad. */}
      <motion.form variants={itemVariants} onSubmit={handleSubmit} noValidate className="space-y-4">
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
            htmlFor="public-provider-rif-digits"
            className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500"
          >
            RIF <RequiredMark filled={rifDigits.length === 9} />
          </label>
          <div className="flex gap-2">
            <select
              id="public-provider-rif-type"
              value={rifType}
              onChange={(event) => setRifType(event.target.value as RifType)}
              aria-label="Tipo de RIF"
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-3 text-sm font-bold text-slate-800 outline-hidden focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              {RIF_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              id="public-provider-rif-digits"
              type="text"
              inputMode="numeric"
              required
              maxLength={9}
              value={rifDigits}
              onChange={(event) => setRifDigits(event.target.value.replace(/\D/g, "").slice(0, 9))}
              onBlur={() => setTouched((prev) => ({ ...prev, rif: true }))}
              placeholder="123456789"
              aria-required="true"
              aria-invalid={rifError || undefined}
              aria-describedby={rifError ? "public-provider-rif-error" : undefined}
              className={`w-full rounded-xl border bg-white px-3.5 py-3 font-mono text-sm font-semibold text-slate-800 outline-hidden transition-all duration-200 placeholder:text-slate-300 focus:ring-2 focus:ring-sky-100 ${
                rifError
                  ? "border-rose-300 focus:border-rose-400"
                  : "border-slate-200 focus:border-sky-400"
              }`}
            />
          </div>
          {rifError && (
            <p id="public-provider-rif-error" className="mt-1 text-[11px] font-medium text-rose-500" role="alert">
              El RIF debe tener 9 dígitos.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="public-provider-specialty"
            className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500"
          >
            Especialidad técnica <RequiredMark filled={specialty.trim().length > 0} />
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
            placeholder="Ej. Electricidad, climatización, obra civil"
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
              La especialidad técnica es obligatoria.
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
            <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
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
              Ingresa un correo electrónico válido.
            </p>
          )}
        </div>

        <motion.button
          id="btn-public-provider-submit"
          type="submit"
          disabled={isSubmitting}
          whileHover={!isSubmitting ? { scale: 1.012, y: -1 } : undefined}
          whileTap={!isSubmitting ? { scale: 0.985 } : undefined}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-500/20 transition-shadow duration-200 hover:shadow-xl hover:shadow-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isSubmitting ? "Enviando..." : "Enviar registro"}
        </motion.button>
      </motion.form>
    </motion.section>
  );
}
