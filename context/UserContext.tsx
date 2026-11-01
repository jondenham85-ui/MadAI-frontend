"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser } from "@/services/auth";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
};

type UserContextValue = {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  isAuthenticated: boolean;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser ?? null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const isAuthenticated = !!user;

  return (
    <UserContext.Provider value={{ user, setUser, loading, isAuthenticated }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used inside UserProvider");
  }

  return context;
}
