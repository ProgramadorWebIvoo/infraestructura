/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Mail,
  Lock,
  User,
  Shield,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { apiFetch } from "../services/api";
import StatusBadge from "../components/UI/StatusBadge";

const ROLES = [
  { value: "SUPERADMIN", label: "Super Administrador" },
  { value: "ADMIN", label: "Administrador" },
  { value: "PRESIDENCIA", label: "Presidencia" },
  { value: "INFRAESTRUCTURA", label: "Infraestructura / Mant." },
  { value: "CIERRE_DE_OBRA", label: "Cierre de Obra" },
  { value: "PROCURA", label: "Procura" },
  { value: "ANALISTA", label: "Analistas" },
  { value: "FINANZAS", label: "Finanzas" },
];

interface UserRecord {
  id: number | string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

interface UsuariosPanelProps {
  authToken: string;
}

export default function UsuariosPanel({ authToken }: UsuariosPanelProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [role, setRole] = useState("INFRAESTRUCTURA");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch<UserRecord[]>("/users", { token: authToken });
        setUsers(data);
      } catch {
        // endpoint may not exist yet; silently ignore
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [authToken]);

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

    setIsSubmitting(true);
    try {
      const created = await apiFetch<UserRecord>("/users", {
        method: "POST",
        token: authToken,
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          password_confirmation: passwordConfirmation,
          role,
        }),
      });
      setUsers(prev => [created, ...prev]);
      setSuccessMsg(`Usuario "${created.name}" registrado correctamente.`);
      setName("");
      setEmail("");
      setPassword("");
      setPasswordConfirmation("");
      setRole("INFRAESTRUCTURA");
    } catch (err) {
      setErrorMsg((err as Error).message || "Error al registrar el usuario.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleLabel = (value: string) => ROLES.find(r => r.value === value)?.label ?? value;

  return (
    <div className="space-y-6">
      {/* Panel header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 shadow-lg shadow-sky-500/20">
          <Users className="h-5 w-5 text-white stroke-[2.5]" />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900">Gestión de Usuarios</h2>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Registro y administración de accesos
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* ── Registration form ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-slate-950">Nuevo Usuario</h3>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                Complete los datos para crear acceso al sistema
              </p>
            </div>
            <div className="rounded-xl bg-slate-100 p-2 text-slate-500 shrink-0">
              <UserPlus className="h-4 w-4" />
            </div>
          </div>

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
              <CheckCircle className="h-4 w-4 shrink-0" />
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Nombre completo
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej. Maria Rodriguez"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3.5 text-sm font-semibold text-slate-800 outline-hidden transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Correo electronico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@ivoo.local"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3.5 text-sm font-semibold text-slate-800 outline-hidden transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimo 8 caracteres"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-10 text-sm font-semibold text-slate-800 outline-hidden transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={passwordConfirmation}
                  onChange={e => setPasswordConfirmation(e.target.value)}
                  placeholder="Repita la contraseña"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3.5 text-sm font-semibold text-slate-800 outline-hidden transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              {password && passwordConfirmation && password !== passwordConfirmation && (
                <p className="mt-1.5 text-[10px] font-bold text-rose-500">Las contraseñas no coinciden.</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Rol / Modulo de acceso
              </label>
              <div className="relative">
                <Shield className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <select
                  required
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3.5 text-sm font-semibold text-slate-800 outline-hidden transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <UserPlus className="h-4 w-4" />
              {isSubmitting ? "Registrando..." : "Crear usuario"}
            </button>
          </form>
        </div>

        {/* ── Users list ── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-y-auto max-h-148">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-black text-slate-950">Usuarios del sistema</h3>
            <span className="text-[10px] font-bold font-mono text-sky-600 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-full">
              {users.length} {users.length === 1 ? "usuario" : "usuarios"}
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center p-10">
              <div className="text-center space-y-2">
                <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[11px] text-slate-400 font-medium">Cargando usuarios...</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-10 text-center">
              <div className="space-y-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 mx-auto">
                  <Users className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-xs font-semibold text-slate-500">No hay usuarios registrados</p>
                <p className="text-[11px] text-slate-400">Crea el primero usando el formulario.</p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-y-auto">
              {users.map(user => (
                <li
                  key={user.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-xs font-black">
                      {user.name?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium font-mono truncate">{user.email}</p>
                    </div>
                  </div>
                  <StatusBadge code={user.role} label={roleLabel(user.role)} isRole />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
