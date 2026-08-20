/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de creación / edición de usuario — unifica el alta y la edición en
 * un solo componente, siguiendo el patrón de ContractorFormModal.
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Eye, EyeOff, Lock, Mail, Shield, User, UserCheck, UserPlus } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import Button from "../../../components/UI/Button";
import Select from "../../../components/UI/Select";
import { RequiredMark } from "../../../components/UI/HintSignals";
import FieldError, { fieldErrorClasses } from "../../../components/UI/FieldError";
import PasswordStrengthMeter, { type PasswordRequirement } from "../../../components/UI/PasswordStrengthMeter";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";
import { isValidEmail } from "../../../utils/validators";
import { STATUS_OPTIONS, type UserForm } from "../types";

const labelClass = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-tertiary";
const inputClass =
  "w-full rounded-control border border-border-default bg-surface py-2.5 pl-10 pr-3.5 text-xs font-semibold text-text-secondary placeholder-text-muted outline-hidden transition-all duration-150 focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

interface UserFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  editingName: string | null;
  form: UserForm;
  onFormChange: (form: UserForm) => void;
  roleOptions: { value: string; label: string }[];
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function UserFormModal({
  isOpen,
  mode,
  editingName,
  form,
  onFormChange,
  roleOptions,
  isSaving,
  onClose,
  onSave,
}: UserFormModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isCreate = mode === "create";

  const hasName = form.name.trim().length > 0;
  const hasEmail = form.email.trim().length > 0;
  const emailFormatInvalid = hasEmail && !isValidEmail(form.email);
  const emailError = emailFormatInvalid ? "Formato de correo inválido (ej: nombre@dominio.com)." : undefined;

  const hasPassword = form.password.length > 0;
  const passwordRequirements: PasswordRequirement[] = useMemo(
    () => [
      { label: "Mín. 8 caracteres", met: form.password.length >= 8 },
      { label: "Una mayúscula", met: /[A-Z]/.test(form.password) },
      { label: "Una minúscula", met: /[a-z]/.test(form.password) },
      { label: "Un número", met: /[0-9]/.test(form.password) },
    ],
    [form.password],
  );
  const isPasswordValid = passwordRequirements.every((r) => r.met);
  const passwordInvalid = hasPassword && !isPasswordValid;

  const passwordsMatch = form.password_confirmation.length > 0 && form.password === form.password_confirmation;
  const passwordsMismatch = form.password_confirmation.length > 0 && !passwordsMatch;
  const passwordConfirmError = passwordsMismatch ? "Las contraseñas no coinciden." : undefined;

  const canSave =
    hasName &&
    hasEmail &&
    !emailFormatInvalid &&
    !isSaving &&
    (!isCreate || (isPasswordValid && form.password === form.password_confirmation));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCreate ? "Nuevo usuario" : "Editar usuario"}
      badge={isCreate ? "Creación" : `Editando ${editingName ?? ""}`}
      infoLine={!isCreate ? editingName ?? "" : undefined}
      icon={<UserPlus className="h-5 w-5" />}
      iconColor="sky"
      maxWidth="max-w-lg"
      closeDisabled={isSaving}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={!canSave}
            variant="primary"
            colorScheme="sky"
            isLoading={isSaving}
            icon={<UserCheck className="h-4 w-4" />}
          >
            {isSaving ? "Guardando..." : isCreate ? "Crear usuario" : "Guardar cambios"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="user-name" className={labelClass}>
            Nombre completo <RequiredMark filled={hasName} />
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              id="user-name"
              type="text"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              placeholder="Ej. Maria Rodriguez"
              className={inputClass}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="user-email" className={labelClass}>
            Correo electrónico <RequiredMark filled={hasEmail} />
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) => onFormChange({ ...form, email: e.target.value })}
              placeholder="usuario@ivoo.local"
              aria-invalid={emailFormatInvalid || undefined}
              aria-describedby={emailError ? "user-email-error" : undefined}
              className={`${inputClass} ${fieldErrorClasses(emailFormatInvalid)}`}
            />
          </div>
          <FieldError message={emailError} />
        </div>

        {/* Password fields — solo en creación */}
        {isCreate && (
          <>
            <div>
              <label htmlFor="user-password" className={labelClass}>
                Contraseña <RequiredMark filled={isPasswordValid} />
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                <input
                  id="user-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => onFormChange({ ...form, password: e.target.value })}
                  placeholder="Crea una contraseña segura"
                  aria-invalid={passwordInvalid || undefined}
                  className={`${inputClass} pr-10 ${fieldErrorClasses(passwordInvalid)}`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <AnimatePresence initial={false}>
                {hasPassword && <PasswordStrengthMeter password={form.password} requirements={passwordRequirements} />}
              </AnimatePresence>
            </div>

            <div>
              <label htmlFor="user-password-confirm" className={labelClass}>
                Confirmar contraseña <RequiredMark filled={passwordsMatch} />
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                <input
                  id="user-password-confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password_confirmation}
                  onChange={(e) => onFormChange({ ...form, password_confirmation: e.target.value })}
                  placeholder="Repita la contraseña"
                  aria-invalid={passwordsMismatch || undefined}
                  aria-describedby={passwordConfirmError ? "user-password-confirm-error" : undefined}
                  className={`${inputClass} pr-10 ${fieldErrorClasses(passwordsMismatch)}`}
                />
                <AnimatePresence>
                  {passwordsMatch && (
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${SEMANTIC_COLOR_MAP.success.text600}`}
                    >
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <FieldError message={passwordConfirmError} />
            </div>
          </>
        )}

        {/* Role + Status */}
        <div className={isCreate ? "" : "grid grid-cols-2 gap-4"}>
          <div>
            <label htmlFor="user-role" className={labelClass}>
              Rol / Módulo de acceso <RequiredMark filled={form.role.trim().length > 0} />
            </label>
            <Select
              id="user-role"
              value={form.role}
              onChange={(v) => onFormChange({ ...form, role: v })}
              options={roleOptions}
              icon={<Shield />}
              accent="brand"
            />
          </div>
          {!isCreate && (
            <div>
              <label htmlFor="user-status" className={labelClass}>
                Estado
              </label>
              <Select
                id="user-status"
                value={form.status}
                onChange={(v) => onFormChange({ ...form, status: v as UserForm["status"] })}
                options={STATUS_OPTIONS}
                accent="brand"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
