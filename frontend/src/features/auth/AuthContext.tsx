import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi } from "../../lib/api";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export type LoginResult =
  | { requires2FA: true; challenge_id: string; expires_in: number }
  | { requires2FA: false };

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verify2FA: (challengeId: string, code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      authApi.me().then((r) => setUser(r.data)).catch(() => localStorage.removeItem("token")).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const { data } = await authApi.login(email, password);
    if (!data.requires_2fa && data.access_token) {
      localStorage.setItem("token", data.access_token);
      const me = await authApi.me();
      setUser(me.data);
      return { requires2FA: false };
    }
    return {
      requires2FA: true,
      challenge_id: data.challenge_id!,
      expires_in: data.expires_in!,
    };
  };

  const verify2FA = async (challengeId: string, code: string) => {
    const { data } = await authApi.verify2FA(challengeId, code);
    localStorage.setItem("token", data.access_token);
    const me = await authApi.me();
    setUser(me.data);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, verify2FA, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
