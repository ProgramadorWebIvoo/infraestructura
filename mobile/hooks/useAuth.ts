import { useState } from "react";
import { API_BASE_URL } from "../config";

export function useAuth() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error("Credenciales inválidas");
    }

    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    if (token) {
      await fetch(`${API_BASE_URL}/logout`, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      }).catch(() => null);
    }
    setToken("");
    setUser(null);
  };

  return { token, user, login, logout };
}
