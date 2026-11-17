"use client";

import { useUser } from "@/context/UserContext";
import { login, signup, logout } from "@/services/auth";

export function useAuth() {
  const { user, setUser, isAuthenticated } = useUser();

  async function signIn(email: string, password: string) {
    const result = await login(email, password);
    setUser(result.user);
    return result;
  }

  async function register(name: string, email: string, password: string) {
    const result = await signup(name, email, password);
    setUser(result.user);
    return result;
  }

  async function signOut() {
    try {
      await logout();
    } finally {
      setUser(null);
    }
  }

  return {
    user,
    isAuthenticated,
    signIn,
    register,
    signOut,
  };
}
