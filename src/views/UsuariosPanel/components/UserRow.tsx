/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fila de usuario (vista + edición inline) — extraída de UsuariosPanel.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle,
  Loader2,
  Pencil,
  RotateCcw,
  Send,
  Shield,
  Sparkles,
  UserX,
} from "lucide-react";
import StatusBadge from "../../../components/UI/StatusBadge";
import IconActionButton from "../../../components/UI/IconActionButton";
import Select from "../../../components/UI/Select";
import type { UserRecord, UpdateUserPayload } from "../../../hooks/useUsuarios";
import { itemVariants } from "../../../animations";

const editPanelVariants = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  visible: { opacity: 1, height: "auto", marginTop: 12, transition: { duration: 0.25, ease: "easeOut" as const } },
  exit: { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2, ease: "easeIn" as const } },
};

interface UserRowProps {
  user: UserRecord;
  roleOptions: { value: string; label: string }[];
  roleLabel: (value: string) => string;
  isEditing: boolean;
  isToggling: boolean;
  isSending: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (id: number | string, payload: UpdateUserPayload) => Promise<void>;
  onToggleStatus: () => void;
  onSendReset: () => void;
}

export default function UserRow({
  user,
  roleOptions,
  roleLabel,
  isEditing,
  isToggling,
  isSending,
  onStartEdit,
  onCancelEdit,
  onSave,
  onToggleStatus,
  onSendReset,
}: UserRowProps) {
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive">(user.status);
  const [editRole, setEditRole] = useState(user.role);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Resetea los campos del formulario de edición a los valores actuales
  // del usuario cada vez que se entra en modo edición.
  useEffect(() => {
    if (isEditing) {
      setEditName(user.name);
      setEditEmail(user.email);
      setEditStatus(user.status);
      setEditRole(user.role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const saveEditing = async () => {
    setIsSavingEdit(true);
    const payload: UpdateUserPayload = {};
    if (editName.trim()) payload.name = editName.trim();
    if (editEmail.trim()) payload.email = editEmail.trim();
    if (editRole) payload.role = editRole;
    payload.status = editStatus;

    try {
      await onSave(user.id, payload);
    } catch {
      // Toast already shown by hook
    } finally {
      setIsSavingEdit(false);
    }
  };

  const isInactive = user.status === "Inactive";

  return (
    <motion.li
      layout
      variants={itemVariants}
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
              <IconActionButton
                label={`Editar ${user.name}`}
                tooltip="Editar usuario"
                onClick={onStartEdit}
                tone="sky"
                icon={<Pencil className="h-3.5 w-3.5" />}
              />
              <IconActionButton
                label={isInactive ? `Activar ${user.name}` : `Desactivar ${user.name}`}
                tooltip={isInactive ? "Activar usuario" : "Desactivar usuario"}
                onClick={onToggleStatus}
                isBusy={isToggling}
                tone="amber"
                icon={isInactive ? <RotateCcw className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
              />
              <IconActionButton
                label={`Enviar restablecimiento de contraseña a ${user.name}`}
                tooltip="Enviar link de restablecimiento de contraseña"
                onClick={onSendReset}
                disabled={isInactive}
                isBusy={isSending}
                tone="indigo"
                icon={<Send className="h-3.5 w-3.5" />}
              />
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
                    <Select
                      value={editStatus}
                      onChange={(v) => setEditStatus(v as "Active" | "Inactive")}
                      options={[
                        { value: "Active", label: "Activo" },
                        { value: "Inactive", label: "Inactivo" },
                      ]}
                      size="sm"
                      className="shrink-0 w-28"
                    />
                  </div>
                </div>
              </div>

              {/* Role selector row */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-white text-indigo-600 shadow-xs border border-indigo-100">
                  <Shield className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <Select
                    value={editRole}
                    onChange={setEditRole}
                    options={roleOptions}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onCancelEdit}
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
}
