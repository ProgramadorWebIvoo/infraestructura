/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de gestión de usuarios del sistema.
 * CRUD completo: crear, editar (nombre/correo/estado), activar/desactivar,
 * y envío de link de restablecimiento de contraseña.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getErrorMessage } from "../services/logger";
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
  XCircle,
  ChevronDown,
  Pencil,
  RotateCcw,
  Send,
  UserX,
  Loader2,
  Sparkles,
  Search,
} from "lucide-react";
import StatusBadge from "../components/UI/StatusBadge";
import { useToast } from "../components/UI/Toast";
import { useUsuarios, type UserRecord, type UpdateUserPayload } from "../hooks/useUsuarios";
import { containerVariants, itemVariants } from "../animations";

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

// ── Motion variants ──────────────────────────────────────────────────────
const bannerVariants = {
  hidden: { opacity: 0, height: 0, marginBottom: 0 },
  visible: { opacity: 1, height: "auto", marginBottom: 20, transition: { duration: 0.25, ease: "easeOut" as const } },
  exit: { opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.2, ease: "easeIn" as const } },
};

const editPanelVariants = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  visible: { opacity: 1, height: "auto", marginTop: 12, transition: { duration: 0.25, ease: "easeOut" as const } },
  exit: { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2, ease: "easeIn" as const } },
};

interface UsuariosPanelProps {
  authToken: string;
}

export default function UsuariosPanel({ authToken }: UsuariosPanelProps) {
  const { showToast } = useToast();
  const {
    users, isLoading,
    handleCreateUser, handleUpdateUser,
    handleToggleUserStatus, handleSendPasswordReset,
  } = useUsuarios(authToken, showToast);

  // ── Create form state ─────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [role, setRole] = useState("INFRAESTRUCTURA");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ── Edit state ────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive">("Active");
  const [editRole, setEditRole] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // ── Per-user loading flags ────────────────────────────────────────────
  const [togglingId, setTogglingId] = useState<number | string | null>(null);
  const [sendingId, setSendingId] = useState<number | string | null>(null);

  // ── Search / filter state ─────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Inactive">("all");

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      !searchQuery.trim() ||
      u.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ── Handlers ──────────────────────────────────────────────────────────

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
      const created = await handleCreateUser({
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

  const startEditing = (user: UserRecord) => {
    setEditingId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditStatus(user.status);
    setEditRole(user.role);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = async () => {
    if (!editingId) return;
    setIsSavingEdit(true);
    const payload: UpdateUserPayload = {};
    if (editName.trim()) payload.name = editName.trim();
    if (editEmail.trim()) payload.email = editEmail.trim();
    if (editRole) payload.role = editRole;
    payload.status = editStatus;

    try {
      await handleUpdateUser(editingId, payload);
      setEditingId(null);
    } catch {
      // Toast already shown by hook
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggle = async (user: UserRecord) => {
    setTogglingId(user.id);
    try {
      await handleToggleUserStatus(user.id);
    } catch {
      // Toast already shown by hook
    } finally {
      setTogglingId(null);
    }
  };

  const handleSendReset = async (user: UserRecord) => {
    setSendingId(user.id);
    try {
      await handleSendPasswordReset(user.id);
    } catch {
      // Toast already shown by hook
    } finally {
      setSendingId(null);
    }
  };

  const roleLabel = (value: string) => ROLES.find(r => r.value === value)?.label ?? value;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* ── Panel header ────────────────────────────────────────────────── */}
      <motion.div className="flex items-center gap-3" variants={itemVariants}>
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 shadow-lg shadow-sky-500/20">
          <Users className="h-5 w-5 text-white stroke-[2.5]" />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
        </div>
        <div>
           <h1 className="text-lg font-black tracking-tight text-slate-900">Gestión de Usuarios</h1>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Registro y administración de accesos
          </p>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* ── Registration form ─────────────────────────────────────────── */}
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
                  Nombre completo
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
                  Correo electrónico
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
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"} required value={password}
                    autoComplete="new-password"
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
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
                  Confirmar contraseña
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
                  Rol / Módulo de acceso
                </label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    required value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm font-semibold text-slate-800 outline-hidden transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:shadow-sm"
                  >
                    {ROLES.map(r => (
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

        {/* ── Users list ────────────────────────────────────────────────── */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col border-l-4 border-l-indigo-400"
        >
          <div className="px-6 py-4 border-b border-slate-100 shrink-0 bg-gradient-to-r from-indigo-50/30 to-white rounded-tr-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-950">Usuarios del sistema</h3>
              <motion.span
                key={filteredUsers.length}
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="text-[10px] font-bold font-mono text-indigo-600 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 px-2.5 py-1 rounded-full shadow-xs"
              >
                {filteredUsers.length}{filteredUsers.length !== users.length ? ` / ${users.length}` : ""} {filteredUsers.length === 1 ? "usuario" : "usuarios"}
              </motion.span>
            </div>

            {/* Search + filter bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o correo..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-[11px] font-medium text-slate-700 outline-hidden transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as "all" | "Active" | "Inactive")}
                className="rounded-lg border border-slate-200 bg-white py-1.5 pl-2.5 pr-7 text-[10px] font-bold uppercase tracking-wider text-slate-600 outline-hidden transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 appearance-none"
              >
                <option value="all">Todos</option>
                <option value="Active">Activos</option>
                <option value="Inactive">Inactivos</option>
              </select>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 items-center justify-center p-10"
              >
                <div className="text-center space-y-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-8 h-8 border-[3px] border-indigo-200 border-t-indigo-500 rounded-full mx-auto"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">Cargando usuarios...</p>
                </div>
              </motion.div>
            ) : filteredUsers.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 items-center justify-center p-10 text-center"
              >
                <div className="space-y-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 mx-auto shadow-xs"
                  >
                    <Users className="h-6 w-6 text-slate-400" />
                  </motion.div>
                  <p className="text-sm font-bold text-slate-500">
                    {users.length === 0 ? "No hay usuarios registrados" : "Sin resultados"}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-[220px]">
                    {users.length === 0
                      ? "Crea el primer usuario usando el formulario de la izquierda."
                      : "Ningún usuario coincide con los filtros aplicados."}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.ul
                key="user-list"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="divide-y divide-slate-100 overflow-y-auto flex-1"
              >
                <AnimatePresence mode="popLayout">
                  {filteredUsers.map((user, index) => {
                    const isEditing = editingId === user.id;
                    const isInactive = user.status === "Inactive";
                    const isToggling = togglingId === user.id;
                    const isSending = sendingId === user.id;

                    return (
                      <motion.li
                        key={user.id}
                        layout
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
                        transition={{ type: "spring", stiffness: 300, damping: 26, mass: 0.8 }}
                        className={`px-6 py-3 transition-all duration-200 group ${
                          isEditing
                            ? "bg-gradient-to-r from-indigo-50/40 to-white shadow-inner"
                            : "hover:bg-gradient-to-r hover:from-indigo-50/30 hover:to-white"
                        } ${!isEditing && isInactive ? "border-l-2 border-l-slate-300 opacity-60" : ""}`}
                        aria-label={`Usuario ${user.name}, ${isInactive ? "inactivo" : "activo"}, rol ${roleLabel(user.role)}`}
                      >
                        {/* ── Default view ──────────────────────────────── */}
                        <AnimatePresence mode="wait">
                          {!isEditing ? (
                            <motion.div
                              key="view"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0, position: "absolute" }}
                              transition={{ duration: 0.15 }}
                              className="flex items-center gap-3"
                            >
                              {/* Avatar */}
                              <motion.div
                                whileHover={{ scale: 1.08 }}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-100 text-sky-700 text-xs font-black shadow-xs group-hover:shadow-sm group-hover:border-sky-200 transition-all duration-200"
                              >
                                {user.name?.charAt(0).toUpperCase() ?? "?"}
                              </motion.div>

                              {/* User info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-800 truncate group-hover:text-slate-900 transition-colors">
                                    {user.name}
                                  </p>

                                  {/* Status badge */}
                                  <motion.span
                                    layout
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono ${
                                      isInactive
                                        ? "bg-slate-100 text-slate-500 border border-slate-200"
                                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    }`}
                                  >
                                    <motion.span
                                      animate={isInactive ? {} : { scale: [1, 1.3, 1] }}
                                      transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        isInactive ? "bg-slate-400" : "bg-emerald-500"
                                      }`}
                                    />
                                    {isInactive ? "Inactivo" : "Activo"}
                                  </motion.span>
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium font-mono truncate">
                                  {user.email}
                                </p>
                              </div>

                              {/* Role badge (desktop) */}
                              <div className="hidden lg:flex items-center">
                                <StatusBadge code={user.role} label={roleLabel(user.role)} isRole />
                              </div>

                              {/* Actions */}
                              <motion.div
                                initial={{ opacity: 0.5 }}
                                whileHover={{ opacity: 1 }}
                                className="flex items-center gap-0.5"
                              >
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => startEditing(user)}
                                  title="Editar usuario"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors duration-200 cursor-pointer"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </motion.button>

                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleToggle(user)}
                                  disabled={isToggling}
                                  title={isInactive ? "Activar usuario" : "Desactivar usuario"}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors duration-200 disabled:opacity-50 cursor-pointer"
                                >
                                  {isToggling ? (
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                                    >
                                      <Loader2 className="h-3.5 w-3.5" />
                                    </motion.div>
                                  ) : isInactive ? (
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  ) : (
                                    <UserX className="h-3.5 w-3.5" />
                                  )}
                                </motion.button>

                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleSendReset(user)}
                                  disabled={isSending || isInactive}
                                  title="Enviar link de restablecimiento de contraseña"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  {isSending ? (
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                                    >
                                      <Loader2 className="h-3.5 w-3.5" />
                                    </motion.div>
                                  ) : (
                                    <Send className="h-3.5 w-3.5" />
                                  )}
                                </motion.button>
                              </motion.div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>

                        {/* ── Inline edit panel ──────────────────────────── */}
                        <AnimatePresence initial={false}>
                          {isEditing && (
                            <motion.div
                              key="edit"
                              variants={editPanelVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              layout
                              className="overflow-hidden"
                            >
                              <div className="space-y-3 pt-1">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-xs font-black shadow-sm">
                                    <Sparkles className="h-3.5 w-3.5" />
                                  </div>
                                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input
                                      type="text" value={editName}
                                      onChange={e => setEditName(e.target.value)}
                                      placeholder="Nombre completo"
                                      autoFocus
                                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-hidden transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                    />
                                    <div className="flex gap-2">
                                      <input
                                        type="email" value={editEmail}
                                        onChange={e => setEditEmail(e.target.value)}
                                        placeholder="Correo electrónico"
                                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-hidden transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                      />
                                      <select
                                        value={editStatus}
                                        onChange={e => setEditStatus(e.target.value as "Active" | "Inactive")}
                                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider outline-hidden transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                      >
                                        <option value="Active">Activo</option>
                                        <option value="Inactive">Inactivo</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>

                                {/* Role selector row */}
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-white text-indigo-600 shadow-xs border border-indigo-100">
                                    <Shield className="h-3.5 w-3.5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <select
                                      value={editRole}
                                      onChange={e => setEditRole(e.target.value)}
                                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-hidden transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 appearance-none"
                                    >
                                      {ROLES.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                  <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={cancelEditing}
                                    disabled={isSavingEdit}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[10px] font-bold text-slate-500 transition-all duration-200 hover:bg-slate-50 hover:shadow-xs disabled:opacity-50 cursor-pointer"
                                  >
                                    Cancelar
                                  </motion.button>
                                  <motion.button
                                    whileHover={isSavingEdit || !editName.trim() || !editEmail.trim() ? {} : { scale: 1.03 }}
                                    whileTap={isSavingEdit || !editName.trim() || !editEmail.trim() ? {} : { scale: 0.97 }}
                                    onClick={saveEditing}
                                    disabled={isSavingEdit || !editName.trim() || !editEmail.trim()}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-sky-500 px-3.5 py-2 text-[10px] font-bold text-white shadow-xs transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
                                  >
                                    {isSavingEdit ? (
                                      <><Loader2 className="h-3 w-3 animate-spin" /> Guardando...</>
                                    ) : (
                                      <><CheckCircle className="h-3 w-3" /> Guardar</>
                                    )}
                                  </motion.button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
