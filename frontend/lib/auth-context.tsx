"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "./api";

interface User {
  id: number;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: "delivery_manager" | "product_manager" | "admin";
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      window.history.replaceState({}, "", window.location.pathname);
      api
        .get("/auth/me")
        .then((r) => setUser(r.data))
        .finally(() => setIsLoading(false));
    } else {
      const token = localStorage.getItem("access_token");
      if (token) {
        api
          .get("/auth/me")
          .then((r) => setUser(r.data))
          .catch(() => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
          })
          .finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  const setTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    api.get("/auth/me").then((r) => setUser(r.data));
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      await api.post("/auth/logout", { refresh_token: refreshToken });
    } catch {
      // ignore
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, setTokens, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
