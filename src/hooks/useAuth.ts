import { useState, useEffect, createContext, useContext } from "react";
import { api, loadStoredToken, clearToken } from "../services/api";
import type { Homestead } from "../types";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  homestead: Homestead | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  user: null,
  homestead: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthState(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [homestead, setHomestead] = useState<Homestead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restore();
  }, []);

  async function restore() {
    try {
      const token = await loadStoredToken();
      if (!token) return;
      const hs = await api.homestead.get() as Homestead;
      // Decode user info from the token (JWT payload is base64url)
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      );
      const dbUser = await api.auth.session() as any;
      if (dbUser?.user) {
        setUser({ id: dbUser.user.id, name: dbUser.user.name, email: dbUser.user.email });
      } else {
        setUser({ id: payload.userId, name: "", email: "" });
      }
      setHomestead(hs);
    } catch {
      await clearToken();
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const data = await api.auth.mobileLogin(email, password);
    setUser({ id: data.userId, name: data.name, email: data.email });
    const hs = await api.homestead.get() as Homestead;
    setHomestead(hs);
  }

  async function logout() {
    await clearToken();
    setUser(null);
    setHomestead(null);
  }

  return { user, homestead, loading, login, logout };
}
