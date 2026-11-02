"use client";

import { useUser } from "@/context/UserContext";
import { login, signup, logout } from "@/services/auth";

export function useAuth() {
  const { user, setUser, isAuthenticated } = useUser();

  async function signIn(email: string, password: string) {
    const result = await login(email, password);

    if (result && typeof result === "object" && "success" in result && result.success === false) {
      throw new Error((result as { error?: string }).error || "Unable to sign in.");
    }

    if (result?.user) {
      setUser(result.user);
    }

    return result;
  }

  async function register(name: string, email: string, password: string) {
    const result = await signup(name, email, password);

    if (result && typeof result === "object" && "success" in result && result.success === false) {
      throw new Error((result as { error?: string }).error || "Unable to create an account.");
    }

    if (result?.user) {
      setUser(result.user);
    }

    return result;
  }

  async function signOut() {
    await logout();
    setUser(null);
  }

  return {
    user,
    isAuthenticated,
    signIn,
    register,
    signOut,
  };
}
