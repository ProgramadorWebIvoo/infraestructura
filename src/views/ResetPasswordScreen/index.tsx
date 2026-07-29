/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pantalla pública que consume el link de restablecimiento enviado por
 * correo (ver UserController::sendResetLink en el backend). Ruta:
 * /reset-password/:token?email=...
 */

import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Building2, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { apiFetch } from "../../services/api";
import { ROUTES } from "../../routes.tsx";
import BackgroundDecor from "../LoginScreen/BackgroundDecor";

export default function ResetPasswordScreen() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const canSubmit = !isSubmitting && !!token && !!email;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setError("");
    setIsSubmitting(true);
    try {
      await apiFetch("/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo restablecer la contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 px-4 font-sans">
      <BackgroundDecor />

      <div className="relative w-full max-w-md animate-slide-up rounded-2xl border border-slate-700/60 bg-white/95 p-7 text-slate-900 shadow-2xl shadow-slate-950/50 backdrop-blur-xl sm:p-8">
        <div className="mb-7 flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-white shadow-lg shadow-sky-500/25 ring-1 ring-white/20">
            <KeyRound className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-sky-600">
              <span className="font-brand">IVOO</span> <span className="text-slate-900">Gestión</span>
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Restablecer contraseña
            </p>
          </div>
        </div>

        {!token || !email ? (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
            <AlertCircle className="mt-0.5 h-[14px] w-[14px] shrink-0 stroke-[2.5]" aria-hidden="true" />
            <span>Enlace inválido o incompleto. Solicite un nuevo link de restablecimiento.</span>
          </div>
        ) : success ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
            <CheckCircle className="mt-0.5 h-[14px] w-[14px] shrink-0 stroke-[2.5]" aria-hidden="true" />
            <span>
              Contraseña actualizada correctamente.{" "}
              <a href={ROUTES.HOME} className="underline underline-offset-2">
                Ir a iniciar sesión
              </a>
              .
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="reset-password"
                className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400"
              >
                Nueva clave
              </label>
              <div className="relative">
                <input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 pr-11 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-hidden transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? "Ocultar clave" : "Mostrar clave"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Mínimo 8 caracteres, mayúscula, minúscula y número.
              </p>
            </div>

            <div>
              <label
                htmlFor="reset-password-confirmation"
                className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400"
              >
                Confirmar clave
              </label>
              <input
                id="reset-password-confirmation"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-hidden transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                <AlertCircle className="mt-0.5 h-[14px] w-[14px] shrink-0 stroke-[2.5]" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 px-5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all duration-200 hover:from-sky-600 hover:to-sky-700 hover:shadow-xl hover:shadow-sky-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Guardando...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                  Restablecer contraseña
                </>
              )}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-[11px] font-medium text-slate-400">
          IVOO Gestión de Infraestructura &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
