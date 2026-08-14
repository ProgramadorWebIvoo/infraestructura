/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Formulario de alta de usuario — extraído de UsuariosPanel.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  UserPlus,
  Mail,
  Lock,
  User,
  Shield,
  CheckCircle,
  Eye,
  EyeOff,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { getErrorMessage } from "../../../services/logger";
import type { UserRecord } from "../../../hooks/useUsuarios";
import { itemVariants } from "../../../animations";
import { RequiredMark } from "../../../components/UI/HintSignals";

const bannerVariants = {
  hidden: { opacity: 0, height: 0, marginBottom: 0 },
  visible: { opacity: 1, height: "auto", marginBottom: 20, transition: { duration: 0.25, ease: "easeOut" as const } },
  exit: { opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.2, ease: "easeIn" as const } },
};

interface UserRegistrationFormProps {
  roleOptions: { value: string; label: string }[];
  onCreateUser: (payload: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: string;
  }) => Promise<UserRecord>;
}

export default function UserRegistrationForm({ roleOptions, onCreateUser }: UserRegistrationFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [role, setRole] = useState("INFRAESTRUCTURA");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (password !== passwordConfirmation) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMsg("La contraseña debe incluir mayúsculas, minúsculas y números.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await onCreateUser({
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
        role,
      });
      setSuccessMsg(`Usuario "${created.name}" registrado correctamente.`);
      setName("");
      setEmail("");
      setPassword("");
      setPasswordConfirmation("");
      setRole("INFRAESTRUCTURA");
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Error al registrar el usuario."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm border-l-4 border-l-sky-400"
    >
      <div className="p-6">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-black text-slate-950">Nuevo Usuario</h3>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
              Complete los datos para crear acceso al sistema
            </p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-sky-50 to-white text-sky-600 p-2.5 shrink-0 border border-sky-100 shadow-xs">
            <UserPlus className="h-4 w-4" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {successMsg && (
            <motion.div
              key="success-msg"
              variants={bannerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
              className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white px-4 py-3 text-xs font-bold text-emerald-800 shadow-xs border-l-4 border-l-emerald-400"
            >
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
              {successMsg}
            </motion.div>
          )}
          {errorMsg && (
            <motion.div
              key="error-msg"
              variants={bannerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
              className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50/80 to-white px-4 py-3 text-xs font-bold text-rose-700 shadow-xs border-l-4 border-l-rose-400"
            >
              <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Nombre completo <RequiredMark />
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text" required value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Maria Rodriguez"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3.5 text-sm font-semibold text-slate-800 outline-hidden transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:shadow-sm placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Correo electrónico <RequiredMark />
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@ivoo.local"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3.5 text-sm font-semibold text-slate-800 outline-hidden transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:shadow-sm placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Contraseña <RequiredMark />
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"} required value={password}
                autoComplete="new-password"
                onChange={e => setPassword(e.target.value)}
                placeholder="Mín. 8 caracteres, mayúscula, minúscula y número"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm font-semibold text-slate-800 outline-hidden transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:shadow-sm placeholder:text-slate-400"
              />
              <button
                type="button"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Confirmar contraseña <RequiredMark />
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                id="user-password-confirm"
                type={showPassword ? "text" : "password"} required value={passwordConfirmation}
                autoComplete="new-password"
                onChange={e => setPasswordConfirmation(e.target.value)}
                placeholder="Repita la contraseña"
                aria-invalid={(password && passwordConfirmation && password !== passwordConfirmation) || undefined}
                aria-describedby={(password && passwordConfirmation && password !== passwordConfirmation) ? "user-password-confirm-error" : undefined}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3.5 text-sm font-semibold text-slate-800 outline-hidden transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:shadow-sm placeholder:text-slate-400"
              />
            </div>
            <AnimatePresence>
              {password && passwordConfirmation && password !== passwordConfirmation && (
                <motion.p
                  id="user-password-confirm-error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-rose-500"
                >
                  <XCircle className="h-3 w-3" />
                  Las contraseñas no coinciden.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Rol / Módulo de acceso <RequiredMark />
            </label>
            <div className="relative">
              <Shield className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                required value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm font-semibold text-slate-800 outline-hidden transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:shadow-sm"
              >
                {roleOptions.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <motion.button
            type="submit" disabled={isSubmitting}
            whileHover={isSubmitting ? {} : { scale: 1.01 }}
            whileTap={isSubmitting ? {} : { scale: 0.99 }}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-sky-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-sky-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md"
          >
            {isSubmitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                />
                Registrando...
              </>
            ) : (
              <><UserPlus className="h-4 w-4" /> Crear usuario</>
            )}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}
