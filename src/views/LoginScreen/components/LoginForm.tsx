/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tarjeta de login (identidad + formulario) — extraída de LoginScreen.
 */

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { LogIn, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useRateLimit } from "../../../hooks/useRateLimit";

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const { blockTimer, isBlocked, recordAttempt, resetAttempts } = useRateLimit();
  const reduceMotion = useReducedMotion();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || isBlocked) return;

    setError("");
    setIsSubmitting(true);

    try {
      await onLogin(email, password);
      resetAttempts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado.";
      const blockSec = recordAttempt();
      if (blockSec > 0) {
        setError(`Demasiados intentos. Espere ${blockSec} segundos.`);
      } else {
        setError(message || "Correo o clave incorrectos.");
      }
      setShakeKey((k) => k + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = !isSubmitting && !isBlocked;

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 22, scale: 0.985 }}
      animate={
        reduceMotion
          ? undefined
          : { opacity: 1, y: 0, scale: 1, x: shakeKey === 0 ? 0 : [0, -7, 6, -4, 2, 0] }
      }
      transition={
        shakeKey === 0
          ? { duration: 0.65, ease: [0.16, 1, 0.3, 1] }
          : { x: { duration: 0.42, ease: "easeOut" } }
      }
      className="relative w-full max-w-md rounded-2xl border border-slate-700/60 bg-white/95 p-7 text-slate-900 shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_8px_rgba(0,0,0,0.08),0_16px_32px_-8px_rgba(2,6,23,0.35),0_32px_64px_-16px_rgba(2,6,23,0.35)] backdrop-blur-xl sm:p-8"
    >
      {/* Logo oficial y título */}
      <div className="mb-7 flex items-center gap-3.5">
        <motion.div
          className="shrink-0 overflow-hidden"
          animate={reduceMotion ? undefined : { y: [0, -2, 0] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <img src="/ivoo_logoo.svg" alt="IVOO" className="block h-12 w-auto" />
        </motion.div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">Gestión</h1>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Acceso interno
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Campo email */}
        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400"
          >
            Correo electrónico
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@ivoo.local"
            disabled={isBlocked}
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-hidden transition-all duration-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        {/* Campo password con toggle de visibilidad */}
        <div>
          <label
            htmlFor="login-password"
            className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400"
          >
            Clave
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isBlocked}
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 pr-11 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-hidden transition-all duration-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <motion.button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              disabled={isBlocked}
              aria-label={showPassword ? "Ocultar clave" : "Mostrar clave"}
              whileHover={!isBlocked && !reduceMotion ? { scale: 1.12 } : undefined}
              whileTap={!isBlocked && !reduceMotion ? { scale: 0.9 } : undefined}
              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-150 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={showPassword ? "hide" : "show"}
                  initial={reduceMotion ? undefined : { opacity: 0, rotate: -35, scale: 0.6 }}
                  animate={reduceMotion ? undefined : { opacity: 1, rotate: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, rotate: 35, scale: 0.6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="block"
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mensaje de error */}
        <AnimatePresence>
          {error && (
            <motion.div
              role="alert"
              initial={reduceMotion ? undefined : { opacity: 0, height: 0, y: -6 }}
              animate={reduceMotion ? undefined : { opacity: 1, height: "auto", y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex items-start gap-2.5 overflow-hidden rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"
            >
              <AlertCircle className="mt-0.5 h-[14px] w-[14px] shrink-0 stroke-[2.5]" aria-hidden="true" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botón submit — sheen diagonal en loop constante (no solo en
            hover) para que el CTA principal siempre tenga algo de vida,
            además del feedback existente de hover/tap. */}
        <motion.button
          id="btn-login-submit"
          type="submit"
          disabled={!canSubmit}
          whileHover={canSubmit && !reduceMotion ? { scale: 1.012, y: -1 } : undefined}
          whileTap={canSubmit && !reduceMotion ? { scale: 0.985 } : undefined}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 px-5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-shadow duration-200 hover:shadow-xl hover:shadow-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {canSubmit && !reduceMotion && (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.35)_50%,transparent_60%)] bg-[length:220%_100%]"
              animate={{ backgroundPosition: ["150% 0%", "-50% 0%"] }}
              transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
            />
          )}
          <span className="relative z-10 inline-flex items-center gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Validando...
              </>
            ) : isBlocked ? (
              <>
                <Loader2 className="h-4 w-4" aria-hidden="true" />
                Espere {blockTimer}s
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                Ingresar
              </>
            )}
          </span>
        </motion.button>
      </form>

      {/* Footer */}
      <p className="mt-6 text-center text-[11px] font-medium text-slate-400">
        IVOO Gestión de Infraestructura &copy; {new Date().getFullYear()}
      </p>
    </motion.div>
  );
}
