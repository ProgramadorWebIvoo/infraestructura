import { useState } from "react";
import { Building2, LogIn } from "lucide-react";

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await onLogin(email, password);
    } catch (loginError) {
      console.error(loginError);
      setError("Correo o clave incorrectos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-white p-6 text-slate-900 shadow-2xl shadow-slate-950/40">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/20">
            <Building2 className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-950">IVOO Gestion</h1>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Acceso interno</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Correo</label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-semibold outline-hidden transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Clave</label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-semibold outline-hidden transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          <button
            id="btn-login-submit"
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LogIn className="h-4 w-4" />
            {isSubmitting ? "Validando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
