import { useState, useEffect, createContext, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";
import type { User, Homestead } from "../types";

interface AuthState {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [homestead, setHomestead] = useState<Homestead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const session = await api.auth.session() as any;
      if (session?.user) {
        setUser(session.user);
        const hs = await api.homestead.get() as Homestead;
        setHomestead(hs);
      }
    } catch {
      // No active session
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    // React Native auth uses web session via cookie
    // Use the API directly and store session token
    await checkSession();
  }

  async function logout() {
    await AsyncStorage.removeItem("session");
    setUser(null);
    setHomestead(null);
  }

  return { user, homestead, loading, login, logout };
}
