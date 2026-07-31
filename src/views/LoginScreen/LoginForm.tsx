/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tarjeta de login (identidad + formulario) — extraída de LoginScreen.
 */

import { useState } from "react";
import { LogIn, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useRateLimit } from "../../hooks/useRateLimit";

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { blockTimer, isBlocked, recordAttempt, resetAttempts } = useRateLimit();

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
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = !isSubmitting && !isBlocked;

  return (
    <div className="relative w-full max-w-md animate-slide-up rounded-2xl border border-slate-700/60 bg-white/95 p-7 text-slate-900 shadow-2xl shadow-slate-950/50 backdrop-blur-xl sm:p-8">
      {/* Logo oficial y título */}
      <div className="mb-7 flex items-center gap-3.5">
        <div className="shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-300/60 shadow-lg shadow-emerald-500/15">
          <img src="/ivoo_logoo.png" alt="IVOO" className="block h-12 w-auto" />
        </div>
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
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-hidden transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 pr-11 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-hidden transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              disabled={isBlocked}
              aria-label={showPassword ? "Ocultar clave" : "Mostrar clave"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-60"
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-[14px] w-[14px] shrink-0 stroke-[2.5]" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Botón submit */}
        <button
          id="btn-login-submit"
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 px-5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all duration-200 hover:from-sky-600 hover:to-sky-700 hover:shadow-xl hover:shadow-sky-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
        >
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
        </button>
      </form>

      {/* Footer */}
      <p className="mt-6 text-center text-[11px] font-medium text-slate-400">
        IVOO Gestión de Infraestructura &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}
