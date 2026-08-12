/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de gestión de usuarios del sistema.
 * CRUD completo: crear, editar (nombre/correo/estado), activar/desactivar,
 * y envío de link de restablecimiento de contraseña.
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Users, Search } from "lucide-react";
import { useToast } from "../../components/UI/Toast";
import { useUsuarios, type UserRecord } from "../../hooks/useUsuarios";
import { containerVariants, itemVariants } from "../../animations";
import UserRegistrationForm from "./components/UserRegistrationForm";
import UserRow from "./components/UserRow";

// Etiquetas amigables — la lista de valores válidos viene del backend
// (GET /api/roles, fuente de verdad: UserController::VALID_ROLES) para que
// un rol nuevo no requiera tocar el frontend para aparecer en el selector.
const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Super Administrador",
  ADMIN: "Administrador",
  PRESIDENCIA: "Presidencia",
  INFRAESTRUCTURA: "Infraestructura / Mant.",
  CIERRE_DE_OBRA: "Cierre de Obra",
  PROCURA: "Procura",
  ANALISTA: "Analistas",
  FINANZAS: "Finanzas",
  CATALOGOS: "Catálogos",
};

interface UsuariosPanelProps {
  authToken: string;
}

export default function UsuariosPanel({ authToken }: UsuariosPanelProps) {
  const { showToast } = useToast();
  const {
    users, isLoading, roles,
    handleCreateUser, handleUpdateUser,
    handleToggleUserStatus, handleSendPasswordReset,
  } = useUsuarios(authToken, showToast);
  const roleOptions = roles.map((value) => ({ value, label: ROLE_LABELS[value] ?? value }));
  const roleLabel = (value: string) => ROLE_LABELS[value] ?? value;

  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [togglingId, setTogglingId] = useState<number | string | null>(null);
  const [sendingId, setSendingId] = useState<number | string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Inactive">("all");

  const filteredUsers = useMemo(() => users.filter(u => {
    const matchesSearch =
      !searchQuery.trim() ||
      u.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [users, searchQuery, statusFilter]);

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
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
        </div>
        <div>
           <h1 className="text-lg font-black tracking-tight text-slate-900">Gestión de Usuarios</h1>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Registro y administración de accesos
          </p>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <UserRegistrationForm roleOptions={roleOptions} onCreateUser={handleCreateUser} />

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
                  {filteredUsers.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      roleOptions={roleOptions}
                      roleLabel={roleLabel}
                      isEditing={editingId === user.id}
                      isToggling={togglingId === user.id}
                      isSending={sendingId === user.id}
                      onStartEdit={() => setEditingId(user.id)}
                      onCancelEdit={() => setEditingId(null)}
                      onSave={async (id, payload) => {
                        await handleUpdateUser(id, payload);
                        setEditingId(null);
                      }}
                      onToggleStatus={() => handleToggle(user)}
                      onSendReset={() => handleSendReset(user)}
                    />
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
