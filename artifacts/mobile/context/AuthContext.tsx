import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Application from "expo-application";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  walletBalance: number;
  referralCode: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  apiRequest: (path: string, options?: RequestInit) => Promise<Response>;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  mobileNumber: string;
  referralCode?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getDeviceUuid(): string {
  const prefix = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
  return `${prefix}-${Application.applicationId ?? "app"}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  async function loadSession() {
    try {
      const savedToken = await AsyncStorage.getItem("auth_token");
      if (savedToken) {
        setToken(savedToken);
        const res = await fetch(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          await AsyncStorage.removeItem("auth_token");
        }
      }
    } catch {}
    setLoading(false);
  }

  async function apiRequest(path: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(`${BASE_URL}${path}`, { ...options, headers });
  }

  async function login(email: string, password: string): Promise<AuthUser> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Login failed");
    await AsyncStorage.setItem("auth_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user as AuthUser;
  }

  async function register(formData: RegisterData) {
    const deviceUuid = getDeviceUuid();
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, deviceUuid }),
    });
    const data = await res.json();
    if (data.error === "pending_approval") throw new Error("pending_approval");
    if (!res.ok) throw new Error(data.error ?? "Registration failed");
    await AsyncStorage.setItem("auth_token", data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    await AsyncStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    if (!token) return;
    const res = await apiRequest("/auth/me");
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, apiRequest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
