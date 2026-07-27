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
      fetcher: useCallback(() => apiFetch<UserRecord[]>("/users", { token: authToken }), [authToken]),
      getSignature: useCallback(
        (data: UserRecord[]) => data.map(u => [u.id, u.name, u.email, u.role, u.status].join(":")).join("|"),
        [],
      ),
      errorMessage: "No se pudo cargar el listado de usuarios.",
    });

  // Lista de roles válidos — servida por el backend (fuente de verdad de
  // CheckRole/UserController) en vez de hardcodeada en el frontend.
  const [roles, setRoles] = useState<string[]>([]);
  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    apiFetch<string[]>("/roles", { token: authToken })
      .then((data) => {
        if (!cancelled) setRoles(data);
      })
      .catch((err) => {
        if (!cancelled) logError("useUsuarios.loadRoles", err);
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
    }): Promise<UserRecord> => {
      try {
        const created = await apiFetch<UserRecord>("/users", {
          method: "POST",
          token: authToken,
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
    [authToken, showToast],
  );

  const handleUpdateUser = useCallback(
    async (id: number | string, payload: UpdateUserPayload): Promise<UserRecord> => {
      try {
        const updated = await apiFetch<UserRecord>(`/users/${id}`, {
          method: "PATCH",
          token: authToken,
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
    [authToken, showToast],
  );

  const handleToggleUserStatus = useCallback(
    async (id: number | string): Promise<"Active" | "Inactive"> => {
      try {
        const result = await apiFetch<{ id: number | string; status: "Active" | "Inactive" }>(
          `/users/${id}/toggle-status`,
          { method: "POST", token: authToken },
        );
        setUsers(prev => prev.map(u => (u.id === id ? { ...u, status: result.status } : u)));
        const label = result.status === "Active" ? "activado" : "desactivado";
        showToast(`Usuario ${label} correctamente.`, "success");
        return result.status;
      } catch (err) {
        const message = getErrorMessage(err, "Error al cambiar el estado del usuario.");
        showToast(message, "error");
        throw err;
      }
    },
    [authToken, showToast],
  );

  const handleSendPasswordReset = useCallback(
    async (id: number | string): Promise<void> => {
      try {
        await apiFetch<{ message: string }>(`/users/${id}/send-reset-link`, {
          method: "POST",
          token: authToken,
        });
        showToast("Link de restablecimiento enviado al correo del usuario.", "success");
      } catch (err) {
        const message = getErrorMessage(err, "Error al enviar el link.");
        showToast(message, "error");
        throw err;
      }
    },
    [authToken, showToast],
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
