/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook de usuarios del sistema.
 * GET /users, POST /users, PATCH /users/{id},
 * POST /users/{id}/toggle-status, POST /users/{id}/send-reset-link.
 */

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { getErrorMessage, logError } from "../services/logger";
import type { ShowToast } from "./useProjects";
import { usePolledFetch } from "./usePolledFetch";
import type { ConfigAuditLogRecord } from "./useConfigAuditLogs";

// Caché de módulo (no contexto React): único consumidor es UsuariosPanel, así
// que no hay duplicación entre componentes simultáneos — el costo real era
// refetchear /roles en cada remontaje de la vista al navegar (sin keep-alive
// de ruta). Los roles válidos son fuente de verdad del backend (CheckRole/
// UserController), fijos en código, iguales para cualquier sesión.
let cachedRoles: string[] | null = null;
let rolesInFlight: Promise<string[]> | null = null;

/** Solo para tests — el caché de módulo persiste entre montajes reales a propósito, pero contamina tests que corren en el mismo proceso. */
export function __resetRolesCacheForTests(): void {
  cachedRoles = null;
  rolesInFlight = null;
}

export interface UserRecord {
  id: number | string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
  created_at?: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: string;
  status?: "Active" | "Inactive";
}

export function useUsuarios(authToken: string, showToast: ShowToast) {
  const { data: users, setData: setUsers, isLoading, refresh: loadUsers } =
    usePolledFetch<UserRecord>({
      authToken,
      showToast,
      fetcher: useCallback(() => apiFetch<UserRecord[]>("/users"), []),
      getSignature: useCallback(
        (data: UserRecord[]) => data.map(u => [u.id, u.name, u.email, u.role, u.status].join(":")).join("|"),
        [],
      ),
      errorMessage: "No se pudo cargar el listado de usuarios.",
    });

  // Lista de roles válidos — servida por el backend (fuente de verdad de
  // CheckRole/UserController) en vez de hardcodeada en el frontend.
  const [roles, setRoles] = useState<string[]>(cachedRoles ?? []);
  useEffect(() => {
    if (!authToken || cachedRoles !== null) return;
    let cancelled = false;

    rolesInFlight ??= apiFetch<string[]>("/roles");

    rolesInFlight
      .then((data) => {
        cachedRoles = data;
        if (!cancelled) setRoles(cachedRoles);
      })
      .catch((err) => {
        if (!cancelled) logError("useUsuarios.loadRoles", err);
      })
      .finally(() => {
        rolesInFlight = null;
      });

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const handleCreateUser = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      password_confirmation: string;
      role: string;
    }): Promise<UserRecord & { auditLog?: ConfigAuditLogRecord }> => {
      try {
        const created = await apiFetch<UserRecord & { auditLog?: ConfigAuditLogRecord }>("/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setUsers(prev => [created, ...prev]);
        return created;
      } catch (err) {
        const message = getErrorMessage(err, "Error al registrar el usuario.");
        showToast(message, "error");
        throw err;
      }
    },
    [showToast],
  );

  const handleUpdateUser = useCallback(
    async (id: number | string, payload: UpdateUserPayload): Promise<UserRecord & { auditLogs?: ConfigAuditLogRecord[] }> => {
      try {
        const updated = await apiFetch<UserRecord & { auditLogs?: ConfigAuditLogRecord[] }>(`/users/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
        showToast("Usuario actualizado correctamente.", "success");
        return updated;
      } catch (err) {
        const message = getErrorMessage(err, "Error al actualizar el usuario.");
        showToast(message, "error");
        throw err;
      }
    },
    [showToast],
  );

  const handleToggleUserStatus = useCallback(
    async (id: number | string): Promise<{ status: "Active" | "Inactive"; auditLog?: ConfigAuditLogRecord }> => {
      try {
        const result = await apiFetch<{ id: number | string; status: "Active" | "Inactive"; auditLog?: ConfigAuditLogRecord }>(
          `/users/${id}/toggle-status`,
          { method: "POST" },
        );
        setUsers(prev => prev.map(u => (u.id === id ? { ...u, status: result.status } : u)));
        const label = result.status === "Active" ? "activado" : "desactivado";
        showToast(`Usuario ${label} correctamente.`, "success");
        return result;
      } catch (err) {
        const message = getErrorMessage(err, "Error al cambiar el estado del usuario.");
        showToast(message, "error");
        throw err;
      }
    },
    [showToast],
  );

  const handleSendPasswordReset = useCallback(
    async (id: number | string): Promise<void> => {
      try {
        await apiFetch<{ message: string }>(`/users/${id}/send-reset-link`, {
          method: "POST",
        });
        showToast("Link de restablecimiento enviado al correo del usuario.", "success");
      } catch (err) {
        const message = getErrorMessage(err, "Error al enviar el link.");
        showToast(message, "error");
        throw err;
      }
    },
    [showToast],
  );

  return {
    users,
    isLoading,
    loadUsers,
    roles,
    handleCreateUser,
    handleUpdateUser,
    handleToggleUserStatus,
    handleSendPasswordReset,
  };
}
