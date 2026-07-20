/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook de autenticación. Único punto que gestiona token, usuario
 * y operaciones de login/logout. El control de acceso por rol
 * vive en useRouting.
 */

import { useState, useCallback } from "react";
import { apiFetch } from "../services/api";

const STORAGE_TOKEN = "ivoo_auth_token";
const STORAGE_USER = "ivoo_auth_user";

export type AuthUser = { name: string; email: string; role?: string } | null;

export function useAuth() {
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem(STORAGE_TOKEN) ?? "");
  const [authUser, setAuthUser] = useState<AuthUser>(() => {
    const saved = localStorage.getItem(STORAGE_USER);
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ token: string; user: { name: string; email: string; role?: string } }>("/login", {
      method: "POST",
      body: JSON.stringify({ email, password, device_name: "web" }),
    });

    localStorage.setItem(STORAGE_TOKEN, data.token);
    localStorage.setItem(STORAGE_USER, JSON.stringify(data.user));
    setAuthToken(data.token);
    setAuthUser(data.user);
  }, []);

  const handleLogout = useCallback(async () => {
    if (authToken) {
      await apiFetch("/logout", { method: "POST", token: authToken }).catch(() => null);
    }

    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    setAuthToken("");
    setAuthUser(null);
  }, [authToken]);

  return {
    authToken,
    authUser,
    handleLogin,
    handleLogout,
  };
}
