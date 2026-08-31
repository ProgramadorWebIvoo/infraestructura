/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de creación / edición de proveedor — extraído de ProveedoresConfigPanel.
 */

import { Shield, UserCheck, UserCog } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import Button from "../../../components/UI/Button";
import Select from "../../../components/UI/Select";
import NumericInput from "../../../components/UI/NumericInput";
import { RequiredMark } from "../../../components/UI/HintSignals";
import FieldError, { fieldErrorClasses } from "../../../components/UI/FieldError";
import { isValidEmail, isValidPhone, joinRif, splitRif } from "../../../utils/validators";
import { STATUS_OPTIONS, type ContractorForm } from "../types";

const labelClass = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-tertiary";
const inputClass =
  "w-full rounded-control border border-border-default px-3.5 py-2.5 text-xs font-semibold text-text-secondary placeholder-text-muted outline-hidden focus:border-info-400 focus:ring-2 focus:ring-info-100";

interface ContractorFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  editingCode: string | null;
  form: ContractorForm;
  onFormChange: (form: ContractorForm) => void;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function ContractorFormModal({
  isOpen,
  mode,
  editingCode,
  form,
  onFormChange,
  isSaving,
  onClose,
  onSave,
}: ContractorFormModalProps) {
  const hasEmail = form.email.trim().length > 0;
  const hasPhone = form.phone.trim().length > 0;
  const hasAnyContact = hasEmail || hasPhone;

  const emailFormatInvalid = hasEmail && !isValidEmail(form.email);
  const phoneFormatInvalid = hasPhone && !isValidPhone(form.phone);

  // El usuario solo tipea los 9 dígitos — la "J-" es fija (todo proveedor es
  // persona jurídica). form.rif guarda el string completo ("J-12345678-9")
  // que espera el backend; se reconstruye a partir de los dígitos.
  const { digits: rifDigits } = splitRif(form.rif);
  const rifDigitsComplete = rifDigits.length === 9;
  const rifError = !rifDigitsComplete ? `Faltan ${9 - rifDigits.length} dígitos.` : undefined;

  // El error de "falta contacto" se marca en ambos campos a la vez (ninguno
  // es individualmente responsable), pero el de formato es por campo — así
  // el usuario ve exactamente cuál de los dos está mal y por qué.
  const emailError = emailFormatInvalid
    ? "Formato de email inválido (ej: nombre@dominio.com)."
    : !hasAnyContact
      ? "Completa este campo o el de Teléfono."
      : undefined;
  const phoneError = phoneFormatInvalid
    ? "Formato de teléfono inválido (mínimo 7 dígitos)."
    : !hasAnyContact
      ? "Completa este campo o el de Email."
      : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Nuevo proveedor" : "Editar proveedor"}
      badge={mode === "create" ? "Creación" : `Editando ${editingCode ?? ""}`}
      infoLine={mode === "edit" ? editingCode ?? "" : undefined}
      icon={<UserCog className="h-5 w-5" />}
      iconColor="indigo"
      maxWidth="max-w-lg"
      closeDisabled={isSaving}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            variant="primary"
            colorScheme="indigo"
            isLoading={isSaving}
            icon={<UserCheck className="h-4 w-4" />}
          >
            {isSaving ? "Guardando..." : (mode === "create" ? "Crear proveedor" : "Guardar cambios")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="contractor-name" className={labelClass}>
            Nombre / Empresa <RequiredMark filled={form.name.trim().length > 0} />
          </label>
          <input
            id="contractor-name"
            type="text"
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            maxLength={180}
            placeholder="Ej: Construcciones del Sur S.A."
            className={inputClass}
          />
        </div>

        {/* RIF — siempre obligatorio, sin excepción. Prefijo "J-" fijo (todo
            proveedor es persona jurídica): el usuario solo tipea los 9
            dígitos, joinRif() arma el string completo. */}
        <div>
          <label htmlFor="contractor-rif-digits" className={labelClass}>
            RIF <RequiredMark filled={rifDigitsComplete} />
          </label>
          <div className="flex items-stretch gap-2">
            <span className="flex shrink-0 items-center rounded-control border border-border-default bg-surface-sunken/60 px-3 font-mono text-xs font-black text-text-tertiary">
              J-
            </span>
            <input
              id="contractor-rif-digits"
              type="text"
              inputMode="numeric"
              value={rifDigits}
              onChange={(e) => onFormChange({ ...form, rif: joinRif(e.target.value) })}
              maxLength={9}
              placeholder="123456789"
              aria-invalid={!!rifError}
              aria-describedby={rifError ? "contractor-rif-error" : undefined}
              className={`${inputClass} font-mono ${fieldErrorClasses(!!rifError)}`}
            />
          </div>
          <FieldError message={rifError} />
        </div>

        {/* Specialty */}
        <div>
          <label htmlFor="contractor-specialty" className={labelClass}>
            Especialidad <RequiredMark filled={form.specialty.trim().length > 0} />
          </label>
          <input
            id="contractor-specialty"
            type="text"
            value={form.specialty}
            onChange={(e) => onFormChange({ ...form, specialty: e.target.value })}
            maxLength={180}
            placeholder="Ej: Obra civil, Instalaciones eléctricas..."
            className={inputClass}
          />
        </div>

        {/* Email + Phone — al menos uno de los dos es obligatorio */}
        <div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="contractor-email" className={labelClass}>
                Email
                {hasEmail && <RequiredMark filled={!emailFormatInvalid} />}
              </label>
              <input
                id="contractor-email"
                type="email"
                value={form.email}
                onChange={(e) => onFormChange({ ...form, email: e.target.value })}
                maxLength={180}
                placeholder="contacto@constructora.com"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "contractor-email-error" : undefined}
                className={`${inputClass} ${fieldErrorClasses(!!emailError)}`}
              />
              <FieldError message={emailError} />
            </div>
            <div>
              <label htmlFor="contractor-phone" className={labelClass}>
                Teléfono
                {hasPhone && <RequiredMark filled={!phoneFormatInvalid} />}
              </label>
              <input
                id="contractor-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
                maxLength={40}
                placeholder="+58 412-1234567"
                aria-invalid={!!phoneError}
                aria-describedby={phoneError ? "contractor-phone-error" : undefined}
                className={`${inputClass} ${fieldErrorClasses(!!phoneError)}`}
              />
              <FieldError message={phoneError} />
            </div>
          </div>
          {hasAnyContact && !emailFormatInvalid && !phoneFormatInvalid && (
            <p className="mt-1.5 text-[11px] font-medium text-text-muted">Con uno de los dos alcanza.</p>
          )}
        </div>

        {/* Rating + Status inline */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="contractor-rating" className={labelClass}>
              Rating (0.0 – 5.0)
            </label>
            <NumericInput
              id="contractor-rating"
              value={form.rating}
              onChange={(v) => onFormChange({ ...form, rating: v === "" ? "" : Math.min(5, Math.round(v * 10) / 10) })}
              placeholder="0.0"
              step="0.1"
              max={5}
              accent="warning"
              className="text-center font-black text-warning-600"
            />
          </div>
          <div>
            <label htmlFor="contractor-status" className={labelClass}>
              Estado
            </label>
            <Select
              id="contractor-status"
              value={form.status}
              onChange={(v) => onFormChange({ ...form, status: v as ContractorForm["status"] })}
              options={STATUS_OPTIONS}
              accent="info"
            />
          </div>
        </div>

        {/* Origin hint on create */}
        {mode === "create" && (
          <p className="text-[11px] font-medium text-text-muted italic">
            <Shield className="inline h-3 w-3 mr-1" />
            El proveedor se registrará con origen "Interno".
          </p>
        )}
      </div>
    </Modal>
  );
}
