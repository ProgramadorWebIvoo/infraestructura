/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook de usuarios del sistema. Extraído de UsuariosPanel:
 * GET /users + POST /users.
 */

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../services/api";
import type { ShowToast } from "./useProjects";

export interface UserRecord {
  id: number | string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

export function useUsuarios(authToken: string, showToast: ShowToast) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await apiFetch<UserRecord[]>("/users", { token: authToken });
      setUsers(data);
    } catch (error) {
      console.error(error);
      showToast("No se pudo cargar el listado de usuarios.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, showToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
        const message = (err as Error).message || "Error al registrar el usuario.";
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
    handleCreateUser,
  };
}
